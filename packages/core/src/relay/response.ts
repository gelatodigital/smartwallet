import type { Hash } from "viem";

import { TaskState, type TransactionStatusResponse } from "./status/index.js";
import { statusApiWebSocket } from "./ws.js";

export class GelatoResponse {
  readonly taskId: string;

  constructor(taskId: string) {
    this.taskId = taskId;
  }

  async wait(): Promise<Hash> {
    let resolvePromise: (value: Hash) => void;
    let rejectPromise: (reason: Error) => void;

    const updateHandler = (taskStatus: TransactionStatusResponse) => {
      if (taskStatus.taskId !== this.taskId) return;

      if (
        taskStatus.taskState === TaskState.ExecReverted ||
        taskStatus.taskState === TaskState.Cancelled
      ) {
        rejectPromise(new Error(`Task ${this.taskId} failed`));
        return;
      }

      if (taskStatus.taskState === TaskState.ExecSuccess) {
        taskStatus.transactionHash
          ? resolvePromise(taskStatus.transactionHash as Hash)
          : rejectPromise(
              new Error(
                `Internal error: Task ${this.taskId} is ExecSuccess but missing transaction hash`
              )
            );
      }
    };

    const errorHandler = (error: Error) => {
      rejectPromise(error);
    };

    try {
      const promise = new Promise<Hash>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });

      statusApiWebSocket.onUpdate(updateHandler);
      statusApiWebSocket.onError(errorHandler);

      await statusApiWebSocket.subscribe(this.taskId);
      return await promise;
    } finally {
      statusApiWebSocket.unsubscribe(this.taskId);
      statusApiWebSocket.offUpdate(updateHandler);
      statusApiWebSocket.offError(errorHandler);
    }
  }
}
