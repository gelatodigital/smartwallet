import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../../accounts/index.js";
import type { GelatoWalletClient } from "../../actions/index.js";
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
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  params: WalletPrepareCallsParams
): Promise<WalletPrepareCallsResponse> => {
  const { payment } = params;

  const calls = serializeCalls(params.calls);

  const isDeployed = await client.account.isDeployed();

  const capabilities: Capabilities = <GelatoCapabilities>{
    wallet: {
      type: client.account.scw.type,
      encoding: client.account.scw.encoding,
      version: client.account.scw.version
    },
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
      client.account.entryPoint && client.account.erc4337
        ? {
            version: client.account.entryPoint.version,
            address: client.account.entryPoint.address
          }
        : undefined,
    nonceKey: serializeNonceKey(params.nonceKey)
  };

  const apiKey = client._internal.apiKey();
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
