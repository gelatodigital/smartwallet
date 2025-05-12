import type { Account, Call, Chain, EstimateGasParameters, Transport } from "viem";
import { encodeFunctionData, ethAddress } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";

import type { EstimateL1GasParameters } from "viem/op-stack";
import { simulationAbi, simulationBytecode } from "../../abis/simulation.js";
import { mode } from "../../constants/index.js";
import type { GelatoWalletClient } from "../index.js";
import { getOpData } from "./getOpData.js";
import { getEstimatedFee, getEstimatedFeeOpStack } from "../../oracle/index.js";
import { Payment } from "../../payment/index.js";

const AUTHORIZATION_GAS = 25_000n;

export async function estimateFees<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
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

  if (!client._internal.authorized) estimatedGas += AUTHORIZATION_GAS;

  const paymentToken = payment.type === "erc20" ? payment.token : ethAddress;

  if (client._internal.isOpStack()) {
    // TODO: currently only supports EIP-1559 transactions so we cannot specify authorizationList
    const estimatedFee = await getEstimatedFeeOpStack(
      client.chain.id,
      paymentToken,
      estimatedGas,
      data
    );

    // TODO: remove once this is returned by the fee oracle
    const estimatedL1Gas = await client.estimateL1Gas({
      to: client.account.address,
      data
    } as EstimateL1GasParameters);

    return {
      estimatedFee,
      estimatedGas,
      estimatedL1Gas
    };
  }

  const estimatedFee = await getEstimatedFee(client.chain.id, paymentToken, estimatedGas);

  return {
    estimatedFee,
    estimatedGas,
    estimatedL1Gas: 0n
  };
}
