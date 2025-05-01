import type { Address, Chain, Hex } from "viem";
import { baseSepolia, sepolia } from "viem/chains";

const GELATO_API = "https://api.staging.gelato.digital";
const GELATO_API_WS = "wss://api.staging.gelato.digital";

const EXECUTION_MODE = {
  default: "0x0100000000000000000000000000000000000000000000000000000000000000",
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000"
};

const DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x074cEA0cBd04358fDef8cf8ccd6738ad38cfDae8",
  [baseSepolia.id]: "0xC08a65356fDea7eF7c4b88C6D814EF8cA5E5b5a9"
};

const FEE_COLLECTOR_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf",
  [baseSepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf"
};

const NONCE_STORAGE_SLOT = "0xf2a7602a6b0fea467fdf81ac322504e60523f80eb506a1ca5e0f3e0d2ac70500";

const GELATO_STATUS_API_POLLING_INTERVAL = 1000;
const GELATO_STATUS_API_POLLING_MAX_RETRIES = 10;

export const feeCollector = (chain: Chain): Address => {
  const feeCollectorAddresses = FEE_COLLECTOR_ADDRESSES[chain.id];
  if (!feeCollectorAddresses) {
    throw new Error(`Unsupported chain: ${chain.id}`);
  }
  return feeCollectorAddresses;
};

export type Mode = keyof typeof EXECUTION_MODE;

export const api = (t: "http" | "ws" = "http") => (t === "http" ? GELATO_API : GELATO_API_WS);

export const mode = (mode: Mode) => EXECUTION_MODE[mode] as Hex;

export const delegation = (chainId: number) => DELEGATION_ADDRESSES[chainId];

export const nonceStorageSlot = () => NONCE_STORAGE_SLOT as Hex;

export const statusApiPollingInterval = () => GELATO_STATUS_API_POLLING_INTERVAL;

export const statusApiPollingMaxRetries = () => GELATO_STATUS_API_POLLING_MAX_RETRIES;
