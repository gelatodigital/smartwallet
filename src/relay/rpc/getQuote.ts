import { api } from "../../constants/index.js";
import type { WalletGetQuoteParams, WalletGetQuoteResponse } from "./interfaces/index.js";

export const walletGetQuote = async (
  params: WalletGetQuoteParams
): Promise<WalletGetQuoteResponse> => {
  let args = {};
  if ("gasUsed" in params) {
    args = {
      chainId: params.chainId,
      gasUsed: params.gasUsed,
      gasUsedL1: params.gasUsedL1,
      capabilities: {
        payment: params.payment
      }
    };
  } else {
    args = {
      chainId: params.chainId,
      to: params.to,
      data: params.data,
      capabilities: {
        payment: params.payment
      },
      authorizationList: params.authorizationList
    };
  }

  const raw = await fetch(`${api()}/smartwallet`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_getQuote",
      params: [args]
    })
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletGetQuote failed");

  return data.result as WalletGetQuoteResponse;
};
