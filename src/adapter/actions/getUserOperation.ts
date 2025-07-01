import { type Address, type Client, type Hex, type Transport, decodeFunctionData } from "viem";
import {
  type GetUserOperationParameters,
  type GetUserOperationReturnType,
  UserOperationNotFoundError,
  entryPoint07Abi
} from "viem/account-abstraction";
import { getTransaction } from "viem/actions";
import { TaskState, getTaskStatus } from "../../relay/status/index.js";
import { toUnpackedUserOperation } from "../utils/index.js";

export async function getUserOperation(
  client: Client<Transport>,
  { hash }: GetUserOperationParameters
): Promise<GetUserOperationReturnType> {
  const status = await getTaskStatus(hash);
  if (status?.taskState !== TaskState.ExecSuccess || !status.transactionHash) {
    throw new UserOperationNotFoundError({ hash });
  }

  const transaction = await getTransaction(client, { hash: status.transactionHash as Hex });

  const { functionName, args } = decodeFunctionData({
    abi: entryPoint07Abi,
    data: transaction.input
  });

  if (functionName !== "handleOps") {
    throw new UserOperationNotFoundError({ hash });
  }

  return {
    blockHash: transaction.blockHash,
    blockNumber: transaction.blockNumber,
    entryPoint: transaction.to as Address,
    transactionHash: transaction.hash,
    userOperation: toUnpackedUserOperation(args[0][0])
  };
}
