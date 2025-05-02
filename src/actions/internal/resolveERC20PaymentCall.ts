import type { Account, Call, Chain, Transport } from "viem";
import { encodeFunctionData } from "viem";

import { abi as erc20Abi } from "../../abis/erc20.js";
import { feeCollector } from "../../constants/index.js";
import type { ERC20Payment } from "../../payment/index.js";
import type { GelatoWalletClient } from "../index.js";
import { getEstimates } from "./getEstimates.js";

export async function resolveERC20PaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, payment: ERC20Payment, calls: Call[]) {
  const paymentCall = (estimatedFee: bigint) => ({
    to: payment.token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [feeCollector(client.chain), estimatedFee]
    }),
    value: 0n
  });

  const { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas } = await getEstimates(
    client,
    payment,
    [...calls, paymentCall(1n)]
  );

  return {
    paymentCall: paymentCall(estimatedFee),
    estimatedFee,
    estimatedGas,
    estimatedExecutionGas,
    estimatedL1Gas
  };
}
