import type { Account, Call, Chain, Transport } from "viem";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { GelatoWalletClient } from "../index.js";
import { getOpData } from "./getOpData.js";

export async function getMockSignedOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  if (client._internal.inflight?.mockOpData) {
    return client._internal.inflight.mockOpData;
  }

  // mock signature
  const mockOpData = await privateKeyToAccount(generatePrivateKey()).signTypedData({
    ...(await getOpData(client, calls))
  });

  Object.assign(client._internal, { inflight: { mockOpData } });

  return mockOpData;
}
