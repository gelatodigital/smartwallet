import { GELATO_API } from "../constants/index.js";

export const isOracleActive = async (chainId: number): Promise<boolean> => {
  const oracles = await getGelatoOracles();
  return oracles.includes(chainId.toString());
};

export const getGelatoOracles = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${GELATO_API}/oracles/`);
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
    const response = await fetch(`${GELATO_API}/oracles/${chainId.toString()}/paymentTokens/`);
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
  gasLimit: bigint,
  gasLimitL1: bigint
): Promise<bigint> => {
  const queryParams = new URLSearchParams({
    paymentToken,
    gasLimit: gasLimit.toString(),
    gasLimitL1: gasLimitL1.toString()
  });
  const url = `${GELATO_API}/oracles/${chainId.toString()}/estimate?${queryParams.toString()}`;

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
