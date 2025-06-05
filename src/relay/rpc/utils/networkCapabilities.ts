import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../../../accounts/index.js";
import type { GelatoWalletClient } from "../../../actions/index.js";
import { walletGetCapabilities } from "../getCapabilities.js";

export async function initializeNetworkCapabilities<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(client: GelatoWalletClient<transport, chain, account>) {
  if (!client._internal.networkCapabilities?.[client.chain.id]) {
    const networkCapabilities = await walletGetCapabilities(client);
    client._internal.networkCapabilities = networkCapabilities;
  }

  return client._internal.networkCapabilities[client.chain.id];
}
