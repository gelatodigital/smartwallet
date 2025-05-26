import type { Address, Call, Hex, SignedAuthorizationList, TypedDataDefinition } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { Payment } from "../../../payment/index.js";

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
  authorized: boolean;
  nonceKey?: bigint;
}

export interface SmartWalletContext {
  type: ContextType.SmartWallet;
  payment: Payment;
  calls: Call[];
  nonceKey: string;
  timestamp?: number;
  signature?: Hex;
  quote?: Quote;
}

export interface EntryPointContext {
  type: ContextType.EntryPoint;
  payment: Payment;
  userOp: UserOperation;
  timestamp?: number;
  signature?: Hex;
  quote?: Quote;
}

export type Context = SmartWalletContext | EntryPointContext;

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

export type NetworkCapabilities = {
  feeCollector: Address;
  tokens: { address: Address; symbol: string; decimals: number }[];
  contracts: {
    delegation?: Record<
      string,
      {
        address: string;
        version: string;
      }[]
    >;
  };
};

export interface WalletGetCapabilitiesResponse {
  [chainId: Hex]: NetworkCapabilities;
}
