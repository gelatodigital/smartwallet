import type { Address, Call, TypedDataDefinition } from "viem";

import { EXECUTION_MODE } from "../constants/index.js";

export const serializeTypedData = (
  chainId: number,
  accountAddress: Address,
  calls: Call[],
  nonce: bigint
): TypedDataDefinition => ({
  domain: {
    name: "Delegation",
    version: "0.0.1",
    chainId,
    verifyingContract: accountAddress
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
    mode: EXECUTION_MODE.opData as `0x{string}`,
    calls: calls.map((call) => ({
      to: call.to,
      value: call.value ?? 0n,
      data: call.data ?? "0x"
    })),
    nonce
  }
});
