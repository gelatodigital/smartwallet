import type { Account, Call, CallParameters, Chain, Hex, Transport } from "viem";
import { encodeFunctionData, hexToBytes } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";

import type { EstimateL1GasParameters } from "viem/op-stack";
import { simulationAbi, simulationBytecode } from "../../abis/simulation.js";
import { mode } from "../../constants/index.js";
import type { GelatoWalletClient } from "../index.js";
import { getOpData } from "./getOpData.js";

const AUTHORIZATION_GAS = 12_500n;
const BASE_GAS = 21_000n + 1000n;

const calculateCalldataGas = (data: Hex): bigint =>
  hexToBytes(data).reduce((gas, byte) => gas + (byte === 0 ? 4n : 16n), 0n);

export async function estimateGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  const args = {
    to: client.account.address,
    data: encodeFunctionData({
      abi: simulationAbi,
      functionName: "simulateExecute",
      args: [mode("opData"), encodeCalls(calls, await getOpData(client, calls, 0n, true))]
    })
  };

  const result = await client.call({
    ...args,
    stateOverride: [
      {
        address: client.account.address,
        code: simulationBytecode
      }
    ]
  } as CallParameters);

  const executionGas = BigInt(result.data as Hex);
  const estimatedGas =
    executionGas +
    BASE_GAS +
    calculateCalldataGas(args.data) +
    (client._internal.authorized ? 0n : AUTHORIZATION_GAS);

  if (client._internal.isOpStack()) {
    // TODO: currently only supports EIP-1559 transactions so we cannot specify authorizationList
    const estimatedL1Gas = await client.estimateL1Gas(args as EstimateL1GasParameters);

    return {
      estimatedGas,
      estimatedL1Gas
    };
  }

  return {
    estimatedGas,
    estimatedL1Gas: 0n
  };
}
