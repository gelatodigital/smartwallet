import type { Account, Call, Chain, Transport } from "viem";

import { type UserOperation, entryPoint07Abi, entryPoint07Address } from "viem/account-abstraction";
import { encodeExecuteData } from "viem/experimental/erc7821";
import type { GelatoWalletClient } from "../actions/index.js";

export async function getPartialUserOp<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]): Promise<UserOperation> {
  // for kernel version >=0.3.1
  const ECDSAValidatorKey = BigInt("0x0000845ADb2C711129d4f3966735eD98a9F09fC4cE570000");

  const nonce = await client.readContract({
    address: entryPoint07Address,
    abi: entryPoint07Abi,
    functionName: "getNonce",
    args: [client.account.address, ECDSAValidatorKey]
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
