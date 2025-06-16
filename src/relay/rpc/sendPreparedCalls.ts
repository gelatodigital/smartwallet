import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../../accounts/index.js";
import type { GelatoWalletClient } from "../../actions/index.js";
import { api } from "../../constants/index.js";
import type { GelatoResponse } from "../index.js";
import { track } from "../status/index.js";
import type {
  WalletSendPreparedCallsParams,
  WalletSendPreparedCallsResponse
} from "./interfaces/index.js";
import { serializeAuthorizationList } from "./utils/serialize.js";

export const walletSendPreparedCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  params: WalletSendPreparedCallsParams
): Promise<GelatoResponse> => {
  const { context, signature } = params;
  const authorizationList = serializeAuthorizationList(params.authorizationList);

  const apiKey = client._internal.apiKey();
  const url = `${api.url()}/smartwallet${apiKey !== undefined ? `?apiKey=${apiKey}` : ""}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_sendPreparedCalls",
      params: [
        {
          chainId: client.chain.id,
          context,
          signature,
          authorizationList
        }
      ]
    })
  });
  const data = await response.json();

  if (data.error || data.message) {
    throw new Error(data.error?.message || data.message || "walletSendPreparedCalls failed");
  }

  const { id } = data.result as WalletSendPreparedCallsResponse;
  return track(id, client);
};
