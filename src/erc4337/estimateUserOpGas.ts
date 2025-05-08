import type { Account, Chain, Transport } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";

export async function estimateUserOpGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(_client: GelatoWalletClient<transport, chain, account>, _userOp: UserOperation) {}
