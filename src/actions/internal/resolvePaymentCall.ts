import type { Account, Call, Chain, Transport } from "viem";
import { encodeFunctionData, erc20Abi } from "viem";

import { feeCollector } from "../../constants/index.js";
import type { ERC20Payment, NativePayment, Payment } from "../../payment/index.js";
import type { GelatoWalletClient } from "../index.js";
import { resolveERC20PaymentCall } from "./resolveERC20PaymentCall.js";
import { resolveNativePaymentCall } from "./resolveNativePaymentCall.js";

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
    return resolveERC20PaymentCall(client, payment, gas, l1Gas);
  }
  return resolveNativePaymentCall(client, gas, l1Gas);
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
