import type { Chain, Client, GetChainIdReturnType, Transport } from "viem";

export async function getChainId<chain extends Chain>(
  client: Client<Transport, chain>
): Promise<GetChainIdReturnType> {
  return client.chain.id;
}
