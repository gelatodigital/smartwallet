import type { Call, Chain, EstimateGasParameters, Transport } from "viem";
import { encodeFunctionData } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";
import type { SmartAccount } from "viem/account-abstraction";

import { simulationAbi, simulationBytecode } from "../../abis/simulation.js";
import { mode } from "../../constants/index.js";
import type { Payment } from "../../payment/index.js";
import { addAuthorizationGas, estimateL1GasAndFee } from "../../utils/estimation.js";
import type { GelatoWalletClient } from "../index.js";
import { getOpData } from "./getOpData.js";

export async function estimateFees<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  calls: Call[],
  payment: Payment
): Promise<{
  estimatedFee: bigint;
  estimatedGas: bigint;
  estimatedL1Gas: bigint;
}> {
  const data = encodeFunctionData({
    abi: simulationAbi,
    functionName: "simulateExecute",
    args: [mode("opData"), encodeCalls(calls, await getOpData(client, calls, 0n, true))]
  });

  let estimatedGas = await client.estimateGas({
    to: client.account.address,
    data,
    stateOverride: [
      {
        address: client.account.address,
        code: simulationBytecode
      }
    ],
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n
  } as EstimateGasParameters);

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
