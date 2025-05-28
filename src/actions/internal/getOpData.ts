import { type Call, type Chain, type Transport, encodePacked } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import { serializeTypedData } from "../../utils/eip712.js";
import type { GelatoWalletClient } from "../index.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  calls: Call[],
  nonceKey: bigint,
  mock = false
) {
  if (!client.account.getNonce) {
    throw new Error("Account is not supported");
  }

  const nonce = await client.account.getNonce({
    key: nonceKey
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
