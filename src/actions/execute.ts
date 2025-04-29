import type { Account, Call, Chain, Hash, PublicActions, Transport, WalletClient } from "viem";

import { type Payment, isErc20, isNative } from "../payment/index.js";
import type { GelatoResponse } from "../relay/response.js";
import { getAuthorizationList } from "./internal/getAuthorizationList.js";
import { getOpData } from "./internal/getOpData.js";
import { resolveERC20PaymentCall } from "./internal/resolveERC20PaymentCall.js";
import { resolveNativePaymentCall } from "./internal/resolveNativePaymentCall.js";
import { sendTransaction } from "./internal/sendTransaction.js";

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
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[] }
): Promise<GelatoResponse> {
  const { payment, calls } = parameters;

  const authorizationList = await getAuthorizationList(client, payment);

  if (isErc20(payment)) {
    calls.push(await resolveERC20PaymentCall(client, payment, calls));
  } else if (isNative(payment)) {
    calls.push(await resolveNativePaymentCall(client, calls));
  }

  const opData = await getOpData(client, calls);

  // TODO: add support for passkey signers
  const signed = await client.signTypedData({
    account: client.account,
    ...opData
  });

  return await sendTransaction(client, calls, payment, authorizationList, signed);
}
