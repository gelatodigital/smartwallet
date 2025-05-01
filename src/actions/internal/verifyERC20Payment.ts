import type { Account, Chain, Transport } from "viem";

import { abi as erc20Abi } from "../../abis/erc20.js";
import { getPaymentTokens } from "../../oracle/index.js";
import type { ERC20Payment } from "../../payment/index.js";
import { lowercase } from "../../utils/index.js";
import type { GelatoWalletClient } from "../index.js";

export async function verifyERC20Payment<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
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
