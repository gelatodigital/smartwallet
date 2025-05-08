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
    throw new Error(`GelatoRelaySDK/getGelatoOracles: Failed with error: ${error}`);
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
    throw new Error(`GelatoRelaySDK/getPaymentTokens: Failed with error: ${error}`);
  }
};

export const getEstimatedFee = async (
  chainId: number,
  paymentToken: string,
  estimatedGas: bigint,
  estimatedL1Gas: bigint,
  data?: string
): Promise<bigint> => {
  return data
    ? _getEstimatedFeeOpStack(chainId, paymentToken, estimatedGas, estimatedL1Gas, data)
    : _getEstimatedFee(chainId, paymentToken, estimatedGas, estimatedL1Gas);
};

const _getEstimatedFee = async (
  chainId: number,
  paymentToken: string,
  estimatedGas: bigint,
  estimatedL1Gas: bigint
): Promise<bigint> => {
  const queryParams = new URLSearchParams({
    paymentToken,
    gasLimit: estimatedGas.toString(),
    gasLimitL1: estimatedL1Gas.toString()
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
    throw new Error(`GelatoRelaySDK/getEstimatedFee: Failed with error: ${error}`);
  }
};

const _getEstimatedFeeOpStack = async (
  chainId: number,
  paymentToken: string,
  estimatedGas: bigint,
  estimatedL1Gas: bigint,
  data: string
): Promise<bigint> => {
  const url = `${api()}/oracles/${chainId.toString()}/estimate/opStack`;

  const body = JSON.stringify({
    paymentToken,
    gasLimit: estimatedGas.toString(),
    gasLimitL1: estimatedL1Gas.toString(),
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
    throw new Error(`GelatoRelaySDK/getEstimatedFeePost: Failed with error: ${error}`);
  }
};
