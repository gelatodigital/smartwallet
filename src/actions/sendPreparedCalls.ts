import type { Chain, Hex, Transport } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";

import type { GelatoSmartAccount } from "../accounts/index.js";
import { isSponsored } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletSendPreparedCalls } from "../relay/rpc/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
import type { GelatoWalletClient } from "./index.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";
import { signSignatureRequest } from "./internal/signSignatureRequest.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Send prepared calls.
 */
export async function sendPreparedCalls<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: {
    preparedCalls: WalletPrepareCallsResponse;
    signature?: Hex;
    authorizationList?: SignAuthorizationReturnType[];
  }
): Promise<GelatoResponse> {
  const {
    preparedCalls,
    signature: _signature,
    authorizationList: _authorizationList
  } = parameters;
  const { context } = preparedCalls;

  if (isSponsored(context.payment) && !client._internal.apiKey()) {
    throw new Error("Invalid sponsored request: No apiKey provided.");
  }

  const signature = _signature ?? (await signSignatureRequest(client, preparedCalls));
  const authorizationList = _authorizationList ?? (await signAuthorizationList(client));

  return await walletSendPreparedCalls(client, {
    context,
    signature,
    authorizationList,
    apiKey: client._internal.apiKey()
  });
}
