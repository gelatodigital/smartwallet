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

const GELATO_DOMAIN_NAME_AND_VERSION = {
  name: "GelatoDelegation",
  version: "0.0.1"
};

const GELATO_V0_0_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0xe8d378f26A857D8d32bB9E8Ba6C2Dc5e554d95Bb",
  [baseSepolia.id]: "0xD77B41b99B22f0f674744B53f85F4BB363F7f7CD"
};

const ZERODEV_V3_3_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28",
  [baseSepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28"
};

const FEE_COLLECTOR_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf",
  [baseSepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf"
};

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

export const delegationCode = (delegation: Address) => `0xef0100${delegation.slice(2)}` as Hex;

export const gelatoDomainNameAndVersion = () => GELATO_DOMAIN_NAME_AND_VERSION;

export const statusApiPollingInterval = () => GELATO_STATUS_API_POLLING_INTERVAL;

export const statusApiPollingMaxRetries = () => GELATO_STATUS_API_POLLING_MAX_RETRIES;
