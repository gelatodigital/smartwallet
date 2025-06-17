export enum WalletType {
  OKX = "okx"
}

export enum WalletEncoding {
  ERC7821 = "erc7821",
  Safe = "safe",
  OKX = "okx",
  ERC7579 = "erc7579"
}

export interface WalletDetails {
  readonly type?: WalletType;
  readonly encoding: WalletEncoding;
  readonly version?: string;
}
