import type { Account, Call, Chain, PublicActions, Transport, WalletClient } from "viem";
import { parseAbi } from "viem";
import { encodeCalls } from "viem/experimental/erc7821";

import { mode } from "../../constants/index.js";

export async function estimateGas<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  calls: Call[]
) {
  return await client.estimateContractGas({
    address: client.account.address,
    abi: parseAbi([
      "function execute(bytes32 mode, bytes calldata executionData) external payable"
    ]),
    functionName: "execute",
    args: [mode("default"), encodeCalls(calls)]
  });
}
