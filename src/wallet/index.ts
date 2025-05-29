import type { Account, Address, Chain, Hex, Transport } from "viem";
import type { GelatoWalletClient } from "../actions";

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

type OptionalEIP7702<T> =
  | (T & { readonly eip7702: true; readonly factory?: never })
  | (T & {
      readonly eip7702: false;
      readonly address: Address;
      readonly factory: { address: Address | undefined; data: Hex | undefined };
    });

// Wallet interfaces using the type helper
export type Kernel = OptionalEIP7702<{
  readonly type: WalletType.Kernel;
  readonly encoding: WalletEncoding.ERC7821;
  readonly isViaEntryPoint: boolean;
}>;

export type Safe = OptionalEIP7702<{
  readonly type: WalletType.Safe;
  readonly encoding: WalletEncoding.Safe;
  readonly isViaEntryPoint: boolean;
}>;

export type Gelato = {
  readonly type: WalletType.Gelato;
  readonly encoding: WalletEncoding.ERC7821;
  readonly isViaEntryPoint: false;
  readonly eip7702: true;
};

export type Wallet = Gelato | Kernel | Safe;

export const kernel = (
  params:
    | { eip7702: true }
    | {
        eip7702: false;
        address: Address;
        factory: { address: Address | undefined; data: Hex | undefined };
      }
): Kernel => {
  const { eip7702 } = params;

  if (eip7702) {
    // Currently only support isViaEntryPoint
    return {
      type: WalletType.Kernel,
      encoding: WalletEncoding.ERC7821,
      isViaEntryPoint: true,
      eip7702
    };
  }

  const { address, factory } = params;
  return {
    type: WalletType.Kernel,
    encoding: WalletEncoding.ERC7821,
    isViaEntryPoint: true,
    eip7702,
    address,
    factory
  };
};

export const safe = (
  params:
    | { eip7702: true }
    | {
        eip7702: false;
        address: Address;
        factory: { address: Address | undefined; data: Hex | undefined };
      }
): Safe => {
  const { eip7702 } = params;

  if (eip7702) {
    // Currently only support isViaEntryPoint
    return {
      type: WalletType.Safe,
      encoding: WalletEncoding.Safe,
      isViaEntryPoint: true,
      eip7702
    };
  }

  const { address, factory } = params;
  return {
    type: WalletType.Safe,
    encoding: WalletEncoding.Safe,
    isViaEntryPoint: true,
    eip7702,
    address,
    factory
  };
};

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
