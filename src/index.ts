export { erc20, native, sponsored } from "./payment/index.js";
export type { TransactionStatusResponse as GelatoTaskStatus } from "./relay/status/index.js";

import type { Account, Chain, PublicActions, Transport, WalletClient } from "viem";
import { publicActions } from "viem";

import { type GelatoSmartWalletActions, actions, internal, merge } from "./actions/index.js";
import type { GelatoWalletClient } from "./actions/index.js";
import { delegation } from "./constants/index.js";

export type GelatoSmartWalletClient<
  transport extends Transport,
  chain extends Chain,
  account extends Account
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  GelatoSmartWalletActions;

export const createGelatoSmartWalletClient = <
  transport extends Transport,
  chain extends Chain,
  account extends Account
>(
  client: WalletClient<transport, chain, account>,
  sponsorApiKey?: string
) => {
  if (!delegation(client.chain.id)) throw new Error(`Chain not supported: ${client.chain.id}`);

  const baseClient = Object.assign(
    client.extend(publicActions),
    internal(sponsorApiKey)
  ) as GelatoWalletClient<transport, chain, account>;

  return merge(baseClient, actions(baseClient)) as GelatoSmartWalletClient<
    transport,
    chain,
    account
  >;
};
