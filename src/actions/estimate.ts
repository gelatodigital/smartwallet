import type { Call, Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { Payment } from "../payment/index.js";
import type { Quote } from "../relay/rpc/interfaces/index.js";
import { walletPrepareCalls } from "../relay/rpc/prepareCalls.js";
import type { GelatoWalletClient } from "./index.js";

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
  parameters: { payment: Payment; calls: Call[] }
): Promise<Quote> {
  const { payment, calls } = structuredClone(parameters);

  const { context } = await walletPrepareCalls(client, {
    payment,
    calls
  });

  const { quote } = context;

  return quote;
}
