import {
  type Account,
  type Call,
  type Chain,
  type PublicActions,
  type Transport,
  type WalletClient,
  encodeAbiParameters,
  encodePacked,
  hexToBigInt,
  keccak256,
  parseAbiParameters,
  toHex
} from "viem";
import { STORAGE_LOCATION } from "../../constants/index.js";
import { serializeTypedData } from "../../utils/eip712.js";

export async function getOpData<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  calls: Call[],
  nonceKey?: string
) {
  let nonceKeyInt: bigint;

  if (nonceKey) {
    const nonceKeyHash = keccak256(toHex(nonceKey));
    nonceKeyInt = BigInt(`0x${nonceKeyHash.substring(2, 50)}`); // Nonce key is 24 bytes, hence we need to truncate nonceKeyHash.
  } else {
    nonceKeyInt = 0n;
  }

  // Get the storage slot for nonceSequenceNumber[nonceKey]
  const nonceSequenceNumberSlot = keccak256(
    encodeAbiParameters(parseAbiParameters("uint192, bytes32"), [nonceKeyInt, STORAGE_LOCATION])
  );

  const sequenceNumberHex = await client.getStorageAt({
    address: client.account.address,
    slot: nonceSequenceNumberSlot
  });
  if (!sequenceNumberHex) {
    throw new Error("Failed to get nonce");
  }
  const sequenceNumberInt = hexToBigInt(sequenceNumberHex);

  const encodedNonce = encodePacked(["uint192", "uint64"], [nonceKeyInt, sequenceNumberInt]);
  const nonce = hexToBigInt(encodedNonce);

  const typedData = serializeTypedData(client.chain.id, client.account.address, calls, nonce);

  // TODO: add support for passkey signers
  const signature = await client.signTypedData({
    account: client.account,
    ...typedData
  });

  return encodePacked(["uint256", "bytes"], [nonce, signature]);
}
