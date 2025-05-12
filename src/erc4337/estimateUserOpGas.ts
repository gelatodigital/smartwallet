import { type Account, type Chain, type Transport } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";

export async function estimateUserOpGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  _client: GelatoWalletClient<transport, chain, account>,
  _userOp: UserOperation
): Promise<{
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}> {
  // TODO: estimate rather than using hardcoded values
  return {
    preVerificationGas: 100_000n,
    verificationGasLimit: 300_000n,
    callGasLimit: 100_000n
  };
}
