import { type Account, Call, type Chain, type Transport, encodeFunctionData } from "viem";

import {
  type UserOperation,
  entryPoint07Abi,
  entryPoint07Address,
  toPackedUserOperation
} from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";
import { feeCollector } from "../constants/index.js";

export function encodeHandleOpsCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, userOp: UserOperation) {
  const packedUserOp = toPackedUserOperation(userOp);

  const data = encodeFunctionData({
    abi: entryPoint07Abi,
    functionName: "handleOps",
    args: [[packedUserOp], feeCollector(client.chain.id)]
  });

  return {
    to: entryPoint07Address,
    data
  };
}
