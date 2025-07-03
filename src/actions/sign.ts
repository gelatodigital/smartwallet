import type { Chain, Hex, Transport, WalletClient } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";

import { type SmartAccount, formatUserOperation } from "viem/account-abstraction";
import type { WalletPrepareCallsResponse } from "../relay/rpc/interfaces/index.js";
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
  account extends SmartAccount = SmartAccount
>(
  client: WalletClient<transport, chain, account>,
  preparedCalls: WalletPrepareCallsResponse
): Promise<{ signature: Hex; authorizationList?: SignAuthorizationReturnType[] }> {
  const { context, signatureRequest } = preparedCalls;

  const userOp = "userOp" in context ? formatUserOperation(context.userOp) : undefined;
  const signature = await signSignatureRequest(client, signatureRequest, userOp);

  const isDeployed = await client.account.isDeployed();
  const authorizationList =
    client.account.authorization && !isDeployed
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
