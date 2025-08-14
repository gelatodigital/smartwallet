import type {
  Address,
  Call,
  Hex,
  RpcUserOperation,
  SignedAuthorizationList,
  TypedDataDefinition
} from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { ValidatorRpc } from "../../../accounts/gelato/index.js";
import type { GelatoSmartAccountSCW, Validator } from "../../../accounts/index.js";
import type { Payment } from "../../../payment/index.js";
import type { WalletDetails } from "../../../wallet/index.js";

export enum SignatureRequestType {
  TypedData = "eth_signTypedData_v4",
  EthSign = "eth_sign",
  PersonalSign = "personal_sign",
  UserOperation = "eth_signUserOperation"
}

type TypedDataSignatureRequest = {
  type: SignatureRequestType.TypedData;
  data: TypedDataDefinition;
};

type PersonalSignSignatureRequest = {
  type: SignatureRequestType.EthSign | SignatureRequestType.PersonalSign;
  data: Hex;
};

type UserOperationSignatureRequest = {
  type: SignatureRequestType.UserOperation;
  data: UserOperation;
};

export type SignatureRequest =
  | TypedDataSignatureRequest
  | PersonalSignSignatureRequest
  | UserOperationSignatureRequest;

export interface Quote {
  fee: {
    amount: string;
    dappShare?: string;
    rate: number;
    token: {
      decimals: number;
      address: Address;
      symbol?: string;
      name?: string;
    };
  };
  gasUsed: string;
  gasUsedL1?: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
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

export interface CustomCapabilities {
  wallet: WalletDetails;
  payment: Payment;
  validator?: ValidatorRpc;
  authorization?: Authorization;
  nonceKey?: string;
  nonce?: string;
}

export interface ERC4337Capabilities extends CustomCapabilities {
  entryPoint: EntryPoint;
  factory?: Factory;
}

export type Capabilities = CustomCapabilities | ERC4337Capabilities;

export interface CustomContext extends CustomCapabilities, Partial<GatewaySignature> {
  calls: Call[];
  from: Address;
  quote: Quote;
}

export interface ERC4337Context extends ERC4337Capabilities, Partial<GatewaySignature> {
  userOp: RpcUserOperation;
  quote: Quote;
}

export type Context = CustomContext | ERC4337Context;

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
  scw: GelatoSmartAccountSCW;
  erc4337: boolean;
  nonceKey?: bigint;
  nonce?: bigint;
  apiKey?: string;
  validator?: Validator;
}

export interface WalletPrepareCallsResponse<T extends Context = Context> {
  chainId: number;
  context: T;
  signatureRequest: SignatureRequest;
}

export interface WalletSendPreparedCallsParams {
  context: Context;
  signature: Hex;
  authorizationList?: SignedAuthorizationList;
  apiKey?: string;
}

export interface WalletSendPreparedCallsResponse {
  id: string;
}

export interface WalletGetCapabilitiesResponse {
  [chainId: number]: SingleNetworkCapabilities;
}
