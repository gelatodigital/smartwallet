import type { Account, Call, Chain, Transport } from "viem";
import { encodeFunctionData, erc20Abi, formatEther, formatUnits } from "viem";

import type { ERC20Payment, NativePayment } from "../../payment/index.js";
import { feeCollector } from "../../relay/rpc/utils/networkCapabilities.js";
import type { GelatoWalletClient } from "../index.js";
import { verifyERC20Payment } from "./verifyERC20Payment.js";

export async function resolvePaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  payment: ERC20Payment | NativePayment,
  estimatedFee: bigint,
  verify = false
): Promise<Call> {
  if (payment.type === "erc20") {
    if (verify) {
      const { balance, decimals, symbol } = await verifyERC20Payment(client, payment);

      if (balance < estimatedFee) {
        throw new Error(
          `Insufficient balance of ${symbol} (${payment.token}): want ${formatUnits(
            estimatedFee,
            decimals
          )}, have ${formatUnits(balance, decimals)}`
        );
      }
    }

    return {
      to: payment.token,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [feeCollector(client), estimatedFee]
      })
    };
  }

  if (verify) {
    const balance = await client.getBalance({ address: client.account.address });

    if (balance < estimatedFee) {
      throw new Error(
        `Insufficient native balance: want ${formatEther(estimatedFee)}, have ${formatEther(balance)}`
      );
    }
  }

  return {
    to: feeCollector(client),
    value: estimatedFee
  };
}
