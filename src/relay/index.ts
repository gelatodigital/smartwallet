import type { SignedAuthorizationList } from "viem";

import { api } from "../constants/index.js";
import { on, wait } from "./actions/index.js";
import type { GelatoTaskEvent, TransactionStatusResponse } from "./status/index.js";

interface BaseCallRequest {
  chainId: number;
  target: string;
  data: string;
  gasLimit?: string;
  retries?: number;
  authorizationList?: SignedAuthorizationList;
  sponsorApiKey?: string;
}

export interface SponsoredCallRequest extends BaseCallRequest {
  sponsorApiKey: string;
}

export interface SmartWalletCallRequest extends BaseCallRequest {
  feeToken: string;
}

export interface GelatoResponse {
  id: string;
  wait: () => Promise<string>;
  on(update: GelatoTaskEvent, callback: (parameter: TransactionStatusResponse) => void): () => void;
  on(update: "error", callback: (parameter: Error) => void): () => void;
}

const callGelatoApi = async <T extends object>(
  endpoint: string,
  request: T
): Promise<GelatoResponse> => {
  if (
    "authorizationList" in request &&
    Array.isArray(request.authorizationList) &&
    request.authorizationList.length > 0
  ) {
    delete request.authorizationList[0].v;
  }

  const { taskId, message } = await fetch(`${api()}${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  }).then((raw) => raw.json());

  if (message) throw new Error(message);

  return {
    id: taskId,
    wait: () => wait(taskId),
    on: (update: GelatoTaskEvent | "error", callback) => on(taskId, { update, callback })
  };
};

export const sponsoredCall = (request: SponsoredCallRequest): Promise<GelatoResponse> =>
  callGelatoApi("/relays/v2/sponsored-call-eip7702", request);

export const smartWalletCall = (request: SmartWalletCallRequest): Promise<GelatoResponse> =>
  callGelatoApi("/relays/v2/smart-wallet-call", request);
