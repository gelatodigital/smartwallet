import type { Address } from "viem";

export interface NativePayment {
  readonly type: "native";
}

export interface ERC20Payment {
  readonly type: "erc20";
  readonly token: Address;
}

export interface SponsoredPayment {
  readonly type: "sponsored";
}

export type Payment = NativePayment | ERC20Payment | SponsoredPayment;

export const native = (): NativePayment => ({ type: "native" });

export const erc20 = (token: Address): ERC20Payment => ({
  type: "erc20",
  token
});

export const sponsored = (): SponsoredPayment => ({
  type: "sponsored"
});

export const isSponsored = (payment: Payment): payment is SponsoredPayment =>
  payment.type === "sponsored";
