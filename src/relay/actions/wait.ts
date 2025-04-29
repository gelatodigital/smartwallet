import type { Hash } from "viem";

import { waitHttp } from "./internal/waitHttp.js";
import { waitPolling } from "./internal/waitPolling.js";

import {
  ExecutionCancelledError,
  ExecutionRevertedError,
  GelatoTaskError,
  InternalError,
  TaskState,
  type TransactionStatusResponse
} from "../status/types.js";
import { statusApiWebSocket } from "../ws.js";

export const wait = async (
  taskId: string,
  parameters?: {
    pollingInterval?: number;
    maxRetries?: number;
  }
): Promise<Hash> => {
  // Check with HTTP first
  const transactionHash = await waitHttp(taskId);

  if (transactionHash) {
    return transactionHash;
  }

  let resolvePromise: (value: Hash) => void;
  let rejectPromise: (reason: Error) => void;

  const updateHandler = (taskStatus: TransactionStatusResponse) => {
    if (taskStatus.taskId !== taskId) return;

    if (taskStatus.taskState === TaskState.ExecReverted) {
      rejectPromise(
        new ExecutionRevertedError(
          taskId,
          taskStatus.transactionHash ? (taskStatus.transactionHash as Hash) : undefined
        )
      );
    }

    if (taskStatus.taskState === TaskState.Cancelled) {
      rejectPromise(new ExecutionCancelledError(taskId));
    }

    if (taskStatus.taskState === TaskState.ExecSuccess) {
      taskStatus.transactionHash
        ? resolvePromise(taskStatus.transactionHash as Hash)
        : rejectPromise(new InternalError(taskId));
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

    await statusApiWebSocket.subscribe(taskId);
    return await promise;
  } catch (error) {
    if (error instanceof GelatoTaskError) {
      throw error;
    }

    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
    statusApiWebSocket.offError(errorHandler);

    // Websocket error happened fallback to HTTP polling
    console.warn("WebSocket connection failed, falling back to HTTP polling");
    return await waitPolling(taskId, parameters?.pollingInterval, parameters?.maxRetries);
  } finally {
    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
    statusApiWebSocket.offError(errorHandler);
  }
};
