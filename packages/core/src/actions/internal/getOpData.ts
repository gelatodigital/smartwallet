import {
  type Account,
  type Call,
  type Chain,
  type PublicActions,
  type Transport,
  type WalletClient,
  hexToBigInt
} from "viem";

import { NONCE_STORAGE_SLOT } from "../../constants/index.js";
import { serializeTypedData } from "../../utils/eip712.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  calls: Call[]
) {
  const nonceHex = await client.getStorageAt({
    address: client.account.address,
    slot: NONCE_STORAGE_SLOT
  });

  if (!nonceHex) {
    throw new Error("Failed to get nonce");
  }

  const nonce = hexToBigInt(nonceHex);

  const typedData = serializeTypedData(client.chain.id, client.account.address, calls, nonce);

  // TODO: add support for passkey signers
  return await client.signTypedData({
    account: client.account,
    ...typedData
  });
}
