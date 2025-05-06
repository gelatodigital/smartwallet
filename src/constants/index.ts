import type { Address, Chain, Hex } from "viem";
import { baseSepolia, sepolia } from "viem/chains";

const GELATO_API = "https://api.staging.gelato.digital";
const GELATO_API_WS = "wss://api.staging.gelato.digital";

export type Mode = "default" | "opData";

export type Wallet = "gelato" | "zerodev";

const EXECUTION_MODE: { [mode in Mode]: Address } = {
  default: "0x0100000000000000000000000000000000000000000000000000000000000000",
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000"
};

const GELATO_V0_0_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x074cEA0cBd04358fDef8cf8ccd6738ad38cfDae8",
  [baseSepolia.id]: "0xC08a65356fDea7eF7c4b88C6D814EF8cA5E5b5a9"
};

const ZERODEV_V3_3_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28",
  [baseSepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28"
};

const FEE_COLLECTOR_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf",
  [baseSepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf"
};

const NONCE_STORAGE_SLOT = "0xf2a7602a6b0fea467fdf81ac322504e60523f80eb506a1ca5e0f3e0d2ac70500";

const GELATO_STATUS_API_POLLING_INTERVAL = 1000;
const GELATO_STATUS_API_POLLING_MAX_RETRIES = 10;

export const feeCollector = (chainId: number): Address => {
  const address = FEE_COLLECTOR_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return address;
};

export const api = (t: "http" | "ws" = "http") => (t === "http" ? GELATO_API : GELATO_API_WS);

export const mode = (mode: Mode) => EXECUTION_MODE[mode] as Hex;

export const delegation = (wallet: Wallet, chainId: number) => {
  const address =
    wallet === "gelato"
      ? GELATO_V0_0_DELEGATION_ADDRESSES[chainId]
      : ZERODEV_V3_3_DELEGATION_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return address;
};

export const delegationCode = (delegation: Address) => `0xef0100${delegation.slice(2)}`;

export const nonceStorageSlot = () => NONCE_STORAGE_SLOT as Hex;

export const statusApiPollingInterval = () => GELATO_STATUS_API_POLLING_INTERVAL;

export const statusApiPollingMaxRetries = () => GELATO_STATUS_API_POLLING_MAX_RETRIES;
