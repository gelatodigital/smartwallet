export enum WalletType {
  Gelato = "gelato",
  Kernel = "kernel",
  Safe = "safe",
  OKX = "okx",
  TrustWallet = "trustWallet",
  Custom = "custom"
}

export enum WalletEncoding {
  ERC7821 = "erc7821",
  Safe = "safe",
  OKX = "okx",
  ERC7579 = "erc7579",
  TrustWallet = "trustWallet"
}

export interface WalletDetails {
  readonly type?: WalletType;
  readonly encoding: WalletEncoding;
  readonly version?: string;
}
