import { type Account, type Call, type Chain, type Transport, hexToBigInt } from "viem";

import { nonceStorageSlot } from "../../constants/index.js";
import { serializeTypedData } from "../../utils/eip712.js";
import type { GelatoWalletClient } from "../index.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  const nonceHex = await client.getStorageAt({
    address: client.account.address,
    slot: nonceStorageSlot()
  });

  if (!nonceHex) {
    throw new Error("Failed to get nonce");
  }

  const nonce = hexToBigInt(nonceHex);

  return serializeTypedData(client.chain.id, client.account.address, "opData", calls, nonce);
}
