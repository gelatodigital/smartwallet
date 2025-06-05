import type { Chain, Hex, Transport } from "viem";
import type { UserOperation } from "viem/account-abstraction";

import type { GelatoSmartAccount } from "../../accounts/index.js";
import { type SignatureRequest, SignatureRequestType } from "../../relay/rpc/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function signSignatureRequest<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  client: GelatoWalletClient<transport, chain, account>,
  signatureRequest: SignatureRequest,
  userOp?: UserOperation
) {
  let signature: Hex;

  if (signatureRequest.type === SignatureRequestType.TypedData) {
    console.log("signing with account: ", client.account.address);
    signature = await client.signTypedData({
      account: client.account,
      ...signatureRequest.data
    });
    console.log("signature: ", signature);
  } else if (signatureRequest.type === SignatureRequestType.UserOperation) {
    if (!userOp) {
      throw new Error(
        "Internal error: UserOperation is required for UserOperation signature request"
      );
    }
    signature = await client.account.signUserOperation(userOp);
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
