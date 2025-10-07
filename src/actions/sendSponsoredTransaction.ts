import type { Address, Chain, Hex, SignAuthorizationReturnType, Transport } from "viem";
import type { GelatoSmartAccount } from "../accounts/index.js";
import { sponsored } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletSendTransaction } from "../relay/rpc/sendTransaction.js";
import type { GelatoWalletClient } from "./index.js";

/**
 *
 * @param parameters - Send sponsored transaction parameters.
 * @returns Send sponsored transaction.
 */
export async function sendSponsoredTransaction<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { to?: Address; data: Hex; authorizationList?: SignAuthorizationReturnType[] }
): Promise<GelatoResponse> {
  const { to, data, authorizationList } = parameters;

  return await walletSendTransaction({
    apiKey: client._internal.apiKey(),
    authorizationList,
    chainId: client.chain.id,
    data,
    payment: sponsored(),
    to: to ?? client.account.address
  });
}
