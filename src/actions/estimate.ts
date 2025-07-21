import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { Quote } from "../relay/rpc/interfaces/index.js";
import type { GelatoActionArgs, GelatoWalletClient } from "./index.js";
import { prepareCalls } from "./prepareCalls.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 * TODO: Account for authorization list
 */
export async function estimate<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: GelatoActionArgs
): Promise<Quote> {
  const preparedCalls = await prepareCalls(client, parameters);
  return preparedCalls.context.quote;
}
