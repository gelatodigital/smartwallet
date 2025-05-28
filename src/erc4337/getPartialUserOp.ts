import { encodeFunctionData, encodePacked } from "viem";
import type { Call, Chain, Transport } from "viem";
import type { SmartAccount, UserOperation } from "viem/account-abstraction";

import { encodeCalls } from "viem/experimental/erc7821";
import { delegationAbi as abi } from "../abis/delegation.js";
import type { GelatoWalletClient } from "../actions/index.js";
import { mode } from "../constants/index.js";

const MOCK_SIGNATURE =
  "0x578a956c04cac0db87212ba62d98f49270dce9372449f6a68e8a97e7d75597233d9fd7d49f627eae7ec061681cba5732aea2c77566faad9a8d736e3967d3c5031b";

export async function getPartialUserOp<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]): Promise<UserOperation> {
  if (!client.account.getNonce) {
    throw new Error("getNonce is not implemented");
  }

  const nonce = await client.account.getNonce();
  const isDeployed = await client.account.isDeployed();

  const executionMode =
    calls.length === 1 && client._internal.wallet.type === "kernel"
      ? mode("single")
      : mode("default");

  const calldata =
    calls.length === 1 && client._internal.wallet.type === "kernel"
      ? encodePacked(
          ["address", "uint256", "bytes"],
          [calls[0].to, calls[0].value || 0n, calls[0].data || "0x"]
        )
      : encodeCalls(calls);

  return {
    callData: encodeFunctionData({
      abi,
      functionName: "execute",
      args: [executionMode, calldata]
    }),
    ...(isDeployed ? {} : await client.account.getFactoryArgs()),
    nonce,
    sender: client.account.address,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    preVerificationGas: 0n,
    verificationGasLimit: 0n,
    callGasLimit: 0n,
    signature: MOCK_SIGNATURE
  };
}
