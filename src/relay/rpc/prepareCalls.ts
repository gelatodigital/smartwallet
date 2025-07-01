import type { Chain, Client, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import { api } from "../../constants/index.js";
import type {
  Capabilities,
  GelatoCapabilities,
  WalletPrepareCallsParams,
  WalletPrepareCallsResponse
} from "./interfaces/index.js";
import { serializeCalls, serializeNonceKey } from "./utils/serialize.js";

export const walletPrepareCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: Client<transport, chain, account>,
  params: WalletPrepareCallsParams
): Promise<WalletPrepareCallsResponse> => {
  const { payment, apiKey, scw, erc4337 } = params;

  const calls = serializeCalls(params.calls);

  const isDeployed = await client.account.isDeployed();

  const capabilities: Capabilities = <GelatoCapabilities>{
    wallet: scw,
    payment,
    authorization: client.account.authorization
      ? {
          address: client.account.authorization.address,
          authorized: isDeployed
        }
      : undefined,
    // Only define factory if the account is not deployed and is non 7702
    factory:
      isDeployed || client.account.authorization
        ? undefined
        : await client.account.getFactoryArgs().then(({ factory, factoryData }) => ({
            address: factory,
            data: factoryData
          })),
    entryPoint:
      client.account.entryPoint && erc4337
        ? {
            version: client.account.entryPoint.version,
            address: client.account.entryPoint.address
          }
        : undefined,
    nonceKey: serializeNonceKey(params.nonceKey)
  };

  const url = `${api()}/smartwallet${apiKey !== undefined ? `?apiKey=${apiKey}` : ""}`;

  const raw = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_prepareCalls",
      params: [
        {
          chainId: client.chain.id,
          from: client.account.address,
          calls,
          capabilities
        }
      ]
    })
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletPrepareCalls failed");

  return data.result as WalletPrepareCallsResponse;
};
