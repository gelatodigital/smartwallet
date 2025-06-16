import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../../accounts/index.js";
import type { GelatoWalletClient } from "../../actions/index.js";
import { api } from "../../constants/index.js";
import type { NetworkCapabilities, WalletGetCapabilitiesResponse } from "./interfaces/index.js";

export const walletGetCapabilities = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>
): Promise<NetworkCapabilities> => {
  const raw = await fetch(`${api.url()}/smartwallet`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_getCapabilities",
      params: [
        {
          chainIds: [client.chain.id]
        }
      ]
    })
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletGetCapabilities failed");

  const capabilities = data.result as WalletGetCapabilitiesResponse;

  return capabilities;
};
