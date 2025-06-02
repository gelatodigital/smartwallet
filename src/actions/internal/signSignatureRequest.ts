import type { Chain, Transport } from "viem";

import type { GelatoSmartAccount } from "../../accounts/index.js";
import { type SignatureRequest, SignatureRequestType } from "../../relay/rpc/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function signSignatureRequest<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(client: GelatoWalletClient<transport, chain, account>, signatureRequest: SignatureRequest) {
  if (signatureRequest.type === SignatureRequestType.TypedData)
    return client.account.signTypedData(signatureRequest.data);

  if (signatureRequest.type === SignatureRequestType.EthSign)
    return client.account.signMessage({ message: { raw: signatureRequest.data } });

  if (signatureRequest.type === SignatureRequestType.UserOperation)
    return client.account.signUserOperation(signatureRequest.data);

  throw new Error("Unsupported signature request type");
}
