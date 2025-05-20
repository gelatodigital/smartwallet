import type { Account, Chain, Hex, Transport } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";

export async function signUserOp<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, userOp: UserOperation): Promise<Hex> {
  if (!client.account.signUserOperation) {
    throw new Error("signUserOperation is not supported");
  }

  return client.account.signUserOperation({
    chainId: client.chain.id,
    ...userOp
  });
}
