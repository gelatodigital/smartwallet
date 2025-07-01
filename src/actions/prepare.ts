import type { Call, Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { Payment } from "../payment/index.js";
import { walletPrepareCalls } from "../relay/rpc/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
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
  const { payment, calls, nonceKey } = parameters;

  return await walletPrepareCalls(client, {
    calls,
    payment,
    nonceKey,
    scw: client.account.scw,
    erc4337: client.account.erc4337,
    apiKey: client._internal.apiKey()
  });
}
