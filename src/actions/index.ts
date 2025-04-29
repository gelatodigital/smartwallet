import type { Account, Call, Chain, PublicActions, Transport, WalletClient } from "viem";

import type { Payment } from "../payment/index.js";
import type { GelatoResponse } from "../relay/response.js";
import { execute } from "./execute.js";

export type GelatoSmartWalletActions = {
  execute: (args: { payment: Payment; calls: Call[] }) => Promise<Hash>;
};

export function actions<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>
): GelatoSmartWalletActions {
  return {
    execute: (args) => execute(client, args)
  };
}
