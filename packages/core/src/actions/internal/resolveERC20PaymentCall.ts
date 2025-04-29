import type { Account, Call, Chain, PublicActions, Transport, WalletClient } from "viem";
import { encodeFunctionData, formatUnits } from "viem";

import { abi as erc20Abi } from "../../abis/erc20.js";
import { getEstimatedFee } from "../../oracle/index.js";
import { type ERC20Payment, feeCollector } from "../../payment/index.js";
import { estimateGas } from "./estimateGas.js";
import { verifyERC20Payment } from "./verifyERC20Payment.js";

export async function resolveERC20PaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  payment: ERC20Payment,
  calls: Call[]
) {
  const paymentCall = (estimatedFee: bigint) => ({
    to: payment.token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [feeCollector(client.chain), estimatedFee]
    }),
    value: 0n
  });

  const [{ balance, decimals, symbol }, estimatedGas] = await Promise.all([
    verifyERC20Payment(client, payment),
    estimateGas(client, [...calls, paymentCall(1n)])
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

  return paymentCall(estimatedFee);
}
