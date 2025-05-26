import type { Account, Chain, Transport } from "viem";

import type { GelatoWalletClient } from "../../actions/index.js";
import { api } from "../../constants/index.js";
import {
  ContextType,
  type WalletPrepareCallsParams,
  type WalletPrepareCallsResponse
} from "./interfaces/index.js";
import { contextType, serializeCalls, serializeNonceKey } from "./utils/index.js";

export const walletPrepareCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  params: WalletPrepareCallsParams
): Promise<WalletPrepareCallsResponse> => {
  const { payment } = params;

  const calls = serializeCalls(params.calls);
  const type = contextType(client._internal.wallet);
  const nonceKey =
    type === ContextType.SmartWallet ? serializeNonceKey(params.nonceKey) : undefined;
  const delegation = {
    address: client._internal.delegation,
    authorized: params.authorized
  };

  const raw = await fetch(`${api()}/smartwallet`, {
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
          capabilities: {
            type,
            payment,
            delegation,
            nonceKey
          }
        }
      ]
    })
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletPrepareCalls failed");

  return data.result as WalletPrepareCallsResponse;
};
