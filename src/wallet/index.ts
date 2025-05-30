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

export interface Wallet {
  readonly type: WalletType;
  readonly encoding: WalletEncoding;
  readonly version?: string;
}
