import type { Account, Chain, Transport } from "viem";

import { isOpStack } from "../utils/opstack.js";
import type { GelatoWalletClient } from "./index.js";

export async function switchChain<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { id: number }
): Promise<void> {
  await client._internal.innerSwitchChain(parameters);

  const _isOpStack = isOpStack(client.chain);
  client._internal.isOpStack = () => _isOpStack;
}
