import type { Address, Hex, TypedData } from "viem";

const GELATO_API = "https://api.gelato.digital";
const GELATO_API_WS = "wss://api.gelato.digital";

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

export const METAMASK_DELEGATION = {"address": "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B", "type": "EIP7702StatelessDeleGator", "version": "1"} as const;

export const METAMASK_SIGNABLE_USER_OP_TYPED_DATA: TypedData = {
  PackedUserOperation: [
    { name: "sender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "initCode", type: "bytes" },
    { name: "callData", type: "bytes" },
    { name: "accountGasLimits", type: "bytes32" },
    { name: "preVerificationGas", type: "uint256" },
    { name: "gasFees", type: "bytes32" },
    { name: "paymasterAndData", type: "bytes" },
    { name: "entryPoint", type: "address" },
  ],
} as const;

export const api = (t: "http" | "ws" = "http") => (t === "http" ? GELATO_API : GELATO_API_WS);

export const mode = (mode: Mode) => EXECUTION_MODE[mode] as Hex;

export const delegationCode = (delegation: Address) => `0xef0100${delegation.slice(2)}` as Hex;

export const statusApiPollingInterval = () => GELATO_STATUS_API_POLLING_INTERVAL;

export const statusApiPollingMaxRetries = () => GELATO_STATUS_API_POLLING_MAX_RETRIES;

export const defaultProviderPollingInterval = () => DEFAULT_PROVIDER_POLLING_INTERVAL;
