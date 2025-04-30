import type { Account, Call, Chain, Transport } from "viem";

import { feeCollector } from "../../constants/index.js";
import { native } from "../../payment/index.js";
import type { GelatoWalletClient } from "../index.js";
import { getEstimates } from "./getEstimates.js";

export async function resolveNativePaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, calls: Call[]) {
  const paymentCall = (estimatedFee: bigint) => ({
    to: feeCollector(client.chain),
    value: estimatedFee
  });

  const { estimatedFee, estimatedGas } = await getEstimates(client, native(), [
    ...calls,
    paymentCall(1n)
  ]);

  return { paymentCall: paymentCall(estimatedFee), estimatedFee, estimatedGas };
}
