import type { Account, Call, Chain, Transport } from "viem";

import { type Payment, isErc20, isNative } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type { GelatoWalletClient } from "./index.js";
import { getOpData } from "./internal/getOpData.js";
import { resolveERC20PaymentCall } from "./internal/resolveERC20PaymentCall.js";
import { resolveNativePaymentCall } from "./internal/resolveNativePaymentCall.js";
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

  const authorizationList = authorized ? [] : await signAuthorizationList(client);

  if (isErc20(payment)) {
    const { paymentCall } = await resolveERC20PaymentCall(client, payment, calls);
    calls.push(paymentCall);
  } else if (isNative(payment)) {
    const { paymentCall } = await resolveNativePaymentCall(client, calls);
    calls.push(paymentCall);
  }

  const opData = await getOpData(client, calls);

  const signed = await client.signTypedData({
    account: client.account,
    ...opData
  });

  delete client._internal.inflight;

  return await sendTransaction(client, calls, payment, authorizationList, signed);
}
