import type { Call, Chain, Client, Hex, PublicActions, Transport, WalletClient } from "viem";

import type { PublicActionsL2 } from "viem/op-stack";
import type { GelatoSmartAccount } from "../accounts/index.js";
import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type {
  NetworkCapabilities,
  Quote,
  WalletPrepareCallsResponse
} from "../relay/rpc/interfaces/index.js";
import { estimate } from "./estimate.js";
import { execute } from "./execute.js";
import { prepareCalls } from "./prepareCalls.js";
import { sendPreparedCalls } from "./sendPreparedCalls.js";
import { switchChain } from "./switchChain.js";

export type GelatoActionArgs = {
  payment: Payment;
  calls: Call[];
} & (
  | {
      nonce?: bigint;
    }
  | {
      nonceKey?: bigint;
    }
);

export type GelatoSmartWalletActions = {
  execute: (args: GelatoActionArgs) => Promise<GelatoResponse>;
  estimate: (args: GelatoActionArgs) => Promise<Quote>;
  prepareCalls: (args: GelatoActionArgs) => Promise<WalletPrepareCallsResponse>;
  sendPreparedCalls: (args: {
    preparedCalls: WalletPrepareCallsResponse;
    signature?: Hex;
  }) => Promise<GelatoResponse>;
};

export type GelatoSmartWalletInternals = {
  _internal: {
    networkCapabilities: NetworkCapabilities | undefined;
    apiKey: () => string | undefined;
    innerSwitchChain: (args: { id: number }) => Promise<void>;
  };
};

export type GelatoWalletClient<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  PublicActionsL2<chain, account> &
  GelatoSmartWalletInternals;

export function actions<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(client: GelatoWalletClient<transport, chain, account>) {
  return {
    estimate: (args: GelatoActionArgs) => estimate(client, args),
    execute: (args: GelatoActionArgs) => execute(client, args),
    prepareCalls: (args: GelatoActionArgs) => prepareCalls(client, args),
    sendPreparedCalls: (args: { preparedCalls: WalletPrepareCallsResponse; signature?: Hex }) =>
      sendPreparedCalls(client, args),
    switchChain: (args: { id: number }) => switchChain(client, args)
  };
}

export function internal({
  networkCapabilities,
  apiKey,
  innerSwitchChain
}: {
  networkCapabilities: NetworkCapabilities | undefined;
  apiKey?: string;
  innerSwitchChain: (args: { id: number }) => Promise<void>;
}): GelatoSmartWalletInternals {
  return {
    _internal: {
      apiKey: () => apiKey,
      innerSwitchChain,
      networkCapabilities
    }
  };
}

export function merge<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(client: Client<transport, chain, account>, actions: GelatoSmartWalletActions) {
  return Object.assign(client, actions);
}
