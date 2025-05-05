import type { Account, Call, Chain, Transport } from "viem";
import { encodeFunctionData, erc20Abi, formatUnits } from "viem";

import { feeCollector } from "../../constants/index.js";
import { getEstimatedFee } from "../../oracle/index.js";
import type { ERC20Payment } from "../../payment/index.js";
import type { GelatoWalletClient } from "../index.js";
import { verifyERC20Payment } from "./verifyERC20Payment.js";

export async function resolvePaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  payment: ERC20Payment,
  gas: bigint,
  l1Gas: bigint
): Promise<Call> {
  const { balance, decimals, symbol } = await verifyERC20Payment(client, payment);

  const estimatedFee = await getEstimatedFee(client.chain.id, payment.token, gas, l1Gas);

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

export function resolveMockPaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, payment: ERC20Payment): Call {
  return {
    to: payment.token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [feeCollector(client.chain.id), 1n]
    })
  };
}
