import type { Chain, Hex, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletSendPreparedCalls } from "../relay/rpc/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
import type { GelatoWalletClient } from "./index.js";
import { sign } from "./sign.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Send prepared calls.
 */
export async function send<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { preparedCalls: WalletPrepareCallsResponse; signature?: Hex }
): Promise<GelatoResponse> {
  const { preparedCalls, signature: _signature } = parameters;
  const { context } = preparedCalls;

  const { signature, authorizationList } = _signature
    ? { signature: _signature }
    : await sign(client, preparedCalls);

  return await walletSendPreparedCalls(client, {
    context,
    signature,
    authorizationList,
    apiKey: client._internal.apiKey()
  });
}
