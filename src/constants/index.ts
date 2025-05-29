import type { Address, Hex } from "viem";
import { baseSepolia, basecampTestnet, inkSepolia, sepolia } from "viem/chains";

const GELATO_API = "http://localhost:3100";
const GELATO_API_WS = "wss://api.staging.gelato.digital";

export type Mode = "single" | "default" | "opData";

export type Wallet = "gelato" | "kernel";

const EXECUTION_MODE: { [mode in Mode]: Address } = {
  single: "0x0000000000000000000000000000000000000000000000000000000000000000",
  default: "0x0100000000000000000000000000000000000000000000000000000000000000",
  opData: "0x0100000000007821000100000000000000000000000000000000000000000000"
};

const GELATO_DOMAIN_NAME_AND_VERSION = {
  name: "GelatoDelegation",
  version: "0.0.1"
};

const GELATO_V0_0_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x11923B4c785D87bb34da4d4E34e9fEeA09179289",
  [baseSepolia.id]: "0x11923B4c785D87bb34da4d4E34e9fEeA09179289",
  [inkSepolia.id]: "0x11923B4c785D87bb34da4d4E34e9fEeA09179289",
  [basecampTestnet.id]: "0x11923B4c785D87bb34da4d4E34e9fEeA09179289"
};

const KERNEL_V3_3_DELEGATION_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28",
  [baseSepolia.id]: "0xd6CEDDe84be40893d153Be9d467CD6aD37875b28"
  // not deployed on ink sepolia
};

const FEE_COLLECTOR_ADDRESSES: { [chainId: number]: Address } = {
  [sepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf",
  [baseSepolia.id]: "0x3AC05161b76a35c1c28dC99Aa01BEd7B24cEA3bf",
  [inkSepolia.id]: "0x92478C7eCCb3c7a3932263712C1555DbaEa7D56C",
  [basecampTestnet.id]: "0x92478C7eCCb3c7a3932263712C1555DbaEa7D56C"
};

// for kernel version >=0.3.1
const KERNEL_ECDSA_VALIDATOR_KEY = BigInt("0x0000845ADb2C711129d4f3966735eD98a9F09fC4cE570000");

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

export const delegationAddress = (chainId: number, wallet: Wallet) => {
  const address =
    wallet === "gelato"
      ? GELATO_V0_0_DELEGATION_ADDRESSES[chainId]
      : KERNEL_V3_3_DELEGATION_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return address;
};

export const delegationCode = (delegation: Address) => `0xef0100${delegation.slice(2)}` as Hex;

export const gelatoDomainNameAndVersion = () => GELATO_DOMAIN_NAME_AND_VERSION;

export const kernelECDSAValidatorKey = () => KERNEL_ECDSA_VALIDATOR_KEY;

export const statusApiPollingInterval = () => GELATO_STATUS_API_POLLING_INTERVAL;

export const statusApiPollingMaxRetries = () => GELATO_STATUS_API_POLLING_MAX_RETRIES;
