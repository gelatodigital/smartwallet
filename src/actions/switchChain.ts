import type { Account, Chain, Transport } from "viem";

import { delegationAddress } from "../constants/index.js";
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

  client._internal.delegation = delegationAddress(parameters.id, client._internal.wallet);

  const _isOpStack = isOpStack(client.chain);
  client._internal.isOpStack = () => _isOpStack;
}
