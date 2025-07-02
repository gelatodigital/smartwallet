import type { Account, Chain, Client, Transport } from "viem";
import { getClient } from "./utils/client.js";

export type GetUserOperationGasPriceReturnType = {
  slow: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
  standard: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
  fast: {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  };
};

// Overload for when client is passed directly
export async function getUserOperationGasPrice(
  client: Client<Transport, Chain | undefined, Account | undefined>,
  sponsorApiKey?: string
): Promise<GetUserOperationGasPriceReturnType>;

// Overload for when URL is passed (creates cached client)
export async function getUserOperationGasPrice(
  chainId: number,
  sponsorApiKey?: string
): Promise<GetUserOperationGasPriceReturnType>;

// Implementation
export async function getUserOperationGasPrice(
  chainIdOrClient: Client<Transport, Chain | undefined, Account | undefined> | number,
  sponsorApiKey?: string
): Promise<GetUserOperationGasPriceReturnType> {
  const chainId = typeof chainIdOrClient === "number" ? chainIdOrClient : chainIdOrClient.chain?.id;

  if (!chainId) {
    throw new Error("BundlerActions.getUserOperationGasPrice: Client does not define a chain");
  }

  const client = getClient(chainId, sponsorApiKey);

  const gasPrice = await client.request({
    method: "eth_getUserOperationGasPrice",
    params: []
  });

  return {
    slow: {
      maxFeePerGas: BigInt(gasPrice.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(gasPrice.maxPriorityFeePerGas)
    },
    standard: {
      maxFeePerGas: BigInt(gasPrice.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(gasPrice.maxPriorityFeePerGas)
    },
    fast: {
      maxFeePerGas: BigInt(gasPrice.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(gasPrice.maxPriorityFeePerGas)
    }
  };
}
