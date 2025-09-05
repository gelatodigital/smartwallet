import type { Chain, Hex, Transport, WalletClient } from "viem";
import { formatUserOperation, type SmartAccount } from "viem/account-abstraction";

import { SignatureRequestType, type WalletPrepareCallsResponse } from "../../relay/rpc/index.js";

export async function signSignatureRequest<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: WalletClient<transport, chain, account>, preparedCalls: WalletPrepareCallsResponse) {
  const { context, signatureRequest } = preparedCalls;

  const userOp = "userOp" in context ? formatUserOperation(context.userOp) : undefined;

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
