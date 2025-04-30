import type { Account, Call, Chain, Transport } from "viem";

import { type Payment, isErc20, isNative, sponsored } from "../payment/index.js";
import type { GelatoWalletClient } from "./index.js";
import { getEstimates } from "./internal/getEstimates.js";
import { resolveERC20PaymentCall } from "./internal/resolveERC20PaymentCall.js";
import { resolveNativePaymentCall } from "./internal/resolveNativePaymentCall.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 * TODO: Account for authorization list
 */
export async function estimate<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[] }
): Promise<{ estimatedFee: bigint; estimatedGas: bigint }> {
  const { payment, calls } = parameters;

  if (isErc20(payment)) {
    const { estimatedFee, estimatedGas } = await resolveERC20PaymentCall(client, payment, calls);
    return { estimatedFee, estimatedGas };
  }

  if (isNative(payment)) {
    const { estimatedFee, estimatedGas } = await resolveNativePaymentCall(client, calls);
    return { estimatedFee, estimatedGas };
  }

  const { estimatedFee, estimatedGas } = await getEstimates(client, sponsored(), calls);
  return { estimatedFee, estimatedGas };
}
