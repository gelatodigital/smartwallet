import type { Address, Hex } from "viem";

export { api } from "./api.js";

export type Mode = "single" | "default" | "opData";

export type Wallet = "gelato" | "kernel";

const EXECUTION_MODE: { [mode in Mode]: Address } = {
  single: "0x0000000000000000000000000000000000000000000000000000000000000000",
  default: "0x0100000000000000000000000000000000000000000000000000000000000000",
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000"
};

const GELATO_STATUS_API_POLLING_INTERVAL = 3000;
const GELATO_STATUS_API_POLLING_MAX_RETRIES = 10;
const DEFAULT_PROVIDER_POLLING_INTERVAL = 1000;

export const mode = (mode: Mode) => EXECUTION_MODE[mode] as Hex;

export const delegationCode = (delegation: Address) => `0xef0100${delegation.slice(2)}` as Hex;

export const statusApiPollingInterval = () => GELATO_STATUS_API_POLLING_INTERVAL;

export const statusApiPollingMaxRetries = () => GELATO_STATUS_API_POLLING_MAX_RETRIES;

export const defaultProviderPollingInterval = () => DEFAULT_PROVIDER_POLLING_INTERVAL;
