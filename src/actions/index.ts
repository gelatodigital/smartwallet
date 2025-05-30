import type { Call, Chain, Client, Hex, PublicActions, Transport, WalletClient } from "viem";

import type { PublicActionsL2 } from "viem/op-stack";
import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type {
  NetworkCapabilities,
  Quote,
  WalletPrepareCallsResponse
} from "../relay/rpc/interfaces/index.js";

import type { GelatoSmartAccount } from "../accounts/index.js";
import { estimate } from "./estimate.js";
import { execute } from "./execute.js";
import { prepare } from "./prepare.js";
import { send } from "./send.js";
import { switchChain } from "./switchChain.js";

export type GelatoSmartWalletActions = {
  execute: (args: { payment: Payment; calls: Call[] }) => Promise<GelatoResponse>;
  estimate: (args: { payment: Payment; calls: Call[] }) => Promise<Quote>;
  prepare: (args: { payment: Payment; calls: Call[] }) => Promise<WalletPrepareCallsResponse>;
  send: (args: {
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
    execute: (args: { payment: Payment; calls: Call[] }) => execute(client, args),
    estimate: (args: { payment: Payment; calls: Call[] }) => estimate(client, args),
    prepare: (args: { payment: Payment; calls: Call[] }) => prepare(client, args),
    send: (args: { preparedCalls: WalletPrepareCallsResponse; signature?: Hex }) =>
      send(client, args),
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
      networkCapabilities,
      apiKey: () => apiKey,
      innerSwitchChain
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
