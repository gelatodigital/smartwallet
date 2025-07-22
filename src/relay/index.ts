import type { Hash, Hex, SignedAuthorizationList } from "viem";

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
  apiKey?: string;
}

export interface SponsoredCallRequest extends BaseCallRequest {
  apiKey: string;
}

export interface SmartWalletCallRequest extends BaseCallRequest {
  feeToken: string;
}

export interface WaitParams {
  confirmations?: number;
  pollingInterval?: number;
}

export interface GelatoResponse {
  /// Task ID
  id: Hex;
  /// Wait for the task to be executed or submitted on chain
  wait: (e?: GelatoTaskWaitEvent, params?: WaitParams) => Promise<Hash>;
  /// Subscribe for task updates
  on(update: GelatoTaskEvent, callback: (parameter: TransactionStatusResponse) => void): () => void;
  /// Subscribe for task errors
  on(update: "error", callback: (parameter: Error) => void): () => void;
}
