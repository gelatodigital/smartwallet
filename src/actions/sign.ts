import type { Chain, Hex, Transport } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";

import type { GelatoSmartAccount } from "../accounts/index.js";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
import type { GelatoWalletClient } from "./index.js";
import { signSignatureRequest } from "./internal/signSignatureRequest.js";

/**
 *
 * @param client - Client.
 * @param preparedCalls - Prepared calls.
 * @returns Signature and authorization list.
 */
export async function sign<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  preparedCalls: WalletPrepareCallsResponse
): Promise<{ signature: Hex; authorizationList?: SignAuthorizationReturnType[] }> {
  const { context, signatureRequest } = preparedCalls;

  const userOp = "userOp" in context ? context.userOp : undefined;
  const signature = await signSignatureRequest(client, signatureRequest, userOp);

  const isDeployed = await client.account.isDeployed();
  const authorizationList =
    client.account.authorization && client.account.eip7702 && !isDeployed
      ? // smart account must implement "signAuthorization"
        [
          await client.signAuthorization({
            account: client.account.authorization.account,
            contractAddress: client.account.authorization.address
          })
        ]
      : undefined;

  return { signature, authorizationList };
}
