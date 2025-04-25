import type { Account, Call, Chain, Hash, PublicActions, Transport, WalletClient } from "viem";

import { type Payment, isErc20, isNative } from "../payment/index.js";
import { getAuthorizationList } from "./internal/getAuthorizationList.js";
import { getOpData } from "./internal/getOpData.js";
import { sendTransaction } from "./internal/sendTransaction.js";
import { verifyAndBuildERC20PaymentCall } from "./internal/verifyAndBuildERC20PaymentCall.js";
import { verifyAndBuildNativePaymentCall } from "./internal/verifyAndBuildNativePaymentCall.js";

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
): Promise<Hash> {
  const { payment, calls } = parameters;

  const authorizationList = await getAuthorizationList(client, payment);

  if (isErc20(payment)) {
    calls.push(await verifyAndBuildERC20PaymentCall(client, payment));
  } else if (isNative(payment)) {
    calls.push(await verifyAndBuildNativePaymentCall(client));
  }

  const opData = await getOpData(client, calls);

  return await sendTransaction(client, calls, payment, authorizationList, opData);
}
