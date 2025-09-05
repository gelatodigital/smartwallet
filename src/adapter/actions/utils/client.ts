import {
  type Account,
  type Chain,
  type Client,
  createClient,
  type Hex,
  http,
  type Transport
} from "viem";

type UserOperationGasPriceWithBigIntAsHex = {
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
};

export type RpcSchema = [
  {
    Method: "eth_getUserOperationGasPrice";
    Parameters: [];
    ReturnType: UserOperationGasPriceWithBigIntAsHex;
  },
  {
    Method: "eth_chainId";
    Parameters: [];
    ReturnType: Hex;
  }
];

// Client cache to avoid creating new clients every time
const clientCache = new Map<
  number,
  Client<Transport, Chain | undefined, Account | undefined, RpcSchema>
>();

function getOrCreateClient(
  chainId: number,
  apiKey?: string
): Client<Transport, Chain | undefined, Account | undefined, RpcSchema> {
  if (!clientCache.has(chainId)) {
    const client = createClient<Transport, Chain | undefined, Account | undefined, RpcSchema>({
      transport: http(
        apiKey
          ? `https://api.gelato.digital/bundlers/${chainId}/rpc?sponsorApiKey=${apiKey}`
          : `https://api.gelato.digital/bundlers/${chainId}/rpc`
      )
    });
    clientCache.set(chainId, client);
  }

  const cachedClient = clientCache.get(chainId);
  if (!cachedClient) {
    throw new Error(`Failed to create or retrieve client for chainId: ${chainId}`);
  }

  return cachedClient;
}

export function getClient(chainId: number, apiKey?: string) {
  return getOrCreateClient(chainId, apiKey);
}
