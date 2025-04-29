import type { Address, Hex } from "viem";
import { sepolia } from "viem/chains";

const GELATO_API = "https://api.dev.gelato.digital";

const EXECUTION_MODE = {
  default: "0x0100000000000000000000000000000000000000000000000000000000000000",
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000"
};

const DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x515CCb8F7dE7ff2C70B148DC79827573e5b66ECC"
};

const NONCE_STORAGE_SLOT = "0xf2a7602a6b0fea467fdf81ac322504e60523f80eb506a1ca5e0f3e0d2ac70500";

export type Mode = keyof typeof EXECUTION_MODE;

export const api = () => GELATO_API;

export const mode = (mode: Mode) => EXECUTION_MODE[mode] as Hex;

export const delegation = (chainId: number) => DELEGATION_ADDRESSES[chainId];

export const nonceStorageSlot = () => NONCE_STORAGE_SLOT as Hex;
