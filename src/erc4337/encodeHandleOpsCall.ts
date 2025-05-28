import { type Chain, type Transport, encodeFunctionData } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import {
  type UserOperation,
  entryPoint07Abi,
  entryPoint07Address,
  toPackedUserOperation
} from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";
import { feeCollector } from "../relay/rpc/utils/networkCapabilities.js";

export function encodeHandleOpsCall(userOp: UserOperation) {
  // Static EOA beneficiary (defining a no code EOA is cheaper)
  // There's no usage of the beneficiary, it does not collect any fees
  const beneficiary = "0xE501e71C06c7d62fFe0cc84d100b732f364aBd91";

  const data = encodeFunctionData({
    abi: entryPoint07Abi,
    functionName: "handleOps",
    args: [[toPackedUserOperation(userOp)], feeCollector(client)]
  });

  return {
    to: entryPoint07Address,
    data
  };
}
