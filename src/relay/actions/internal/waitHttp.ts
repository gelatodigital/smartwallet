import type { Hash } from "viem";

import { getTaskStatus } from "../../status/http.js";
import {
  ExecutionCancelledError,
  ExecutionRevertedError,
  InternalError,
  TaskState
} from "../../status/types.js";
import { isSubmitted } from "../../status/utils.js";

export const waitHttp = async (taskId: string, submission = false): Promise<Hash | undefined> => {
  const taskStatus = await getTaskStatus(taskId);

  if (!taskStatus) {
    throw new InternalError(taskId);
  }

  if (taskStatus.taskState === TaskState.ExecReverted) {
    throw new ExecutionRevertedError(
      taskId,
      taskStatus.transactionHash ? (taskStatus.transactionHash as Hash) : undefined
    );
  }

  if (taskStatus.taskState === TaskState.Cancelled) {
    throw new ExecutionCancelledError(taskId);
  }

  if (taskStatus.taskState === TaskState.ExecSuccess) {
    if (taskStatus.transactionHash) {
      return taskStatus.transactionHash as Hash;
    }

    throw new InternalError(taskId);
  }

  if (submission && isSubmitted(taskStatus.taskState)) {
    return taskStatus.transactionHash as Hash;
  }
};
