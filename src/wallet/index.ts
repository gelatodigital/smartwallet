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
