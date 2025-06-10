import type { Address, Call, Hex, SignedAuthorizationList, TypedDataDefinition } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { Payment } from "../../../payment/index.js";
import type { WalletDetails } from "../../../wallet/index.js";

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

export interface GelatoCapabilities {
  wallet: WalletDetails;
  payment: Payment;
  authorization?: Authorization;
  nonceKey?: string;
}

export interface ERC4337Capabilities extends GelatoCapabilities {
  entryPoint: EntryPoint;
  factory?: Factory;
}

export type Capabilities = GelatoCapabilities | ERC4337Capabilities;

export interface GelatoContext extends GelatoCapabilities, Partial<GatewaySignature> {
  calls: Call[];
  from: Address;
  nonceKey: string;
  quote: Quote;
}

export interface ERC4337Context extends ERC4337Capabilities, Partial<GatewaySignature> {
  userOp: UserOperation;
  quote: Quote;
}

export type Context = GelatoContext | ERC4337Context;

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
