import type { Account, Chain, Transport } from "viem";
import type { GelatoWalletClient } from "../index.js";

export async function signAuthorizationList<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, mock = false) {
  if (!client._internal.delegation) {
    throw new Error("Internal error: signAuthorizationList: Delegation has not been set up");
  }

  if (mock) {
    return [
      await client._internal.mock.signer.signAuthorization({
        contractAddress: client._internal.delegation.address,
        chainId: client.chain.id,
        nonce: 0
      })
    ];
  }

  return [
    await client.signAuthorization({
      account: client.account,
      contractAddress: client._internal.delegation.address
    })
  ];
}
