import type { Account, Call, Chain, Client, PublicActions, Transport, WalletClient } from "viem";

import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { estimate } from "./estimate.js";
import { execute } from "./execute.js";

export type GelatoSmartWalletActions = {
  execute: (args: { payment: Payment; calls: Call[] }) => Promise<GelatoResponse>;
  estimate: (args: { payment: Payment; calls: Call[] }) => Promise<{
    estimatedFee: bigint;
    estimatedGas: bigint;
  }>;
  estimateGas: (args: { payment: Payment; calls: Call[] }) => Promise<bigint>;
  estimateFee: (args: { payment: Payment; calls: Call[] }) => Promise<bigint>;
};

export type GelatoSmartWalletInternals = {
  _internal: {
    apiKey: () => string | undefined;
  };
};

export type GelatoWalletClient<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  GelatoSmartWalletInternals;

export function actions<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  return {
    execute: (args: { payment: Payment; calls: Call[] }) => execute(client, args),
    estimate: (args: { payment: Payment; calls: Call[] }) => estimate(client, args),
    estimateGas: (args: { payment: Payment; calls: Call[] }) =>
      estimate(client, args).then(({ estimatedGas }) => estimatedGas),
    estimateFee: (args: { payment: Payment; calls: Call[] }) =>
      estimate(client, args).then(({ estimatedFee }) => estimatedFee)
  };
}

export function internal(sponsorApiKey?: string): GelatoSmartWalletInternals {
  return {
    _internal: {
      apiKey: () => sponsorApiKey
    }
  };
}

export function merge<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: Client<transport, chain, account>, actions: GelatoSmartWalletActions) {
  return Object.assign(client, actions);
}
