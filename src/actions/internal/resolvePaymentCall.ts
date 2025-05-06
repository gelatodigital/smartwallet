import type { Account, Call, Chain, Transport } from "viem";
import { encodeFunctionData, erc20Abi, ethAddress, formatEther, formatUnits } from "viem";

import { feeCollector } from "../../constants/index.js";
import { getEstimatedFee } from "../../oracle/index.js";
import type { ERC20Payment, NativePayment, Payment } from "../../payment/index.js";
import type { GelatoWalletClient } from "../index.js";
import { verifyERC20Payment } from "./verifyERC20Payment.js";

export async function resolvePaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  payment: ERC20Payment | NativePayment,
  gas: bigint,
  l1Gas: bigint
): Promise<Call> {
  if (payment.type === "erc20") {
    const [{ balance, decimals, symbol }, estimatedFee] = await Promise.all([
      verifyERC20Payment(client, payment),
      getEstimatedFee(client.chain.id, payment.token, gas, l1Gas)
    ]);

    if (balance < estimatedFee) {
      throw new Error(
        `Insufficient balance of ${symbol} (${payment.token}): want ${formatUnits(
          estimatedFee,
          decimals
        )}, have ${formatUnits(balance, decimals)}`
      );
    }

    return {
      to: payment.token,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [feeCollector(client.chain.id), estimatedFee]
      })
    };
  }

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

export function resolveMockPaymentCalls<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, payment: Payment): Call[] {
  if (payment.type === "sponsored") {
    return [];
  }

  if (payment.type === "erc20") {
    return [
      {
        to: payment.token,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [feeCollector(client.chain.id), 1n]
        })
      }
    ];
  }

  return [
    {
      to: feeCollector(client.chain.id),
      value: 1n
    }
  ];
}
