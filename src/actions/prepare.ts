import type { Call, Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { Payment } from "../payment/index.js";
import { walletPrepareCalls } from "../relay/rpc/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
import { initializeNetworkCapabilities } from "../relay/rpc/utils/networkCapabilities.js";
import type { GelatoWalletClient } from "./index.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Prepared calls.
 */
export async function prepare<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[]; nonceKey?: bigint }
): Promise<WalletPrepareCallsResponse> {
  const { payment, calls, nonceKey } = structuredClone(parameters);

  await initializeNetworkCapabilities(client);

  return await walletPrepareCalls(client, {
    calls,
    payment,
    nonceKey
  });
}
