import type { Account, Call, Chain, Transport } from "viem";

import { type UserOperation, entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
import { encodeExecuteData } from "viem/experimental/erc7821";
import type { GelatoWalletClient } from "../actions/index.js";
import { kernelECDSAValidatorKey } from "../constants/index.js";

export async function getPartialUserOp<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]): Promise<UserOperation> {
  const nonce = await client.readContract({
    address: entryPoint07Address,
    abi: entryPoint07Abi,
    functionName: "getNonce",
    args: [client.account.address, kernelECDSAValidatorKey()]
  });

  return {
    callData: encodeExecuteData({ calls }),
    nonce,
    sender: client.account.address,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    // TODO: binary search instead of hardcoding gas limits
    preVerificationGas: 100_000n,
    verificationGasLimit: 300_000n,
    callGasLimit: 100_000n,
    signature: "0x"
  };
}
