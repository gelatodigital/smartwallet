import type { Chain, Transport } from "viem";
import type { GelatoSmartAccount } from "../accounts/index.js";
import { sponsored } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletSendTransaction } from "../relay/rpc/sendTransaction.js";
import type { GelatoActionArgs, GelatoWalletClient } from "./index.js";
import { signCalls } from "./signCalls.js";

/**
 *
 * @param parameters - Send sponsored calls parameters.
 * @returns Send sponsored calls.
 */
export async function sendSponsoredCalls<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: Omit<GelatoActionArgs, "payment">
): Promise<GelatoResponse> {
  if (client.account.scw.type !== "gelato") {
    throw new Error("sendSponsoredCalls: Only Gelato SCW is supported");
  }

  const { authorizationList, data } = await signCalls(client, parameters);

  return await walletSendTransaction({
    apiKey: client._internal.apiKey(),
    authorizationList,
    chainId: client.chain.id,
    data,
    payment: sponsored(),
    to: client.account.address
  });
}
