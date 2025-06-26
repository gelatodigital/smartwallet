import type { Chain, Client, Transport } from "viem";
import type {
  EstimateUserOperationGasParameters,
  EstimateUserOperationGasReturnType,
  SmartAccount
} from "viem/account-abstraction";

export async function estimateUserOperationGas<
  const calls extends readonly unknown[],
  account extends SmartAccount | undefined,
  accountOverride extends SmartAccount | undefined = undefined
>(
  _client: Client<Transport, Chain, account>,
  _parameters: EstimateUserOperationGasParameters<account, accountOverride, calls>
): Promise<EstimateUserOperationGasReturnType<account, accountOverride>> {
  throw new Error("TODO");
}
