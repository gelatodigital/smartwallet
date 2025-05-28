import { type Chain, type Transport, erc20Abi } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import { getPaymentTokens } from "../../oracle/index.js";
import type { ERC20Payment } from "../../payment/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function verifyERC20Payment<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends SmartAccount = SmartAccount
>(client: GelatoWalletClient<transport, chain, account>, payment: ERC20Payment) {
  const [tokens, [balance, decimals, symbol]] = await Promise.all([
    getPaymentTokens(client.chain.id),
    client.multicall({
      contracts: [
        {
          address: payment.token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [client.account.address]
        },
        {
          address: payment.token,
          abi: erc20Abi,
          functionName: "decimals",
          args: []
        },
        {
          address: payment.token,
          abi: erc20Abi,
          functionName: "symbol",
          args: []
        }
      ],
      allowFailure: false
    })
  ]);

  if (!tokens.some((token) => lowercase(token) === lowercase(payment.token))) {
    throw new Error(
      `Token ${symbol} (${payment.token}) is not allowed to be used as a payment token on ${
        client.chain.name
      }. Available tokens: ${tokens.join(", ")}`
    );
  }

  return { balance, decimals, symbol };
}
