import type {
  Account,
  Call,
  Chain,
  EncodeFunctionDataParameters,
  SimulateContractParameters,
  Transport
} from "viem";
import { encodeFunctionData } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";

import type { EstimateL1GasParameters } from "viem/op-stack";
import { abi as accountAbi } from "../../abis/account.js";
import { mode } from "../../constants/index.js";
import type { GelatoWalletClient } from "../index.js";
import { getMockSignedOpData } from "./getMockSignedOpData.js";

const AUTHORIZATION_GAS = 12_500n;
const BASE_GAS = 25_000n;

export async function estimateGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  const args: EncodeFunctionDataParameters = {
    abi: accountAbi,
    functionName: "simulateExecute",
    args: [mode("opData"), encodeCalls(calls, await getMockSignedOpData(client, calls))]
  };

  try {
    await client.simulateContract({
      ...args,
      address: client.account.address,
      stateOverride: [
        {
          address: client.account.address,
          code: `0xef0100${client._internal.delegation.substring(2)}`
        }
      ]
    } as SimulateContractParameters);
  } catch (err) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const data = (err as any).cause?.data;
    if (!data || data.errorName !== "SimulationResult") {
      throw err;
    }

    const gasConsumed = data.args[0] as bigint;
    const estimatedGas =
      gasConsumed + BASE_GAS + (client._internal.authorized ? 0n : AUTHORIZATION_GAS);

    if (client._internal.isOpStack()) {
      // TODO: currently only supports EIP-1559 transactions so we cannot specify authorizationList
      const estimatedL1Gas = await client.estimateL1Gas({
        to: client.account.address,
        data: encodeFunctionData(args)
      } as EstimateL1GasParameters);

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

  throw new Error("Unexpected simulation result");
}
