import type { Chain, Transport } from "viem";

import type { GelatoWalletClient } from "./index.js";
import type { GelatoSmartAccount } from "../accounts/index.js";

export async function switchChain<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { id: number }
): Promise<void> {
  await client._internal.innerSwitchChain(parameters);
}
