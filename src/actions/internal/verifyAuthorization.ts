import type { Account, Chain, Transport } from "viem";

import type { GelatoWalletClient } from "../index.js";

export async function verifyAuthorization<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  if (client._internal.authorized !== undefined) {
    return client._internal.authorized;
  }

  if (!client.account.isDeployed) {
    throw new Error("Account is not supported");
  }

  const isEip7702Authorized = await client.account.isDeployed();

  client._internal.authorized = isEip7702Authorized;

  return isEip7702Authorized;
}
