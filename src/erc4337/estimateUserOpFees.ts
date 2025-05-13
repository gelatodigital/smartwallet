import { type Account, type Chain, type Transport, ethAddress } from "viem";

import type { UserOperation } from "viem/account-abstraction";
import type { GelatoWalletClient } from "../actions/index.js";
import { getEstimatedFee } from "../oracle/index.js";
import type { Payment } from "../payment/index.js";

export async function estimateUserOpFees<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  _userOp: UserOperation,
  payment: Payment
): Promise<{
  estimatedFee: bigint;
  estimatedGas: bigint;
  estimatedL1Gas: bigint;
}> {
  // TODO: estimate rather than using hardcoded values
  const estimatedGas = 500_000n;
  const estimatedL1Gas = 0n;

  const paymentToken = payment.type === "erc20" ? payment.token : ethAddress;

  const estimatedFee = await getEstimatedFee(client.chain.id, paymentToken, estimatedGas);

  return {
    estimatedFee,
    estimatedGas,
    estimatedL1Gas
  };
}
