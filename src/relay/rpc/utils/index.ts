import type { Call, SignedAuthorizationList } from "viem";
import type { Wallet } from "../../../constants";
import { ContextType } from "../interfaces";

export function serializeCalls(calls: Call[]) {
  if (!calls) return [];

  return calls.map((call) => ({
    ...call,
    value: typeof call.value === "bigint" ? call.value.toString() : call.value
  }));
}

export function serializeNonceKey(nonceKey?: bigint) {
  return nonceKey !== undefined ? nonceKey.toString() : undefined;
}

export function serializeAuthorizationList(authorizationList?: SignedAuthorizationList) {
  if (!authorizationList || !Array.isArray(authorizationList) || authorizationList.length === 0) {
    return authorizationList;
  }

  return authorizationList.map((auth) => ({
    ...auth,
    v: typeof auth.v === "bigint" ? auth.v.toString() : auth.v
  }));
}

export const contextType = (wallet: Wallet): ContextType =>
  wallet === "gelato" ? ContextType.SmartWallet : ContextType.EntryPoint;
