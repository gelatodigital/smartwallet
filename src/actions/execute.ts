import type { Account, Call, Chain, Transport } from "viem";

import { encodeExecuteData } from "viem/experimental/erc7821";
import { encodeHandleOpsCall } from "../erc4337/encodeHandleOpsCall.js";
import { estimateUserOpFees } from "../erc4337/estimateUserOpFees.js";
import { estimateUserOpGas } from "../erc4337/estimateUserOpGas.js";
import { getPartialUserOp } from "../erc4337/getPartialUserOp.js";
import { signUserOp } from "../erc4337/signUserOp.js";
import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type { GelatoWalletClient } from "./index.js";
import { estimateFees } from "./internal/estimateFees.js";
import { getOpData } from "./internal/getOpData.js";
import { resolvePaymentCall } from "./internal/resolvePaymentCall.js";
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

  let callsWithMockPayment = calls;
  if (payment.type === "erc20" || payment.type === "native")
    callsWithMockPayment = [...calls, await resolvePaymentCall(client, payment, 1n, false)];

  if (client._internal.erc4337) {
    let userOp = await getPartialUserOp(client, callsWithMockPayment);

    userOp = {
      ...userOp,
      ...(await estimateUserOpGas(client, userOp))
    };

    if (payment.type === "erc20" || payment.type === "native") {
      const { estimatedFee } = await estimateUserOpFees(client, userOp, payment);

      const transfer = await resolvePaymentCall(client, payment, estimatedFee);
      userOp.callData = encodeExecuteData({ calls: [...calls, transfer] });
    }

    userOp.signature = await signUserOp(client, userOp);

    const handleOps = encodeHandleOpsCall(client, userOp);
    return sendTransaction(client, handleOps.to, handleOps.data, payment, authorizationList);
  }

  if (payment.type === "erc20" || payment.type === "native") {
    const { estimatedFee } = await estimateFees(client, callsWithMockPayment, payment);

    const transfer = await resolvePaymentCall(client, payment, estimatedFee);
    calls.push(transfer);
  }

  const opData = await getOpData(client, calls, nonceKey || 0n);

  const data = encodeExecuteData({
    calls,
    opData
  });

  return sendTransaction(client, client.account.address, data, payment, authorizationList);
}
