import type { Account, Call, Chain, Transport } from "viem";
import { ethAddress, formatEther, formatUnits } from "viem";
import { encodeExecuteData } from "viem/experimental/erc7821";

import { getEstimatedFee } from "../../oracle/index.js";
import { isErc20, isNative } from "../../payment/index.js";
import type { Payment } from "../../payment/index.js";
import type { GelatoWalletClient } from "../index.js";
import { estimateGas } from "./estimateGas.js";
import { getMockSignedOpData } from "./getMockSignedOpData.js";
import { verifyERC20Payment } from "./verifyERC20Payment.js";

export async function getEstimates<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(client: GelatoWalletClient<transport, chain, account>, payment: Payment, calls: Call[]) {
  if (isErc20(payment)) {
    const [{ balance, decimals, symbol }, { estimatedExecutionGas, estimatedL1Gas, estimatedGas }] =
      await Promise.all([verifyERC20Payment(client, payment), estimateGas(client, calls)]);

    const estimatedFee = await getEstimatedFee(
      client.chain.id,
      payment.token,
      estimatedExecutionGas,
      estimatedL1Gas,
      client._internal.isOpStack()
        ? encodeExecuteData({ calls, opData: await getMockSignedOpData(client, calls) })
        : undefined
    );

    if (balance < estimatedFee) {
      throw new Error(
        `Insufficient balance of ${symbol} (${payment.token}): want ${formatUnits(
          estimatedFee,
          decimals
        )}, have ${formatUnits(balance, decimals)}`
      );
    }

    return {
      estimatedFee,
      estimatedGas,
      estimatedExecutionGas,
      estimatedL1Gas
    };
  }

  if (isNative(payment)) {
    const { estimatedExecutionGas, estimatedL1Gas, estimatedGas } = await estimateGas(
      client,
      calls
    );

    const [estimatedFee, balance] = await Promise.all([
      getEstimatedFee(
        client.chain.id,
        ethAddress,
        estimatedExecutionGas,
        estimatedL1Gas,
        client._internal.isOpStack()
          ? encodeExecuteData({ calls, opData: await getMockSignedOpData(client, calls) })
          : undefined
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

    return { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas };
  }

  const { estimatedExecutionGas, estimatedL1Gas, estimatedGas } = await estimateGas(client, calls);

  const estimatedFee = await getEstimatedFee(
    client.chain.id,
    ethAddress,
    estimatedExecutionGas,
    estimatedL1Gas,
    client._internal.isOpStack()
      ? encodeExecuteData({ calls, opData: await getMockSignedOpData(client, calls) })
      : undefined
  );

  return { estimatedFee, estimatedGas, estimatedExecutionGas, estimatedL1Gas };
}
