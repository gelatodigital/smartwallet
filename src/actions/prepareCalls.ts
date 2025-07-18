import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import { walletPrepareCalls } from "../relay/rpc/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
import type { GelatoActionArgs, GelatoWalletClient } from "./index.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Prepared calls.
 */
export async function prepareCalls<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: GelatoActionArgs
): Promise<WalletPrepareCallsResponse> {
  const { payment, calls } = parameters;
  const nonce = "nonce" in parameters ? parameters.nonce : undefined;
  const nonceKey = "nonceKey" in parameters ? parameters.nonceKey : undefined;

  return await walletPrepareCalls(client, {
    calls,
    payment,
    nonceKey,
    nonce,
    scw: client.account.scw,
    erc4337: client.account.erc4337,
    apiKey: client._internal.apiKey()
  });
}
