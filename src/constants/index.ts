import type { Address, Hex } from "viem";
import { baseSepolia, sepolia } from "viem/chains";

const GELATO_API = "https://api.gelato.digital";
const GELATO_API_WS = "wss://api.gelato.digital";

const EXECUTION_MODE = {
  default: "0x0100000000000000000000000000000000000000000000000000000000000000",
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000"
};

const DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x529C16817F74c5CcA41906Ab32F178e7da389b4b",
  [baseSepolia.id]: "0xa191bcc6055B4d77d577b6A042b940737c8507B3"
};

const NONCE_STORAGE_SLOT = "0xf2a7602a6b0fea467fdf81ac322504e60523f80eb506a1ca5e0f3e0d2ac70500";

export const GELATO_STATUS_API_POLLING_INTERVAL = 1000;
export const GELATO_STATUS_API_POLLING_MAX_RETRIES = 10;

export type Mode = keyof typeof EXECUTION_MODE;

export const api = (t: "http" | "ws" = "http") => (t === "http" ? GELATO_API : GELATO_API_WS);

export const mode = (mode: Mode) => EXECUTION_MODE[mode] as Hex;

export const delegation = (chainId: number) => DELEGATION_ADDRESSES[chainId];

export const nonceStorageSlot = () => NONCE_STORAGE_SLOT as Hex;

export const statusApiPollingInterval = () => GELATO_STATUS_API_POLLING_INTERVAL;

export const statusApiPollingMaxRetries = () => GELATO_STATUS_API_POLLING_MAX_RETRIES;
