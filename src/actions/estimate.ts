import type { Account, Call, Chain, Transport } from "viem";

import { type Payment, isErc20, isNative, sponsored } from "../payment/index.js";
import type { GelatoWalletClient } from "./index.js";
import { getEstimates } from "./internal/getEstimates.js";
import { resolveERC20PaymentCall } from "./internal/resolveERC20PaymentCall.js";
import { resolveNativePaymentCall } from "./internal/resolveNativePaymentCall.js";
import { verifyAuthorization } from "./internal/verifyAuthorization.js";

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
): Promise<{
  estimatedFee: bigint;
  estimatedGas: bigint;
  estimatedExecutionGas: bigint;
  estimatedL1Gas: bigint;
}> {
  const { payment, calls } = structuredClone(parameters);

  await verifyAuthorization(client);

  if (isErc20(payment)) {
    const { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas } =
      await resolveERC20PaymentCall(client, payment, calls);
    return { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas };
  }

  if (isNative(payment)) {
    const { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas } =
      await resolveNativePaymentCall(client, calls);
    return { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas };
  }

  const { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas } = await getEstimates(
    client,
    sponsored(),
    calls
  );

  delete client._internal.inflight;

  return { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas };
}
