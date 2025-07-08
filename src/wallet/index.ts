export enum WalletType {
  Gelato = "gelato",
  Kernel = "kernel",
  Safe = "safe",
  OKX = "okx",
  TrustWallet = "trustWallet",
  Uniswap = "uniswap",
  Custom = "custom"
}

export enum WalletEncoding {
  Safe = "safe",
  OKX = "okx",
  ERC7579 = "erc7579",
  TrustWallet = "trustWallet",
  Gelato = "gelato",
  LightAccount = "lightAccount",
  Uniswap = "uniswap"
}

export interface WalletDetails {
  readonly type?: WalletType;
  readonly encoding: WalletEncoding;
  readonly version?: string;
}
