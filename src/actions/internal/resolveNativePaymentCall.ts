import type { Account, Call, Chain, PublicActions, Transport, WalletClient } from "viem";
import { ethAddress, formatEther } from "viem";

import { getEstimatedFee } from "../../oracle/index.js";
import { feeCollector } from "../../constants/index.js";
import { estimateGas } from "./estimateGas.js";

export async function resolveNativePaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  calls: Call[]
) {
  const paymentCall = (estimatedFee: bigint) => ({
    to: feeCollector(client.chain),
    value: estimatedFee
  });

  const estimatedGas = await estimateGas(client, [...calls, paymentCall(1n)]);

  const [estimatedFee, balance] = await Promise.all([
    getEstimatedFee(client.chain.id, ethAddress, estimatedGas, 0n),
    client.getBalance({
      address: client.account.address
    })
  ]);

  if (balance < estimatedFee) {
    throw new Error(
      `Insufficient native balance: want ${formatEther(estimatedFee)}, have ${formatEther(balance)}`
    );
  }

  return {
    to: feeCollector(client.chain),
    value: estimatedFee
  };
}
