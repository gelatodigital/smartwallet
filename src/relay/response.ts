import type { Hash } from "viem";

import {
  GELATO_STATUS_API_POLLING_INTERVAL,
  GELATO_STATUS_API_POLLING_MAX_RETRIES
} from "../constants/index.js";
import { TaskState, type TransactionStatusResponse, getTaskStatus } from "./status/index.js";
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

export class ExecutionTimeoutError extends GelatoTaskError {
  constructor(taskId: string, message?: string) {
    super(taskId, message || `Task ${taskId} execution timed out`);
    this.name = "ExecutionTimeoutError";
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

  private async _waitHttp(): Promise<Hash | undefined> {
    const taskStatus = await getTaskStatus(this.taskId);

    if (!taskStatus) {
      throw new InternalError(this.taskId);
    }

    if (taskStatus.taskState === TaskState.ExecReverted) {
      throw new ExecutionRevertedError(
        this.taskId,
        taskStatus.transactionHash ? (taskStatus.transactionHash as Hash) : undefined
      );
    }

    if (taskStatus.taskState === TaskState.Cancelled) {
      throw new ExecutionCancelledError(this.taskId);
    }

    if (taskStatus.taskState === TaskState.ExecSuccess) {
      if (taskStatus.transactionHash) {
        return taskStatus.transactionHash as Hash;
      }

      throw new InternalError(this.taskId);
    }
  }

  private async _waitPolling(pollInterval?: number, maxRetries?: number): Promise<Hash> {
    const _pollInterval = pollInterval ?? GELATO_STATUS_API_POLLING_INTERVAL;
    const _maxRetries = maxRetries ?? GELATO_STATUS_API_POLLING_MAX_RETRIES;

    for (let attempt = 0; attempt < _maxRetries; attempt++) {
      const transactionHash = await this._waitHttp();

      if (transactionHash) {
        return transactionHash;
      }

      // If not in a final state, wait before polling again
      await new Promise((resolve) => setTimeout(resolve, _pollInterval));
    }

    throw new ExecutionTimeoutError(this.taskId);
  }

  async wait(parameters?: {
    pollingInterval?: number;
    maxRetries?: number;
  }): Promise<Hash> {
    // Check with HTTP first
    const transactionHash = await this._waitHttp();

    if (transactionHash) {
      return transactionHash;
    }

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
      }

      if (taskStatus.taskState === TaskState.Cancelled) {
        rejectPromise(new ExecutionCancelledError(this.taskId));
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
    } catch (error) {
      if (error instanceof GelatoTaskError) {
        throw error;
      }

      statusApiWebSocket.unsubscribe(this.taskId);
      statusApiWebSocket.offUpdate(updateHandler);
      statusApiWebSocket.offError(errorHandler);

      // Websocket error happened fallback to HTTP polling
      console.warn("WebSocket connection failed, falling back to HTTP polling");
      return await this._waitPolling(parameters?.pollingInterval, parameters?.maxRetries);
    } finally {
      statusApiWebSocket.unsubscribe(this.taskId);
      statusApiWebSocket.offUpdate(updateHandler);
      statusApiWebSocket.offError(errorHandler);
    }
  }
}
