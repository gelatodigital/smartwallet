import type {
  Account,
  Call,
  Chain,
  EstimateContractGasParameters,
  SimulateContractParameters,
  Transport
} from "viem";
import { BaseError } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";

import { abi as accountAbi } from "../../abis/account.js";
import { mode } from "../../constants/index.js";
import type { GelatoWalletClient } from "../index.js";
import { getMockSignedOpData } from "./getMockSignedOpData.js";
import { signAuthorizationList } from "./signAuthorizationList.js";

export async function estimateGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  const request = {
    address: client.account.address,
    abi: accountAbi,
    // If delegating, call "execute" to not revert using eth_estimateGas
    functionName: "simulateExecute",
    args: [mode("opData"), encodeCalls(calls, await getMockSignedOpData(client, calls))],
    // Set to zero to avoid gas estimation issues related with funds
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    // Use mock authorization list to estimate gas
    authorizationList:
      client._internal.authorized === false ? await signAuthorizationList(client, true) : undefined
  };

  const estimate = async () => {
    try {
      if (client._internal.authorized) {
        await client.simulateContract(request as SimulateContractParameters);
      } else {
        // TODO: fix, it's wrong and inaccurate
        return client.estimateContractGas(request as EstimateContractGasParameters);
      }
    } catch (err) {
      if (err instanceof BaseError) {
        const lowLevelError = err.walk();
        // biome-ignore lint/suspicious/noExplicitAny: parse value returned on revert
        return BigInt((lowLevelError as any).data.args[0]);
      }
      throw err;
    }

    throw new Error("Unexpected simulation result");
  };

  const estimatedGas = await estimate();

  if (client._internal.isOpStack()) {
    // biome-ignore lint/suspicious/noExplicitAny: temporary solution to bypass the type checking
    const estimatedL1Gas = await client.estimateContractL1Gas(request as any);

    return {
      estimatedGas: estimatedGas + estimatedL1Gas,
      estimatedL1Gas,
      estimatedExecutionGas: estimatedGas
    };
  }

  return {
    estimatedGas,
    estimatedL1Gas: 0n,
    estimatedExecutionGas: estimatedGas
  };
}
