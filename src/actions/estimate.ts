import type { Call, Chain, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import type { Payment } from "../payment/index.js";
import type { Quote } from "../relay/rpc/interfaces/index.js";
import { walletPrepareCalls } from "../relay/rpc/prepareCalls.js";
import { initializeNetworkCapabilities } from "../relay/rpc/utils/networkCapabilities.js";
import type { GelatoWalletClient } from "./index.js";
import { verifyAuthorization } from "./internal/verifyAuthorization.js";

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
  account extends SmartAccount = SmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[] }
): Promise<Quote> {
  const { payment, calls } = structuredClone(parameters);

  await initializeNetworkCapabilities(client);

  await verifyAuthorization(client);

  const { context } = await walletPrepareCalls(client, {
    payment,
    calls
  });

  const { quote } = context;

  return quote;
}
