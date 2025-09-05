import type { Chain, Client, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import { toValidatorRpc } from "../../accounts/gelato/index.js";
import { api } from "../../constants/index.js";
import type {
  Capabilities,
  CustomCapabilities,
  WalletPrepareCallsParams,
  WalletPrepareCallsResponse
} from "./interfaces/index.js";
import { serializeCalls } from "./utils/serialize.js";

export const walletPrepareCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: Client<transport, chain, account>,
  params: WalletPrepareCallsParams
): Promise<WalletPrepareCallsResponse> => {
  const { payment, apiKey, scw, erc4337, validator } = params;

  const nonce = typeof params.nonce !== "undefined" ? params.nonce.toString() : undefined;
  const nonceKey = nonce ? undefined : params.nonceKey ? params.nonceKey.toString() : undefined;

  const calls = serializeCalls(params.calls);

  const isDeployed = await client.account.isDeployed();

  const capabilities: Capabilities = <CustomCapabilities>{
    authorization: client.account.authorization
      ? {
          address: client.account.authorization.address,
          authorized: isDeployed
        }
      : undefined,
    entryPoint:
      client.account.entryPoint && erc4337
        ? {
            address: client.account.entryPoint.address,
            version: client.account.entryPoint.version
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
    nonce,
    nonceKey,
    payment,
    validator: validator ? toValidatorRpc(validator) : undefined,
    wallet: scw
  };

  const url = `${api()}/smartwallet${apiKey !== undefined ? `?apiKey=${apiKey}` : ""}`;

  const raw = await fetch(url, {
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "wallet_prepareCalls",
      params: [
        {
          calls,
          capabilities,
          chainId: client.chain.id,
          from: client.account.address
        }
      ]
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletPrepareCalls failed");

  return data.result as WalletPrepareCallsResponse;
};
