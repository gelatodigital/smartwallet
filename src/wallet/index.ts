export enum WalletType {
  Gelato = "gelato",
  Kernel = "kernel",
  Safe = "safe",
  OKX = "okx",
  TrustWallet = "trustWallet",
  Custom = "custom"
}

export enum WalletEncoding {
  Safe = "safe",
  OKX = "okx",
  ERC7579 = "erc7579",
  TrustWallet = "trustWallet",
  Gelato = "gelato"
}

export interface WalletDetails {
  readonly type?: WalletType;
  readonly encoding: WalletEncoding;
  readonly version?: string;
}
