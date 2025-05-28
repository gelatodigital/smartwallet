import type { Chain, PublicActions, Transport, WalletClient } from "viem";
import { publicActions } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { type PublicActionsL2, publicActionsL2 } from "viem/op-stack";

import type { GelatoWalletClient } from "./actions/index.js";
import { type GelatoSmartWalletActions, actions, internal, merge } from "./actions/index.js";
import type { EntryPoint, Factory } from "./relay/rpc/interfaces/index.js";
import { isOpStack } from "./utils/opstack.js";
import { type Wallet, gelato } from "./wallet/index.js";

export type GelatoSmartWalletClient<
  transport extends Transport,
  chain extends Chain,
  account extends SmartAccount
> = WalletClient<transport, chain, account> &
  PublicActions<transport, chain, account> &
  PublicActionsL2<chain, account> &
  GelatoSmartWalletActions;

export const createGelatoSmartWalletClient = <
  transport extends Transport,
  chain extends Chain,
  account extends SmartAccount
>(
  client: WalletClient<transport, chain, account>,
  params?: { apiKey?: string; wallet?: Wallet; entryPoint?: EntryPoint; factory?: Factory }
) => {
  const baseClient = Object.assign(
    client.extend(publicActions).extend(publicActionsL2()),
    internal({
      wallet: params?.wallet || gelato(),
      authorization: undefined,
      entryPoint: undefined,
      factory: undefined,
      networkCapabilities: undefined,
      apiKey: params?.apiKey,
      isOpStack: isOpStack(client.chain),
      innerSwitchChain: client.switchChain
    })
  ) as GelatoWalletClient<transport, chain, account>;

  return merge(baseClient, actions(baseClient)) as GelatoSmartWalletClient<
    transport,
    chain,
    account
  >;
};

export { erc20, native, sponsored } from "./payment/index.js";
export { track } from "./relay/status/index.js";
export type { TransactionStatusResponse as GelatoTaskStatus } from "./relay/status/index.js";
export { Wallet, gelato, kernel, safe } from "./wallet/index.js";
