import type { Address } from "viem";

interface NativePayment {
  readonly type: "native";
}

interface ERC20Payment {
  readonly type: "erc20";
  readonly token: Address;
}

interface SponsoredPayment {
  readonly type: "sponsored";
  readonly apiKey: string;
}

export type Payment = NativePayment | ERC20Payment | SponsoredPayment;

export const native = (): NativePayment => ({ type: "native" });

export const erc20 = (token: Address): ERC20Payment => ({
  type: "erc20",
  token
});

export const sponsored = (apiKey: string): SponsoredPayment => ({
  type: "sponsored",
  apiKey
});
