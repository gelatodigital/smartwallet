import type { Call, Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type { GelatoWalletClient } from "./index.js";
import { prepareCalls } from "./prepareCalls.js";
import { sendPreparedCalls } from "./sendPreparedCalls.js";

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
  parameters: { payment: Payment; calls: Call[]; nonceKey?: bigint }
): Promise<GelatoResponse> {
  const preparedCalls = await prepareCalls(client, parameters);
  return sendPreparedCalls(client, { preparedCalls });
}
