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
  parameters: { payment: Payment; calls: Call[]; nonceKey?: bigint }
): Promise<GelatoResponse> {
  const { payment, calls, nonceKey } = structuredClone(parameters);

  const authorized = await verifyAuthorization(client);
  const authorizationList = authorized ? undefined : await signAuthorizationList(client);

  const callsWithMockPayment = [...calls, ...resolveMockPaymentCalls(client, payment)];

  if (client._internal.erc4337) {
    const userOp = await getPartialUserOp(client, callsWithMockPayment);

    // TODO: estimate userOp gas limits here
    if (payment.type === "erc20" || payment.type === "native") {
      const transfer = await resolvePaymentCall(client, payment, 500_000n, 0n);
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

  const opData = await getOpData(client, calls, nonceKey || 0n);

  const data = encodeExecuteData({
    calls,
    opData
  });

  return sendTransaction(client, client.account.address, data, payment, authorizationList);
}
