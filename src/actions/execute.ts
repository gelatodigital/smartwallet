import type { Account, Call, Chain, Transport } from "viem";

import type { SignAuthorizationReturnType } from "viem/accounts";
import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { type Context, walletPrepareCalls, walletSendCalls } from "../relay/rpc/index.js";
import type { GelatoWalletClient } from "./index.js";
import { resolvePaymentCall } from "./internal/resolvePaymentCall.js";
import { sendTransaction } from "./internal/sendTransaction.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";
import { signSignatureRequest } from "./internal/signSignatureRequest.js";
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
    authorized: boolean;
    nonceKey?: bigint;
  }
): Promise<{ context: Context; signature: Hex }> {
  const { payment, calls, authorized, nonceKey } = parameters;

  const { context, signatureRequest } = await walletPrepareCalls(client, {
    calls,
    payment,
    authorized,
    nonceKey
  });

  const signature = await signSignatureRequest(client, signatureRequest);

  return { context, signature };
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

  await initializeNetworkCapabilities(client);

  if (client._internal.erc4337) {
    let callsWithMockPayment = calls;
    // if the payment is not sponsored, we need to add a payment call to the calls array
    if (!isSponsored(payment)) {
      callsWithMockPayment = [...calls, await resolvePaymentCall(client, payment, 1n, false)];
    }

    const { to, data } = await erc4337(client, { payment, calls, callsWithMockPayment });

    return await sendTransaction(client, to, data, payment, authorizationList);
  }

  const { context, signature } = await nonErc4337(client, {
    payment,
    calls,
    authorized,
    nonceKey
  });

  return await walletSendCalls(client, {
    context,
    signature,
    authorizationList
  });
}
