import type { Chain, Transport, WalletClient } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import type { SignAuthorizationReturnType } from "viem/accounts";
import { signAuthorization as viem_signAuthorization } from "viem/actions";

/**
 *
 * @param client - Client.
 * @returns Sign authorization list.
 */
export async function signAuthorizationList<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: WalletClient<transport, chain, account>
): Promise<SignAuthorizationReturnType[] | undefined> {
  const isDeployed = await client.account.isDeployed();
  const authorizationList =
    client.account.authorization && !isDeployed
      ? [
          await viem_signAuthorization(client, {
            account: client.account.authorization.account,
            contractAddress: client.account.authorization.address
          })
        ]
      : undefined;

  return authorizationList;
}
