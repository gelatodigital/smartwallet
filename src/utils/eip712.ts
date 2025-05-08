import type { Address, Call, TypedDataDefinition } from "viem";

import { type Mode, gelatoDomainNameAndVersion, mode } from "../constants/index.js";

export const serializeTypedData = (
  chainId: number,
  account: Address,
  executionMode: Mode,
  calls: Call[],
  nonce: bigint
): TypedDataDefinition => ({
  domain: {
    ...gelatoDomainNameAndVersion(),
    chainId,
    verifyingContract: account
  },
  types: {
    Execute: [
      { name: "mode", type: "bytes32" },
      { name: "calls", type: "Call[]" },
      { name: "nonce", type: "uint256" }
    ],
    Call: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" }
    ]
  },
  primaryType: "Execute",
  message: {
    mode: mode(executionMode),
    calls: calls.map((call) => ({
      to: call.to,
      value: call.value ?? 0n,
      data: call.data ?? "0x"
    })),
    nonce
  }
});
