import type { Account, Chain, Hex, Transport } from "viem";

import {
  type UserOperation,
  entryPoint07Address,
  getUserOperationHash
} from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";

export async function signUserOp<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, userOp: UserOperation): Promise<Hex> {
  const hash = getUserOperationHash({
    chainId: client.chain.id,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    userOperation: userOp
  });

  return client.signMessage({
    account: client.account,
    message: { raw: hash }
  });
}
