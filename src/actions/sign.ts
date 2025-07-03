import type { Chain, Hex, Transport, WalletActions, WalletClient } from "viem";
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

  // IMPORTANT: this is required since `sign` is called in different
  // places(react, adapter, etc.) and React components, like Privy,
  // use JSON - RPC accounts which don't have the `signAuthorization`
  // method. If the account provides `signAuthorization`
  // we should use that and otherwise use `signAuthorization` from the client directly.
  const signAuthorization =
    "signAuthorization" in client.account
      ? (client.account.signAuthorization as WalletActions["signAuthorization"])
      : client.signAuthorization;

  const isDeployed = await client.account.isDeployed();
  const authorizationList =
    client.account.authorization && !isDeployed
      ? [
          await signAuthorization({
            account: client.account.authorization.account,
            contractAddress: client.account.authorization.address
          })
        ]
      : undefined;

  return { signature, authorizationList };
}
