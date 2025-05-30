import type { Account, Address, Chain, Transport } from "viem";
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

export interface Delegation {
  address: Address;
  authorized: boolean;
}

export interface Gelato {
  readonly type: WalletType.Gelato;
  readonly encoding: WalletEncoding.ERC7821;
  readonly isViaEntryPoint: boolean;
  readonly eip7702: boolean;
}

export interface Kernel {
  readonly type: WalletType.Kernel;
  readonly encoding: WalletEncoding.ERC7821;
  readonly isViaEntryPoint: boolean;
  readonly eip7702: boolean;
}

export interface Safe {
  readonly type: WalletType.Safe;
  readonly encoding: WalletEncoding.Safe;
  readonly isViaEntryPoint: boolean;
  readonly eip7702: boolean;
}

export type Wallet = Gelato | Kernel | Safe;

export const kernel = ({
  isViaEntryPoint = true,
  eip7702 = true
}: { isViaEntryPoint?: boolean; eip7702?: boolean } = {}): Kernel => ({
  type: WalletType.Kernel,
  encoding: WalletEncoding.ERC7821,
  isViaEntryPoint,
  eip7702
});

export const safe = ({
  isViaEntryPoint = true,
  eip7702 = true
}: { isViaEntryPoint?: boolean; eip7702?: boolean } = {}): Safe => ({
  type: WalletType.Safe,
  encoding: WalletEncoding.Safe,
  isViaEntryPoint,
  eip7702
});

export const gelato = (): Gelato => ({
  type: WalletType.Gelato,
  encoding: WalletEncoding.ERC7821,
  isViaEntryPoint: false,
  eip7702: true
});

export function isEIP7702<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  return client._internal.wallet.eip7702;
}

export function isViaEntryPoint<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  return client._internal.wallet.isViaEntryPoint;
}

export function isERC7821<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  return client._internal.wallet.encoding === WalletEncoding.ERC7821;
}
