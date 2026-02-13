console.warn(
  "[@gelatonetwork/smartwallet] DEPRECATED: This package is deprecated. " +
  "Please migrate to @gelatocloud/gasless. " +
  "See https://github.com/gelatodigital/gasless"
);

import type { Account, Chain, PublicActions, PublicClient, Transport, WalletClient } from "viem";
import { publicActions } from "viem";
import { type PublicActionsL2, publicActionsL2 } from "viem/op-stack";

import type { CustomSmartAccountParameters } from "./accounts/custom/index.js";
import type { GelatoSmartAccount, GelatoSmartAccountSCW } from "./accounts/index.js";
import type { GelatoWalletClient } from "./actions/index.js";
import { actions, type GelatoSmartWalletActions, internal, merge } from "./actions/index.js";
import { transformIntoGelatoSmartAccount } from "./utils/index.js";

export type GelatoSmartWalletParams = {
  apiKey?: string;
  scw?: GelatoSmartAccountSCW & Partial<Omit<CustomSmartAccountParameters, "scw">>;
};

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
  params?: GelatoSmartWalletParams
): Promise<GelatoSmartWalletClient<transport, chain, GelatoSmartAccount>> => {
  const publicClient = client.extend(publicActions).extend(publicActionsL2());
  const account = await transformIntoGelatoSmartAccount(
    publicClient as unknown as PublicClient,
    params
  );
  const baseClient = Object.assign(
    Object.assign(publicClient, { account }),
    internal({
      apiKey: params?.apiKey,
      innerSwitchChain: client.switchChain,
      networkCapabilities: undefined
    })
  ) as unknown as GelatoWalletClient<transport, chain, GelatoSmartAccount>;

  return merge(baseClient, actions(baseClient)) as GelatoSmartWalletClient<
    transport,
    chain,
    GelatoSmartAccount
  >;
};

export * as accounts from "./accounts/index.js";
export { getQuote } from "./actions/getQuote.js";
export { sendTransaction } from "./actions/sendTransaction.js";
export { erc20, native, Payment, sponsored } from "./payment/index.js";
export type { GelatoResponse } from "./relay/index.js";
export type { TransactionStatusResponse as GelatoTaskStatus } from "./relay/status/index.js";
export { track } from "./relay/status/index.js";
export { ERC4337Encoding as WalletEncoding } from "./wallet/index.js";
