import type { Chain, Hex, Transport } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { SponsoredPayment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletSendPreparedCalls } from "../relay/rpc/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
import { walletSendCalls } from "../relay/rpc/sendCalls.js";
import type { GelatoWalletClient } from "./index.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";
import { signSignatureRequest } from "./internal/signSignatureRequest.js";

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
  parameters:
    | {
        preparedCalls: WalletPrepareCallsResponse;
        signature?: Hex;
        authorizationList?: SignAuthorizationReturnType[];
      }
    | { data: Hex; payment: SponsoredPayment; authorizationList?: SignAuthorizationReturnType[] }
): Promise<GelatoResponse> {
  if ("data" in parameters) {
    const { data, payment, authorizationList: _authorizationList } = parameters;

    const authorizationList = _authorizationList ?? (await signAuthorizationList(client));

    return await walletSendCalls(client, {
      from: client.account.address,
      data,
      payment,
      authorizationList,
      apiKey: client._internal.apiKey()
    });
  }

  const {
    preparedCalls,
    signature: _signature,
    authorizationList: _authorizationList
  } = parameters;
  const { context } = preparedCalls;

  const signature = _signature ?? (await signSignatureRequest(client, preparedCalls));
  const authorizationList = _authorizationList ?? (await signAuthorizationList(client));

  return await walletSendPreparedCalls(client, {
    context,
    signature,
    authorizationList,
    apiKey: client._internal.apiKey()
  });
}
