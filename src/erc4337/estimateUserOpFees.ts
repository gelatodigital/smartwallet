import {
  type Account,
  type Chain,
  type EstimateGasParameters,
  type Transport,
  encodeFunctionData
} from "viem";
import {
  type UserOperation,
  entryPoint07Address,
  toPackedUserOperation
} from "viem/account-abstraction";
import { erc4337SimulationsAbi, erc4337SimulationsBytecode } from "../abis/erc4337.js";
import type { GelatoWalletClient } from "../actions/index.js";
import { delegationCode, feeCollector } from "../constants/index.js";
import type { Payment } from "../payment/index.js";
import {
  addAuthorizationGas,
  addDelegationOverride,
  estimateL1GasAndFee
} from "../utils/estimation.js";

const GAS_BUFFER = 3_000n;

export async function estimateUserOpFees<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  userOp: UserOperation,
  payment: Payment
): Promise<{
  estimatedFee: bigint;
  estimatedGas: bigint;
  estimatedL1Gas: bigint;
}> {
  const data = encodeFunctionData({
    abi: erc4337SimulationsAbi,
    functionName: "simulateHandleOps",
    args: [[toPackedUserOperation(userOp)], feeCollector(client.chain.id)]
  });

  let estimatedGas = await client.estimateGas({
    to: entryPoint07Address,
    data,
    stateOverride: addDelegationOverride(client, [
      {
        address: entryPoint07Address,
        code: erc4337SimulationsBytecode
      }
    ]),
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n
  } as EstimateGasParameters);

  estimatedGas += GAS_BUFFER;
  estimatedGas = addAuthorizationGas(client, estimatedGas);

  const { estimatedFee, estimatedL1Gas } = await estimateL1GasAndFee(
    client,
    payment,
    estimatedGas,
    data
  );

  return {
    estimatedFee,
    estimatedGas,
    estimatedL1Gas
  };
}
