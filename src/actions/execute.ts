import type { Account, Address, Call, Chain, Hex, Transport } from "viem";

import { encodeExecuteData } from "viem/experimental/erc7821";
import { encodeHandleOpsCall } from "../erc4337/encodeHandleOpsCall.js";
import { estimateUserOpFees } from "../erc4337/estimateUserOpFees.js";
import { estimateUserOpGas } from "../erc4337/estimateUserOpGas.js";
import { getPartialUserOp } from "../erc4337/getPartialUserOp.js";
import { signUserOp } from "../erc4337/signUserOp.js";
import { type Payment, isSponsored } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type { GelatoWalletClient } from "./index.js";
import { estimateFees } from "./internal/estimateFees.js";
import { getOpData } from "./internal/getOpData.js";
import { resolvePaymentCall } from "./internal/resolvePaymentCall.js";
import { sendTransaction } from "./internal/sendTransaction.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";
import { verifyAuthorization } from "./internal/verifyAuthorization.js";

async function erc4337<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[]; callsWithMockPayment: Call[] }
): Promise<{ to: Address; data: Hex }> {
  const { payment, calls, callsWithMockPayment } = parameters;

  const partialUserOp = await getPartialUserOp(client, callsWithMockPayment);
  const estimateGas = await estimateUserOpGas(client, partialUserOp);

  const userOp = {
    ...partialUserOp,
    ...estimateGas
  };

  if (!isSponsored(payment)) {
    const { estimatedFee } = await estimateUserOpFees(client, userOp, payment);

    const transfer = await resolvePaymentCall(client, payment, estimatedFee);
    userOp.callData = encodeExecuteData({ calls: [...calls, transfer] });
  }

  userOp.signature = await signUserOp(client, userOp);

  return encodeHandleOpsCall(client, userOp);
}

async function nonErc4337<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: {
    payment: Payment;
    calls: Call[];
    callsWithMockPayment: Call[];
    nonceKey?: bigint;
  }
): Promise<{ to: Address; data: Hex }> {
  const { payment, calls, callsWithMockPayment, nonceKey } = parameters;

  if (!isSponsored(payment)) {
    const { estimatedFee } = await estimateFees(client, callsWithMockPayment, payment);
    const transfer = await resolvePaymentCall(client, payment, estimatedFee);
    calls.push(transfer);
  }

  const opData = await getOpData(client, calls, nonceKey || 0n);

  return {
    to: client.account.address,
    data: encodeExecuteData({
      calls,
      opData
    })
  };
}

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
  // if the payment is not sponsored, we need to add a payment call to the calls array
  if (!isSponsored(payment)) {
    callsWithMockPayment = [...calls, await resolvePaymentCall(client, payment, 1n, false)];
  }

  const { to, data } = client._internal.erc4337
    ? await erc4337(client, { payment, calls, callsWithMockPayment })
    : await nonErc4337(client, {
        payment,
        calls,
        callsWithMockPayment,
        nonceKey
      });

  const result = await sendTransaction(client, to, data, payment, authorizationList);

  return result;
}
