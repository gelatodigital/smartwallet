import type { Account, Call, Chain, Transport } from "viem";
import { ethAddress, formatEther, formatUnits } from "viem";

import { isErc20, isNative } from "../../payment/index.js";

import { getEstimatedFee } from "../../oracle/index.js";
import type { Payment } from "../../payment/index.js";
import type { GelatoWalletClient } from "../index.js";
import { estimateGas } from "./estimateGas.js";
import { verifyERC20Payment } from "./verifyERC20Payment.js";

export async function getEstimates<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, payment: Payment, calls: Call[]) {
  if (isErc20(payment)) {
    const [{ balance, decimals, symbol }, estimatedGas] = await Promise.all([
      verifyERC20Payment(client, payment),
      estimateGas(client, calls)
    ]);

    const estimatedFee = await getEstimatedFee(client.chain.id, payment.token, estimatedGas, 0n);

    if (balance < estimatedFee) {
      throw new Error(
        `Insufficient balance of ${symbol} (${payment.token}): want ${formatUnits(
          estimatedFee,
          decimals
        )}, have ${formatUnits(balance, decimals)}`
      );
    }

    return { estimatedFee, estimatedGas };
  }

  if (isNative(payment)) {
    const estimatedGas = await estimateGas(client, calls);

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

    return { estimatedFee, estimatedGas };
  }

  const estimatedGas = await estimateGas(client, calls);
  const estimatedFee = await getEstimatedFee(client.chain.id, ethAddress, estimatedGas, 0n);

  return { estimatedFee, estimatedGas };
}
