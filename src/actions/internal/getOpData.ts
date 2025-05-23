import { type Account, type Call, type Chain, type Transport, encodePacked } from "viem";

import { delegationAbi } from "../../abis/delegation.js";
import { delegationCode } from "../../constants/index.js";
import { serializeTypedData } from "../../utils/eip712.js";
import { addDelegationOverride } from "../../utils/estimation.js";
import type { GelatoWalletClient } from "../index.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  calls: Call[],
  nonceKey: bigint,
  mock = false
) {
  const nonce = await client.readContract({
    address: client.account.address,
    abi: delegationAbi,
    functionName: "getNonce",
    args: [nonceKey],
    stateOverride: addDelegationOverride(client)
  });

  const typedData = serializeTypedData(
    client.chain.id,
    client.account.address,
    "opData",
    calls,
    nonce
  );

  const signature = mock
    ? await client._internal.mock.signer.signTypedData({ ...typedData })
    : await client.signTypedData({ account: client.account, ...typedData });

  return encodePacked(["uint192", "bytes"], [nonceKey, signature]);
}
