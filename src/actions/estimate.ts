import type { Account, Call, Chain, Transport } from "viem";

import type { Payment } from "../payment/index.js";
import { initializeNetworkCapabilities } from "../relay/rpc/utils/networkCapabilities.js";
import { isERC7821, isViaEntryPoint } from "../wallet/index.js";
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
  account extends Account = Account
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

  if (isViaEntryPoint(client) && isERC7821(client)) {
    let userOp = await getPartialUserOp(client, calls);

  return quote;
}
