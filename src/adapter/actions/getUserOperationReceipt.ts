import {
  type Address,
  type Client,
  type Hex,
  type Transport,
  parseEventLogs,
  zeroAddress
} from "viem";
import {
  type GetUserOperationReceiptParameters,
  type GetUserOperationReceiptReturnType,
  UserOperationNotFoundError,
  entryPoint07Abi
} from "viem/account-abstraction";
import { getTransactionReceipt, waitForTransactionReceipt } from "viem/actions";
import {
  TaskState,
  type TransactionStatusResponse,
  getTaskStatus
} from "../../relay/status/index.js";
import { isFinalTaskState } from "../../relay/status/utils.js";

export async function getUserOperationReceiptFromTaskStatus(
  client: Client<Transport>,
  status: TransactionStatusResponse,
  wait: boolean
): Promise<GetUserOperationReceiptReturnType> {
  const receipt = wait
    ? await waitForTransactionReceipt(client, { hash: status.transactionHash as Hex })
    : await getTransactionReceipt(client, { hash: status.transactionHash as Hex });

  const logs = parseEventLogs({
    abi: entryPoint07Abi,
    eventName: "UserOperationEvent",
    logs: receipt.logs
  });

  const { actualGasCost, actualGasUsed, nonce, paymaster, sender, success, userOpHash } =
    logs[0].args;

  const response: GetUserOperationReceiptReturnType = {
    actualGasCost,
    actualGasUsed,
    entryPoint: receipt.to as Address,
    logs: receipt.logs,
    nonce,
    receipt,
    sender,
    success,
    userOpHash
  };

  if (paymaster !== zeroAddress) {
    response.paymaster = paymaster;
  }

  return response;
}

export async function getUserOperationReceipt(
  client: Client<Transport>,
  { hash }: GetUserOperationReceiptParameters
): Promise<GetUserOperationReceiptReturnType> {
  const status = await getTaskStatus(hash);
  if (!status?.taskState || !isFinalTaskState(status?.taskState)) {
    throw new UserOperationNotFoundError({ hash });
  }

  if (
    status.taskState === TaskState.Cancelled ||
    status.taskState === TaskState.ExecReverted ||
    !status.transactionHash
  ) {
    return {
      success: false,
      reason: status.lastCheckMessage,
      userOpHash: hash
    } as GetUserOperationReceiptReturnType;
  }

  return getUserOperationReceiptFromTaskStatus(client, status, false);
}
