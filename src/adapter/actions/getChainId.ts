import type { Chain, Client, GetChainIdReturnType, Transport } from "viem";

export async function getChainId<chain extends Chain | undefined>(
  client: Client<Transport, chain>
): Promise<GetChainIdReturnType> {
  if (!client.chain) {
    throw new Error("BundlerActions.getChainId: Client does not define a chain");
  }

  return client.chain.id;
}
