import type { Chain, SignedAuthorizationList, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { GelatoWalletClient } from "../actions/index.js";
import { api } from "../constants/index.js";
import { track } from "./status/index.js";
import type {
  GelatoTaskEvent,
  GelatoTaskWaitEvent,
  TransactionStatusResponse
} from "./status/index.js";

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
  /// Task ID
  id: string;
  /// Wait for the task to be executed or submitted on chain
  wait: (e?: GelatoTaskWaitEvent) => Promise<string>;
  /// Subscribe for task updates
  on(update: GelatoTaskEvent, callback: (parameter: TransactionStatusResponse) => void): () => void;
  /// Subscribe for task errors
  on(update: "error", callback: (parameter: Error) => void): () => void;
}

const callGelatoApi = async <
  T extends object,
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  endpoint: string,
  request: T,
  client: GelatoWalletClient<transport, chain, account>
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

  return track(taskId, client);
};

export const sponsoredCall = <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  request: SponsoredCallRequest,
  client: GelatoWalletClient<transport, chain, account>
): Promise<GelatoResponse> => callGelatoApi("/relays/v2/sponsored-call-eip7702", request, client);

export const smartWalletCall = <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  request: SmartWalletCallRequest,
  client: GelatoWalletClient<transport, chain, account>
): Promise<GelatoResponse> => callGelatoApi("/relays/v2/smart-wallet-call", request, client);
