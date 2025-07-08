import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type { GelatoActionArgs, GelatoWalletClient } from "./index.js";
import { prepare } from "./prepare.js";
import { send } from "./send.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 */
export async function execute<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: GelatoActionArgs
): Promise<GelatoResponse> {
  const preparedCalls = await prepare(client, parameters);
  return send(client, { preparedCalls });
}
