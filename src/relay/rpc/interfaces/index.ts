import type { Address, Call, Hex, SignedAuthorizationList, TypedDataDefinition } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { Payment } from "../../../payment/index.js";
import type { Delegation, Gelato, Kernel } from "../../../wallet/index.js";

export enum SignatureRequestType {
  TypedData = "eth_signTypedData_v4",
  EthSign = "eth_sign"
}

type TypedDataSignatureRequest = {
  type: SignatureRequestType.TypedData;
  data: TypedDataDefinition;
};

type EthSignSignatureRequest = {
  type: SignatureRequestType.EthSign;
  data: Hex;
};

export type SignatureRequest = TypedDataSignatureRequest | EthSignSignatureRequest;

export enum ContextType {
  SmartWallet = "smartwallet",
  EntryPoint = "entrypoint"
}

export interface Quote {
  fee: { estimatedFee: string; decimals: number; conversionRate: number };
  gas: bigint;
  l1Gas: bigint;
}

export interface WalletPrepareCallsParams {
  calls: Call[];
  payment: Payment;
  nonceKey?: bigint;
}

export interface SmartWalletContext extends Omit<Gelato, "eip7702"> {
  payment: Payment;
  delegation: Delegation;
  nonceKey: string;
  calls: Call[];
  quote: Quote;
  timestamp?: number;
  signature?: Hex;
}

export interface KernelContext extends Omit<Kernel, "eip7702"> {
  payment: Payment;
  userOp: UserOperation;
  calls: Call[];
  quote: Quote;
  timestamp?: number;
  signature?: Hex;
}

export type Context = SmartWalletContext | KernelContext;

export interface WalletPrepareCallsResponse {
  chainId: number;
  context: Context;
  signatureRequest: SignatureRequest;
}

export interface WalletSendPreparedCallsParams {
  context: Context;
  signature: Hex;
  authorizationList?: SignedAuthorizationList;
}

export interface WalletSendPreparedCallsResponse {
  id: string;
}

export interface SingleNetworkCapabilities {
  feeCollector: Address;
  tokens: { address: Address; symbol: string; decimals: number }[];
  contracts: {
    delegation: Record<
      string,
      {
        address: Address;
        version: string;
      }[]
    >;
  };
}
export interface NetworkCapabilities {
  [chainId: number]: SingleNetworkCapabilities;
}

export interface WalletGetCapabilitiesResponse {
  [chainId: number]: SingleNetworkCapabilities;
}
