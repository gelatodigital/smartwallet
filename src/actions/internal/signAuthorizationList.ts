import type { Account, Chain, Transport } from "viem";
import type { GelatoWalletClient } from "../index.js";

export async function signAuthorizationList<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, mock = false) {
  if (!client.account.authorization) {
    throw new Error("Account is not supported");
  }

  if (mock) {
    return [
      await client._internal.mock.signer.signAuthorization({
        contractAddress: client.account.authorization.address,
        chainId: client.chain.id,
        nonce: 0
      })
    ];
  }

  return [
    await client.signAuthorization({
      account: client.account.authorization.account, // internal account is needed since wrapper might not have the "signAuthorization"
      contractAddress: client.account.authorization.address
    })
  ];
}
