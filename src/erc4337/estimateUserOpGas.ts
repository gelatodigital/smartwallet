import type { Account, Chain, EstimateGasParameters, Transport } from "viem";

import { type UserOperation, entryPoint07Address } from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";
import { addDelegationOverride, subtractBaseAndCalldataGas } from "../utils/estimation.js";

const MAX_VERIFICATION_GAS = 2_000_000n;

export async function estimateUserOpGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  userOp: UserOperation
): Promise<{
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
}> {
  const estimatedCallGas = await client.estimateGas({
    to: client.account.address,
    data: userOp.callData,
    account: entryPoint07Address,
    stateOverride: addDelegationOverride(client),
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n
  } as EstimateGasParameters);

  const callGasLimit = subtractBaseAndCalldataGas(estimatedCallGas, userOp.callData);

  return {
    preVerificationGas: 0n,
    verificationGasLimit: MAX_VERIFICATION_GAS,
    callGasLimit
  };
}
