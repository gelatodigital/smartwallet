import type { Chain, Client, Hex, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import { api } from "../../constants/index.js";
import type { GelatoResponse } from "../index.js";
import { track } from "../status/index.js";
import type { WalletSendCallsParams, WalletSendCallsResponse } from "./interfaces/index.js";
import { serializeAuthorizationList } from "./utils/serialize.js";

export const walletSendCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: Client<transport, chain, account>,
  params: WalletSendCallsParams
): Promise<GelatoResponse> => {
  const { payment, apiKey, data: callData } = params;
  const authorizationList = serializeAuthorizationList(params.authorizationList);

  const capabilities = {
    payment
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
      method: "wallet_sendCalls",
      params: [
        {
          chainId: client.chain.id,
          from: client.account.address,
          data: callData,
          capabilities,
          authorizationList
        }
      ]
    })
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletSendCalls failed");

  const { id } = data.result as WalletSendCallsResponse;

  return track(id as Hex, client);
};
