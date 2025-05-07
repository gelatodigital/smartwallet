import { type Account, type Call, type Chain, type Transport, encodePacked } from "viem";

import { delegationAbi } from "../../abis/delegation.js";
import { serializeTypedData } from "../../utils/eip712.js";
import type { GelatoWalletClient } from "../index.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[], nonceKey: bigint) {
  const nonce = await client.readContract({
    address: client.account.address,
    abi: delegationAbi,
    functionName: "getNonce",
    args: [nonceKey]
  });

  const typedData = serializeTypedData(
    client.chain.id,
    client.account.address,
    "opData",
    calls,
    nonce
  );

  const signature = await client.signTypedData({
    account: client.account,
    ...typedData
  });

  return encodePacked(["uint256", "bytes"], [nonce, signature]);
}
