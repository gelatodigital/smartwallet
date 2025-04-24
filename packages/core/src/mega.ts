import type { Account, Chain, PublicActions, Transport, WalletClient } from "viem";
import { publicActions } from "viem";

import { type MegaActions, actions } from "./actions/index.js";
import { DELEGATION_ADDRESSES } from "./constants/index.js";

export type MegaClient<
  transport extends Transport,
  chain extends Chain,
  account extends Account
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  MegaActions;

export const createMegaClient = <
  transport extends Transport,
  chain extends Chain,
  account extends Account
>(
  client: WalletClient<transport, chain, account>
) => {
  if (!DELEGATION_ADDRESSES[client.chain.id])
    throw new Error(`Chain not supported: ${client.chain.id}`);

  return client.extend(publicActions).extend(actions) as MegaClient<transport, chain, account>;
};
