export { erc20, native, sponsored } from "./payment/index.js";
export type { TransactionStatusResponse as GelatoTaskStatus } from "./relay/status/index.js";

import type { Account, Chain, PublicActions, Transport, WalletClient } from "viem";
import { publicActions } from "viem";
import { type PublicActionsL2, publicActionsL2 } from "viem/op-stack";

import { type GelatoSmartWalletActions, actions, internal, merge } from "./actions/index.js";
import type { GelatoWalletClient } from "./actions/index.js";
import { type Wallet, delegationAddress } from "./constants/index.js";
import { isOpStack } from "./utils/opstack.js";

export type GelatoSmartWalletClient<
  transport extends Transport,
  chain extends Chain,
  account extends Account
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  PublicActionsL2<chain, account> &
  GelatoSmartWalletActions;

export const createGelatoSmartWalletClient = <
  transport extends Transport,
  chain extends Chain,
  account extends Account
>(
  client: WalletClient<transport, chain, account>,
  params?: { apiKey?: string; wallet?: Wallet }
) => {
  const baseClient = Object.assign(
    client.extend(publicActions).extend(publicActionsL2()),
    internal({
      erc4337: params?.wallet === "kernel",
      delegation: delegationAddress(client.chain.id, params?.wallet || "gelato"),
      apiKey: params?.apiKey,
      isOpStack: isOpStack(client.chain)
    })
  ) as GelatoWalletClient<transport, chain, account>;

  return merge(baseClient, actions(baseClient)) as GelatoSmartWalletClient<
    transport,
    chain,
    account
  >;
};
