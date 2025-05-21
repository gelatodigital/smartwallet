import type { Account, Chain, Hex, Transport } from "viem";

import { type SignatureRequest, SignatureRequestType } from "../../relay/rpc/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function signSignatureRequest<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, signatureRequest: SignatureRequest) {
  let signature: Hex;

  if (signatureRequest.type === SignatureRequestType.TypedData) {
    signature = await client.signTypedData({
      account: client.account,
      ...signatureRequest.data
    });
  } else if (signatureRequest.type === SignatureRequestType.EthSign) {
    signature = await client.signMessage({
      account: client.account,
      message: { raw: signatureRequest.data }
    });
  } else {
    throw new Error("Unsupported signature request type");
  }

  return signature;
}
