export enum WalletEncoding {
  ERC7821 = "erc7821",
  Safe = "safe"
}

export interface WalletDetails {
  readonly encoding: WalletEncoding;
  readonly version?: string;
}
