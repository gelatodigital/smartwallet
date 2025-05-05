import { type Account, type Call, type Chain, type Transport, ethAddress } from "viem";

import { getEstimatedFee } from "../oracle/index.js";
import type { Payment } from "../payment/index.js";
import type { GelatoWalletClient } from "./index.js";
import { estimateGas } from "./internal/estimateGas.js";
import { resolveMockPaymentCall } from "./internal/resolvePaymentCall.js";
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
  estimatedL1Gas: bigint;
}> {
  const { payment, calls } = parameters;

  await verifyAuthorization(client);

  if (payment.type === "erc20") {
    calls.push(resolveMockPaymentCall(client, payment));
  }

  if (client._internal.erc4337) {
    throw new Error("ERC4337 estimation not yet supported");
  }

  const { estimatedGas, estimatedL1Gas } = await estimateGas(client, calls);

  const estimatedFee = await getEstimatedFee(
    client.chain.id,
    payment.type === "erc20" ? payment.token : ethAddress,
    estimatedGas,
    estimatedL1Gas
  );

  delete client._internal.inflight;

  return {
    estimatedFee,
    estimatedGas,
    estimatedL1Gas
  };
}
