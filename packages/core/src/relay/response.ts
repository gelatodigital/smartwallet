import type { Hash } from "viem";

import { TaskState, type TransactionStatusResponse } from "./status/index.js";
import { statusApiWebSocket } from "./ws.js";

export class GelatoTaskError extends Error {
  readonly taskId: string;
  readonly transactionHash: Hash | undefined;

  constructor(taskId: string, message?: string, transactionHash?: Hash) {
    super(message || `Task ${taskId} failed`);
    this.taskId = taskId;
    this.transactionHash = transactionHash;
    this.name = "GelatoTaskError";
  }
}

export class ExecutionRevertedError extends GelatoTaskError {
  constructor(taskId: string, message?: string, transactionHash?: Hash) {
    super(taskId, message || `Task ${taskId} execution reverted`, transactionHash);
    this.name = "ExecutionRevertedError";
  }
}

export class ExecutionCancelledError extends GelatoTaskError {
  constructor(taskId: string, message?: string) {
    super(taskId, message || `Task ${taskId} execution cancelled`);
    this.name = "ExecutionCancelledError";
  }
}

export class InternalError extends GelatoTaskError {
  constructor(taskId: string, message?: string) {
    super(taskId, message || `Task ${taskId} failed with internal error`);
    this.name = "InternalError";
  }
}

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

      if (taskStatus.taskState === TaskState.ExecReverted) {
        rejectPromise(
          new ExecutionRevertedError(
            this.taskId,
            taskStatus.transactionHash ? (taskStatus.transactionHash as Hash) : undefined
          )
        );
        return;
      }

      if (taskStatus.taskState === TaskState.Cancelled) {
        rejectPromise(new ExecutionCancelledError(this.taskId));
        return;
      }

      if (taskStatus.taskState === TaskState.ExecSuccess) {
        taskStatus.transactionHash
          ? resolvePromise(taskStatus.transactionHash as Hash)
          : rejectPromise(new InternalError(this.taskId));
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
