import type { Chain, Client, Transport } from "viem";
import type {
  EstimateUserOperationGasParameters,
  EstimateUserOperationGasReturnType,
  PrepareUserOperationParameters,
  SmartAccount
} from "viem/account-abstraction";
import type { GelatoBundlerConfig } from "../index.js";
import { prepareUserOperation } from "./index.js";

export async function estimateUserOperationGas<
  const calls extends readonly unknown[],
  account extends SmartAccount | undefined,
  accountOverride extends SmartAccount | undefined = undefined
>(
  client: Client<Transport, Chain, account>,
  parameters: EstimateUserOperationGasParameters<account, accountOverride, calls>,
  config: GelatoBundlerConfig
): Promise<EstimateUserOperationGasReturnType<account, accountOverride>> {
  const { preVerificationGas, verificationGasLimit, callGasLimit } = await prepareUserOperation(
    client,
    {
      ...parameters,
      parameters: ["gas"]
    } as unknown as PrepareUserOperationParameters,
    config
  );

  return {
    preVerificationGas,
    verificationGasLimit,
    callGasLimit
  } as EstimateUserOperationGasReturnType<account, accountOverride>;
}
