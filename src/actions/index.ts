import type {
  Account,
  Address,
  Call,
  Chain,
  Client,
  Hex,
  PrivateKeyAccount,
  PublicActions,
  Transport,
  WalletClient
} from "viem";

import { privateKeyToAccount } from "viem/accounts";
import type { PublicActionsL2 } from "viem/op-stack";
import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { estimate } from "./estimate.js";
import { execute } from "./execute.js";

export type GelatoSmartWalletActions = {
  execute: (args: { payment: Payment; calls: Call[] }) => Promise<GelatoResponse>;
  estimate: (args: { payment: Payment; calls: Call[] }) => Promise<{
    estimatedFee: bigint;
    estimatedGas: bigint;
    estimatedL1Gas: bigint;
  }>;
};

export type GelatoSmartWalletInternals = {
  _internal: {
    erc4337: boolean;
    delegation: Address;
    authorized: boolean | undefined;
    apiKey: () => string | undefined;
    isOpStack: () => boolean;
    inflight?: {
      mockOpData?: undefined | Hex;
    };
    mock: {
      signer: PrivateKeyAccount;
    };
  };
};

export type GelatoWalletClient<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  PublicActionsL2<chain, account> &
  GelatoSmartWalletInternals;

export function actions<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  return {
    execute: (args: { payment: Payment; calls: Call[] }) => execute(client, args),
    estimate: (args: { payment: Payment; calls: Call[] }) => estimate(client, args)
  };
}

export function internal({
  erc4337,
  delegation,
  apiKey,
  isOpStack
}: {
  erc4337: boolean;
  delegation: Address;
  apiKey?: string;
  isOpStack: boolean;
}): GelatoSmartWalletInternals {
  return {
    _internal: {
      mock: {
        signer: privateKeyToAccount(
          "0x1111111111111111111111111111111111111111111111111111111111111111"
        )
      },
      erc4337,
      delegation,
      authorized: undefined,
      apiKey: () => apiKey,
      isOpStack: () => isOpStack
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
