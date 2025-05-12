import { type Account, type Call, type Chain, type Transport } from "viem";

import type { Payment } from "../payment/index.js";
import type { GelatoWalletClient } from "./index.js";
import { resolvePaymentCall } from "./internal/resolvePaymentCall.js";
import { verifyAuthorization } from "./internal/verifyAuthorization.js";
import { estimateFees } from "./internal/estimateFees.js";
import { estimateUserOpFees } from "../erc4337/estimateUserOpFees.js";
import { getPartialUserOp } from "../erc4337/getPartialUserOp.js";
import { estimateUserOpGas } from "../erc4337/estimateUserOpGas.js";

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
  estimatedL1Gas: bigint;
}> {
  const { payment, calls } = structuredClone(parameters);

  await verifyAuthorization(client);

  if (payment.type === "erc20" || payment.type === "native")
    calls.push(await resolvePaymentCall(client, payment, 1n, false));

  if (client._internal.erc4337) {
    let userOp = await getPartialUserOp(client, calls);

    userOp = {
      ...userOp,
      ...(await estimateUserOpGas(client, userOp))
    };

    const { estimatedFee, estimatedGas, estimatedL1Gas } = await estimateUserOpFees(
      client,
      userOp,
      payment
    );

    return {
      estimatedFee,
      estimatedGas,
      estimatedL1Gas
    };
  }

  return estimateFees(client, calls, payment);
}
