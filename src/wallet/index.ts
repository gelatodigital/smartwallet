export enum WalletType {
  Gelato = "gelato",
  Kernel = "kernel",
  Safe = "safe",
  OKX = "okx",
  TrustWallet = "trustWallet",
  Custom = "custom"
}

export enum ERC4337Encoding {
  Safe = "safe",
  OKX = "okx",
  ERC7579 = "erc7579",
  TrustWallet = "trustWallet",
  Gelato = "gelato",
  LightAccount = "lightAccount"
}

export interface WalletDetails {
  readonly type?: WalletType;
  readonly encoding: ERC4337Encoding;
  readonly version?: string;
}
