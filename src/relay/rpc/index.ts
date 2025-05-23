import type {
  Account,
  Call,
  Chain,
  Hex,
  SignedAuthorizationList,
  Transport,
  TypedDataDefinition
} from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { GelatoWalletClient } from "../../actions/index.js";
import { type Wallet, api } from "../../constants/index.js";
import type { Payment } from "../../payment/index.js";
import type { GelatoResponse } from "../index.js";
import { track } from "../status/index.js";

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

export const walletPrepareCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  params: WalletPrepareCallsParams
): Promise<WalletPrepareCallsResponse> => {
  const { payment } = params;

  const calls = serializeCalls(params.calls);
  const type = contextType(client._internal.wallet);
  const nonceKey =
    type === ContextType.SmartWallet ? serializeNonceKey(params.nonceKey) : undefined;
  const delegation = {
    address: client._internal.delegation,
    authorized: params.authorized
  };

  const raw = await fetch(`${api()}/smartwallet`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_prepareCalls",
      params: [
        {
          chainId: client.chain.id,
          from: client.account.address,
          calls,
          capabilities: {
            type,
            payment,
            delegation,
            nonceKey
          }
        }
      ]
    })
  });

  const data = await raw.json();

  if (data.error || data.message)
    throw new Error(data.error?.message || data.message || "walletPrepareCalls failed");

  return data.result as WalletPrepareCallsResponse;
};

export const walletSendPreparedCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  params: WalletSendPreparedCallsParams
): Promise<GelatoResponse> => {
  const { context, signature } = params;
  const authorizationList = serializeAuthorizationList(params.authorizationList);

  const response = await fetch(`${api()}/smartwallet`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_sendPreparedCalls",
      params: [
        {
          chainId: client.chain.id,
          from: client.account.address,
          context,
          signature,
          authorizationList
        }
      ]
    })
  });
  const data = await response.json();

  if (data.error || data.message) {
    throw new Error(data.error?.message || data.message || "walletSendCalls failed");
  }

  const { id } = data.result as WalletSendPreparedCallsResponse;
  return track(id, client);
};

const contextType = (wallet: Wallet) =>
  wallet === "gelato" ? ContextType.SmartWallet : ContextType.EntryPoint;

function serializeCalls(calls: Call[]) {
  if (!calls) return [];

  return calls.map((call) => ({
    ...call,
    value: typeof call.value === "bigint" ? call.value.toString() : call.value
  }));
}

function serializeNonceKey(nonceKey?: bigint) {
  return nonceKey !== undefined ? nonceKey.toString() : undefined;
}

function serializeAuthorizationList(authorizationList?: SignedAuthorizationList) {
  if (!authorizationList || !Array.isArray(authorizationList) || authorizationList.length === 0) {
    return authorizationList;
  }

  return authorizationList.map((auth) => ({
    ...auth,
    v: typeof auth.v === "bigint" ? auth.v.toString() : auth.v
  }));
}
