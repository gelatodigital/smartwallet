import type { Address, Chain } from "viem";
import { sepolia } from "viem/chains";

export interface NativePayment {
  readonly type: "native";
}

export interface ERC20Payment {
  readonly type: "erc20";
  readonly token: Address;
}

export interface SponsoredPayment {
  readonly type: "sponsored";
  readonly apiKey: string;
}

export type Payment = NativePayment | ERC20Payment | SponsoredPayment;

export const native = (): NativePayment => ({ type: "native" });

export const erc20 = (token: Address): ERC20Payment => ({
  type: "erc20",
  token
});

export const isErc20 = (payment: Payment): payment is ERC20Payment => payment.type === "erc20";

export const sponsored = (apiKey: string): SponsoredPayment => ({
  type: "sponsored",
  apiKey
});

export const feeCollector = (chain: Chain): Address => {
  switch (chain.id) {
    case sepolia.id:
      return "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf" as Address;
    default:
      throw new Error(`Unsupported chain: ${chain.id}`);
  }
};
