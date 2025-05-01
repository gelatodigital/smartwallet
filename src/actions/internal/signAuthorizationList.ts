import type { Account, Chain, Transport } from "viem";

import { delegation } from "../../constants/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function signAuthorizationList<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>) {
  return [
    await client.signAuthorization({
      account: client.account,
      contractAddress: delegation(client.chain.id)
    })
  ];
}
