import type {
  Account,
  Call,
  Chain,
  Hex,
  SignedAuthorizationList,
  Transport,
  TypedDataDefinition
} from "viem";

import type { GelatoWalletClient } from "../../actions/index.js";
import { api } from "../../constants/index.js";
import type { Payment } from "../../payment/index.js";
import type { GelatoResponse } from "../index.js";
import { track } from "../status/index.js";

export type GatewaySignature = {
  estimatedFee: string;
  timestamp: number;
  signature: Hex;
};

export enum SignatureRequestType {
  TypedData = "eth_signTypedData_v4"
}

export type SignatureRequest = {
  type: SignatureRequestType.TypedData;
  data: TypedDataDefinition;
};

export interface WalletPrepareCallsParams {
  calls: Call[];
  payment: Payment;
  nonceKey?: bigint;
}

export type Context = {
  payment: Payment;
  calls: Call[];
  nonceKey: string;
  gatewaySignature?: GatewaySignature;
};

export interface WalletPrepareCallsResponse {
  chainId: number;
  context: Context;
  signatureRequest: SignatureRequest;
}

export interface WalletSendCallsParams {
  context: Context;
  signature: Hex;
  authorizationList?: SignedAuthorizationList;
}

export interface WalletSendCallsResponse {
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
  console.log("params: ", params);

  // Ensure the calls have string values instead of BigInt
  const serializedCalls = serializeCalls(params.calls);
  const serializedNonceKey = serializeNonceKey(params.nonceKey);

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
          calls: serializedCalls,
          capabilities: { payment: params.payment, nonceKey: serializedNonceKey }
        }
      ]
    })
  });

  const data = await raw.json();
  if (data.error) throw new Error(data.error.message || "walletPrepareCalls failed");

  return data.result as WalletPrepareCallsResponse;
};

export const walletSendCalls = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  params: WalletSendCallsParams
): Promise<GelatoResponse> => {
  const response = await fetch(`${api()}/smartwallet`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "wallet_sendCalls",
      params: [
        {
          chainId: client.chain.id,
          from: client.account.address,
          context: params.context,
          signature: params.signature,
          authorizationList: params.authorizationList
        }
      ]
    })
  });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "walletSendCalls failed");
  }

  const { id } = data.result as WalletSendCallsResponse;
  return track(id, client);
};

// Serialize BigInt values to strings for JSON compatibility
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
