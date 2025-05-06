import type { Account, Call, Chain, Transport } from "viem";

import { delegationAbi } from "../../abis/delegation.js";
import { serializeTypedData } from "../../utils/eip712.js";
import type { GelatoWalletClient } from "../index.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  const nonce = await client.readContract({
    address: client.account.address,
    abi: delegationAbi,
    functionName: "getNonce"
  });

  return serializeTypedData(client.chain.id, client.account.address, "opData", calls, nonce);
}
