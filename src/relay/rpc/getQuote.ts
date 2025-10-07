import { api } from "../../constants/index.js";
import type { WalletGetQuoteParams, WalletGetQuoteResponse } from "./interfaces/index.js";

export const walletGetQuote = async (
  params: WalletGetQuoteParams
): Promise<WalletGetQuoteResponse> => {
  let args = {};
  if ("gasUsed" in params) {
    args = {
      capabilities: {
        payment: params.payment
      },
      chainId: params.chainId,
      gasUsed: params.gasUsed,
      gasUsedL1: params.gasUsedL1
    };
  } else {
    args = {
      authorizationList: params.authorizationList,
      capabilities: {
        payment: params.payment
      },
      chainId: params.chainId,
      data: params.data,
      to: params.to
    };
  }

  const raw = await fetch(`${api()}/smartwallet`, {
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "wallet_getQuote",
      params: [args]
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletGetQuote failed");

  return data.result as WalletGetQuoteResponse;
};
