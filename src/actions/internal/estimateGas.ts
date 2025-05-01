import type { Account, Call, Chain, EstimateContractGasParameters, Transport } from "viem";
import { BaseError, parseAbi } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";

import { mode } from "../../constants/index.js";
import type { GelatoWalletClient } from "../index.js";
import { getMockSignedOpData } from "./getMockSignedOpData.js";

// Add buffer to account for signature verification
const SIGNATURE_VERIFICATION_BUFFER_GAS = 15_000n;
const AUTHORIZATION_BUFFER_GAS = 60_000n;

export async function estimateGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  const request: EstimateContractGasParameters = {
    address: client.account.address,
    abi: parseAbi([
      "function simulateExecute(bytes32 mode, bytes calldata executionData) external payable",
      "error SimulationResult(uint256)"
    ]),
    functionName: "simulateExecute",
    args: [mode("opData"), encodeCalls(calls, await getMockSignedOpData(client, calls))],
    account: client.account,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n
  };

  const estimate = async () => {
    try {
      await client.simulateContract(request);
    } catch (err) {
      if (err instanceof BaseError) {
        const lowLevelError = err.walk();
        // biome-ignore lint/suspicious/noExplicitAny: parse value returned on revert
        return (lowLevelError as any).data.args[0];
      }
      throw err;
    }
  };

  const estimatedGas = await estimate();

  const estimatedGasWithBuffer =
    estimatedGas +
    SIGNATURE_VERIFICATION_BUFFER_GAS +
    (client._internal.authorized ? 0n : AUTHORIZATION_BUFFER_GAS);

  if (client._internal.isOpStack()) {
    // biome-ignore lint/suspicious/noExplicitAny: temporary solution to bypass the type checking
    const estimatedL1Gas = await client.estimateContractL1Gas(request as any);

    return {
      estimatedGas: estimatedGasWithBuffer + estimatedL1Gas,
      estimatedL1Gas,
      estimatedExecutionGas: estimatedGasWithBuffer
    };
  }

  return {
    estimatedGas: estimatedGasWithBuffer,
    estimatedL1Gas: 0n,
    estimatedExecutionGas: estimatedGasWithBuffer
  };
}
