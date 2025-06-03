import type { Account, Chain, PublicActions, PublicClient, Transport, WalletClient } from "viem";
import { publicActions } from "viem";
import { type PublicActionsL2, publicActionsL2 } from "viem/op-stack";

import type { CustomSmartAccountParameters } from "./accounts/custom/index.js";
import type { GelatoSmartAccount } from "./accounts/index.js";
import type { GelatoSmartAccountSCW } from "./accounts/index.js";
import type { GelatoWalletClient } from "./actions/index.js";
import { type GelatoSmartWalletActions, actions, internal, merge } from "./actions/index.js";
import { transformIntoGelatoSmartAccount } from "./utils/index.js";

export type GelatoSmartWalletClient<
  transport extends Transport,
  chain extends Chain,
  account extends GelatoSmartAccount
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  PublicActionsL2<chain, account> &
  GelatoSmartWalletActions;

export const createGelatoSmartWalletClient = async <
  transport extends Transport,
  chain extends Chain,
  account extends Account
>(
  client: WalletClient<transport, chain, account>,
  params?: { apiKey?: string; scw?: GelatoSmartAccountSCW & Partial<CustomSmartAccountParameters> }
): Promise<GelatoSmartWalletClient<transport, chain, GelatoSmartAccount>> => {
  const publicClient = client.extend(publicActions).extend(publicActionsL2());
  const account = await transformIntoGelatoSmartAccount(
    publicClient as unknown as PublicClient,
    params
  );
  const baseClient = Object.assign(
    Object.assign(publicClient, { account }),
    internal({
      networkCapabilities: undefined,
      apiKey: params?.apiKey,
      innerSwitchChain: client.switchChain
    })
  ) as unknown as GelatoWalletClient<transport, chain, GelatoSmartAccount>;

  return merge(baseClient, actions(baseClient)) as GelatoSmartWalletClient<
    transport,
    chain,
    GelatoSmartAccount
  >;
};

export { erc20, native, sponsored } from "./payment/index.js";
export { track } from "./relay/status/index.js";
export * as accounts from "./accounts/index.js";
export type { TransactionStatusResponse as GelatoTaskStatus } from "./relay/status/index.js";
