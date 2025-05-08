import type { Account, Call, Chain, Transport } from "viem";
import { ethAddress, formatEther } from "viem";

import { feeCollector } from "../../constants/index.js";
import { getEstimatedFee } from "../../oracle/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function resolveNativePaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  gas: bigint,
  l1Gas: bigint
): Promise<Call> {
  const [balance, estimatedFee] = await Promise.all([
    client.getBalance({ address: client.account.address }),
    getEstimatedFee(client.chain.id, ethAddress, gas, l1Gas)
  ]);

  if (balance < estimatedFee) {
    throw new Error(
      `Insufficient native balance: want ${formatEther(estimatedFee)}, have ${formatEther(balance)}`
    );
  }

  return {
    to: feeCollector(client.chain.id),
    value: estimatedFee
  };
}
