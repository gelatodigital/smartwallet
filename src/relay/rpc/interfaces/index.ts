import type { Address, Call, Hex, SignedAuthorizationList, TypedDataDefinition } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { Payment } from "../../../payment/index.js";
import type { Wallet } from "../../../wallet/index.js";

export enum SignatureRequestType {
  TypedData = "eth_signTypedData_v4",
  EthSign = "eth_sign",
  UserOperation = "eth_signUserOperation"
}

type TypedDataSignatureRequest = {
  type: SignatureRequestType.TypedData;
  data: TypedDataDefinition;
};

type EthSignSignatureRequest = {
  type: SignatureRequestType.EthSign;
  data: Hex;
};

type UserOperationSignatureRequest = {
  type: SignatureRequestType.UserOperation;
  data: UserOperation;
};

export type SignatureRequest =
  | TypedDataSignatureRequest
  | EthSignSignatureRequest
  | UserOperationSignatureRequest;

export interface Quote {
  fee: { estimatedFee: string; decimals: number; conversionRate: number };
  gas: bigint;
  l1Gas: bigint;
}

export interface GatewaySignature {
  quote: Quote;
  timestamp: number;
  signature: Hex;
}

export interface Authorization {
  address: Address;
  authorized: boolean;
}

export interface Factory {
  address: Address;
  data: Hex;
}

export interface EntryPoint {
  version: "0.7" | "0.8";
  address: Address;
}

export interface BaseCapabilities {
  wallet: Wallet;
  payment: Payment;
  authorization?: Authorization;
}

export interface SmartWalletCapabilities extends BaseCapabilities {
  nonceKey?: string;
  authorization: Authorization;
}

export interface KernelCapabilities extends BaseCapabilities {
  factory?: Factory;
  entryPoint?: EntryPoint;
}

export type Capabilities = SmartWalletCapabilities | KernelCapabilities;

export interface SmartWalletContext extends SmartWalletCapabilities, Partial<GatewaySignature> {
  calls: Call[];
  nonceKey: string;
  quote: Quote;
}

export interface KernelContext extends KernelCapabilities, Partial<GatewaySignature> {
  userOp: UserOperation;
  quote: Quote;
}

export type Context = SmartWalletContext | KernelContext;

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

export interface WalletPrepareCallsParams {
  calls: Call[];
  payment: Payment;
  nonceKey?: bigint;
}

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

export interface WalletGetCapabilitiesResponse {
  [chainId: number]: SingleNetworkCapabilities;
}
