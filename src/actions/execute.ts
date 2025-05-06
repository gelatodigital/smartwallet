import type { Account, Call, Chain, Transport } from "viem";

import { encodeExecuteData } from "viem/experimental/erc7821";
import { encodeHandleOpsCall } from "../erc4337/encodeHandleOpsCall.js";
import { getPartialUserOp } from "../erc4337/getPartialUserOp.js";
import { signUserOp } from "../erc4337/signUserOp.js";
import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type { GelatoWalletClient } from "./index.js";
import { estimateGas } from "./internal/estimateGas.js";
import { getOpData } from "./internal/getOpData.js";
import { resolveMockPaymentCalls, resolvePaymentCall } from "./internal/resolvePaymentCall.js";
import { sendTransaction } from "./internal/sendTransaction.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";
import { verifyAuthorization } from "./internal/verifyAuthorization.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 */
export async function execute<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[] }
): Promise<GelatoResponse> {
  const { payment, calls } = parameters;

  const authorized = await verifyAuthorization(client);
  const authorizationList = authorized
    ? undefined
    : await signAuthorizationList(client, payment.type === "native");

  const callsWithMockPayment = [...calls, ...resolveMockPaymentCalls(client, payment)];

  if (client._internal.erc4337) {
    const userOp = await getPartialUserOp(client, callsWithMockPayment);

    // TODO: estimate userOp gas limits here
    if (payment.type === "erc20" || payment.type === "native") {
      const transfer = await resolvePaymentCall(client, payment, 100_000n, 0n);
      userOp.callData = encodeExecuteData({ calls: [...calls, transfer] });
    }

    userOp.signature = await signUserOp(client, userOp);

    const handleOps = encodeHandleOpsCall(client, userOp);

    return sendTransaction(client, handleOps.to, handleOps.data, payment, authorizationList);
  }

  if (payment.type === "erc20" || payment.type === "native") {
    const { estimatedGas, estimatedL1Gas } = await estimateGas(client, callsWithMockPayment);
    const transfer = await resolvePaymentCall(client, payment, estimatedGas, estimatedL1Gas);
    calls.push(transfer);
  }

  const opData = await client.signTypedData({
    account: client.account,
    ...(await getOpData(client, calls))
  });

  const data = encodeExecuteData({
    calls,
    opData
  });

  delete client._internal.inflight;

  return sendTransaction(client, client.account.address, data, payment, authorizationList);
}
