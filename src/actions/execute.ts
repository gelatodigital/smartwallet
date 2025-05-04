import {
  type Account,
  type Call,
  type Chain,
  type Transport,
  encodeFunctionData,
  zeroAddress
} from "viem";

import {
  entryPoint07Abi,
  entryPoint07Address,
  getUserOperationHash,
  toPackedUserOperation
} from "viem/account-abstraction";
import { encodeExecuteData } from "viem/experimental/erc7821";
import { feeCollector } from "../constants/index.js";
import { type Payment, isErc20, isNative } from "../payment/index.js";
import type { GelatoResponse } from "../relay/index.js";
import type { GelatoWalletClient } from "./index.js";
import { getOpData } from "./internal/getOpData.js";
import { getUserOp } from "./internal/getUserOp.js";
import { resolveERC20PaymentCall } from "./internal/resolveERC20PaymentCall.js";
import { resolveNativePaymentCall } from "./internal/resolveNativePaymentCall.js";
import { sendTransaction } from "./internal/sendTransaction.js";
import { signAuthorizationList } from "./internal/signAuthorizationList.js";
import { verifyAuthorization } from "./internal/verifyAuthorization.js";

/**
 *
 * @param client - Client.
 * @param parameters - Execution parameters.
 * @returns Transaction hash.
 */
export async function execute<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  client: GelatoWalletClient<transport, chain, account>,
  parameters: { payment: Payment; calls: Call[] }
): Promise<GelatoResponse> {
  const { payment, calls } = parameters;

  const authorized = await verifyAuthorization(client);

  const authorizationList = authorized ? [] : await signAuthorizationList(client);

  if (isErc20(payment)) {
    const { paymentCall } = await resolveERC20PaymentCall(client, payment, calls);
    calls.push(paymentCall);
  } else if (isNative(payment)) {
    const { paymentCall } = await resolveNativePaymentCall(client, calls);
    calls.push(paymentCall);
  }

  if (client._internal.erc4337) {
    const userOperation = await getUserOp(client, calls);

    const hash = getUserOperationHash({
      chainId: client.chain.id,
      entryPointAddress: entryPoint07Address,
      entryPointVersion: "0.7",
      userOperation
    });

    const signature = await client.signMessage({
      account: client.account,
      message: { raw: hash }
    });

    userOperation.signature = signature;

    const packedUserOperation = toPackedUserOperation(userOperation);

    const data = encodeFunctionData({
      abi: entryPoint07Abi,
      functionName: "handleOps",
      args: [[packedUserOperation], feeCollector(client.chain.id)]
    });

    return sendTransaction(client, entryPoint07Address, data, payment, authorizationList);
  }

  const opData = await client.signTypedData({
    account: client.account,
    ...(await getOpData(client, calls))
  });

  const data = encodeExecuteData({
    calls,
    opData
  });

  delete client._internal.inflight;

  return sendTransaction(client, client.account.address, data, payment, authorizationList);
}
