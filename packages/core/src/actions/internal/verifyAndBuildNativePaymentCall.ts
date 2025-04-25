import type { Account, Chain, PublicActions, Transport, WalletClient } from "viem";
import { ethAddress, formatEther } from "viem";
import { getEstimatedFee } from "../../oracle/index.js";
import { feeCollector } from "../../payment/index.js";

export async function verifyAndBuildNativePaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>) {
  const [estimatedFee, balance] = await Promise.all([
    getEstimatedFee(
      client.chain.id,
      ethAddress,
      // TODO: dynamic gas limit
      200000n,
      0n
    ),
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
