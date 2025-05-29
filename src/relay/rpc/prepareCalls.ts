import type { Account, Chain, Transport } from "viem";

import type { GelatoWalletClient } from "../../actions/index.js";
import { api } from "../../constants/index.js";
import type { WalletPrepareCallsParams, WalletPrepareCallsResponse } from "./interfaces/index.js";
import { serializeCalls, serializeNonceKey } from "./utils/serialize.js";

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

  const wallet = {
    type: client._internal.wallet.type,
    encoding: client._internal.wallet.encoding,
    isViaEntryPoint: client._internal.wallet.isViaEntryPoint
  };

  const delegation = client._internal.delegation
    ? {
        address: client._internal.delegation.address,
        authorized: client._internal.delegation.authorized
      }
    : undefined;

  const factory = !client._internal.wallet.eip7702 ? client._internal.wallet.factory : undefined;
  const from = !client._internal.wallet.eip7702
    ? client._internal.wallet.address
    : client.account.address;

  console.log("wallet_prepareCalls from", from);
  console.log("wallet_prepareCalls factory", factory);
  console.log("wallet_prepareCalls delegation", delegation);

  const nonceKey = wallet.type === "gelato" ? serializeNonceKey(params.nonceKey) : undefined;

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
          from,
          calls,
          capabilities: {
            wallet,
            payment,
            delegation,
            factory,
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
