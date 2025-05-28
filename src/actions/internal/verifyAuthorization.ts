import type { Chain, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import type { GelatoWalletClient } from "../index.js";

export async function verifyAuthorization<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>) {
  if (client._internal.authorization !== undefined) {
    return client._internal.authorization.authorized;
  }

  if (!client.account.isDeployed) {
    throw new Error("Account is not supported");
  }

  return await client.account.isDeployed();
}
