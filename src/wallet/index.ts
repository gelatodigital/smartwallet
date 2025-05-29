import type { Chain, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import type { GelatoWalletClient } from "../actions/index.js";

export enum WalletType {
  Gelato = "gelato",
  Kernel = "kernel",
  Safe = "safe"
}

export enum WalletEncoding {
  ERC7821 = "erc7821",
  Safe = "safe"
}

export interface BaseWallet {
  readonly type: WalletType;
  readonly encoding: WalletEncoding;
  readonly version?: string;
}

export interface Gelato extends BaseWallet {
  readonly type: WalletType.Gelato;
  readonly encoding: WalletEncoding.ERC7821;
}

export interface Kernel extends BaseWallet {
  readonly type: WalletType.Kernel;
  readonly encoding: WalletEncoding.ERC7821;
}

export interface Safe extends BaseWallet {
  readonly type: WalletType.Safe;
  readonly encoding: WalletEncoding.Safe;
}

export type Wallet = Gelato | Kernel | Safe;

export const kernel = ({
  version
}: {
  version?: string;
} = {}): Kernel => ({
  type: WalletType.Kernel,
  encoding: WalletEncoding.ERC7821,
  version
});

export const safe = ({ version }: { version?: string } = {}): Safe => ({
  type: WalletType.Safe,
  encoding: WalletEncoding.Safe,
  version
});

export const gelato = (): Gelato => ({
  type: WalletType.Gelato,
  encoding: WalletEncoding.ERC7821
});

export function isViaEntryPoint<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>) {
  return client._internal.entryPoint?.address && client._internal.entryPoint?.version;
}
