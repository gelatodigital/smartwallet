import type { Hex } from "viem";
import { api } from "../constants/index.js";

export const isOracleActive = async (chainId: number): Promise<boolean> => {
  const oracles = await getGelatoOracles();
  return oracles.includes(chainId.toString());
};

export const getGelatoOracles = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${api()}/oracles/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.oracles;
  } catch (error) {
    throw new Error(`GelatoSmartWalletSDK/getGelatoOracles: Failed with error: ${error}`);
  }
};

export const getPaymentTokens = async (chainId: number): Promise<string[]> => {
  try {
    const response = await fetch(`${api()}/oracles/${chainId.toString()}/paymentTokens/`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.paymentTokens;
  } catch (error) {
    throw new Error(`GelatoSmartWalletSDK/getPaymentTokens: Failed with error: ${error}`);
  }
};

export const getEstimatedFee = async (
  chainId: number,
  paymentToken: Hex,
  estimatedGas: bigint
): Promise<bigint> => {
  const queryParams = new URLSearchParams({
    paymentToken,
    gasLimit: estimatedGas.toString()
  });

  const url = `${api()}/oracles/${chainId.toString()}/estimate?${queryParams.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return BigInt(data.estimatedFee);
  } catch (error) {
    throw new Error(`GelatoSmartWalletSDK/getEstimatedFee: Failed with error: ${error}`);
  }
};

export const getEstimatedFeeOpStack = async (
  chainId: number,
  paymentToken: Hex,
  estimatedGas: bigint,
  data: string
): Promise<bigint> => {
  const url = `${api()}/oracles/${chainId.toString()}/estimate/opStack`;

  const body = JSON.stringify({
    paymentToken,
    gasLimit: estimatedGas.toString(),
    data
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return BigInt(data.estimatedFee);
  } catch (error) {
    throw new Error(`GelatoSmartWalletSDK/getEstimatedFeeOpStack: Failed with error: ${error}`);
  }
};
