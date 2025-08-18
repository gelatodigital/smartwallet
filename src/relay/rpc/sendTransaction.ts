import type { Hex } from "viem";

import { api } from "../../constants/index.js";
import type { GelatoResponse } from "../index.js";
import { track } from "../status/index.js";
import type {
  WalletSendTransactionParams,
  WalletSendTransactionResponse
} from "./interfaces/index.js";
import { serializeAuthorizationList } from "./utils/serialize.js";

export const walletSendTransaction = async (
  params: WalletSendTransactionParams
): Promise<GelatoResponse> => {
  const { chainId, payment, apiKey, data, to } = params;
  const authorizationList = serializeAuthorizationList(params.authorizationList);

  const capabilities = {
    payment
  };
  console.log("APIKEY of walletSendTransaction: ", apiKey);
  const url = `${api()}/smartwallet${apiKey !== undefined ? `?apiKey=${apiKey}` : ""}`;

  console.log(payment);

  const raw = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_sendTransaction",
      params: [
        {
          chainId,
          to,
          data,
          capabilities,
          authorizationList
        }
      ]
    })
  });

  const response = await raw.json();

  if (response.error || response.message)
    throw new Error(response.error?.message || response.message || "walletSendTransaction failed");

  const { id } = response.result as WalletSendTransactionResponse;

  return track(id as Hex);
};
