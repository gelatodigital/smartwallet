import type { Chain, Hex, Transport } from "viem";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { GelatoResponse } from "../relay/index.js";
import { walletSendPreparedCalls } from "../relay/rpc/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
import type { GelatoWalletClient } from "./index.js";
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
  parameters: { preparedCalls: WalletPrepareCallsResponse; signature?: Hex }
): Promise<GelatoResponse> {
  const {
    preparedCalls: { context, signatureRequest }
  } = structuredClone(parameters);

  const userOp = "userOp" in context ? context.userOp : undefined;
  const signature = parameters.signature ?? (await signSignatureRequest(client, signatureRequest, userOp));

  const authorizationList = client.account.authorization && client.account.eip7702
    ? // smart account must implement "signAuthorization"
      [
        await client.signAuthorization({
          account: client.account.authorization.account,
          contractAddress: client.account.authorization.address
        })
      ]
    : undefined;

  return await walletSendPreparedCalls(client, {
    context,
    signature,
    authorizationList
  });
}
