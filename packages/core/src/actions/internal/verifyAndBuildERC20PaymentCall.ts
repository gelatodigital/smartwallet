import type { Account, Chain, PublicActions, Transport, WalletClient } from "viem";
import { encodeFunctionData, formatUnits, parseAbi } from "viem";

import { abi as erc20Abi } from "../../abis/erc20.js";
import { getEstimatedFee, getPaymentTokens } from "../../oracle/index.js";
import { type ERC20Payment, feeCollector } from "../../payment/index.js";
import { lowercase } from "../../utils/index.js";

export async function verifyAndBuildERC20PaymentCall<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: WalletClient<transport, chain, account> & PublicActions<transport, chain, account>,
  payment: ERC20Payment
) {
  const [tokens, estimatedFee, [balance, decimals]] = await Promise.all([
    getPaymentTokens(client.chain.id),
    getEstimatedFee(
      client.chain.id,
      payment.token,
      // TODO: dynamic gas limit
      100000n,
      0n
    ),
    client.multicall({
      contracts: [
        {
          address: payment.token,
          abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
          functionName: "balanceOf",
          args: [client.account.address]
        },
        {
          address: payment.token,
          abi: parseAbi(["function decimals() view returns (uint8)"]),
          functionName: "decimals",
          args: []
        }
      ],
      allowFailure: false
    })
  ]);

  const isPaymentTokenAllowed = tokens.some(
    (token) => lowercase(token) === lowercase(payment.token)
  );

  if (!isPaymentTokenAllowed) {
    throw new Error(
      `Token ${payment.token} is not allowed to be used as a payment token on ${client.chain.name}. Available tokens: ${tokens.join(", ")}`
    );
  }

  if (balance < estimatedFee) {
    throw new Error(
      `Insufficient balance of token ${payment.token}: want ${formatUnits(estimatedFee, decimals)}, have ${formatUnits(balance, decimals)}`
    );
  }

  return {
    to: payment.token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [feeCollector(client.chain), estimatedFee]
    }),
    value: 0n
  };
}
