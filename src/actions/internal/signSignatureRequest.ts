import type { Chain, Hex, Transport, WalletClient } from "viem";
import type { SmartAccount, UserOperation } from "viem/account-abstraction";

import { type SignatureRequest, SignatureRequestType } from "../../relay/rpc/index.js";

export async function signSignatureRequest<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(
  client: WalletClient<transport, chain, account>,
  signatureRequest: SignatureRequest,
  userOp?: UserOperation
) {
  let signature: Hex;

  if (signatureRequest.type === SignatureRequestType.TypedData) {
    signature = await client.signTypedData({
      account: client.account,
      ...signatureRequest.data
    });
  } else if (signatureRequest.type === SignatureRequestType.UserOperation) {
    if (!userOp) {
      throw new Error(
        "Internal error: UserOperation is required for UserOperation signature request"
      );
    }
    signature = await client.account.signUserOperation(userOp);
    // Notice: EthSign is being treated as being the same as PersonalSign
    // This is to maintain backwards compatibility, EthSign will be deprecated in the future
  } else if (
    signatureRequest.type === SignatureRequestType.EthSign ||
    signatureRequest.type === SignatureRequestType.PersonalSign
  ) {
    signature = await client.signMessage({
      account: client.account,
      message: { raw: signatureRequest.data }
    });
  } else {
    throw new Error("Unsupported signature request type");
  }

  return signature;
}
