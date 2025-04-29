import { Hash } from "viem";
import type { GelatoTaskEvent, TransactionStatusResponse } from "../status/index.js";
import { TaskState } from "../status/index.js";
import { statusApiWebSocket } from "../ws.js";

export const on = (
  taskId: string,
  parameters: {
    update: GelatoTaskEvent;
    callback: (data: TransactionStatusResponse | Error) => void;
  }
) => {
  const { update, callback } = parameters;

  const updateHandler = (taskStatus: TransactionStatusResponse) => {
    if (taskStatus.taskId !== taskId) return;

    if (update === "success" && taskStatus.taskState === TaskState.ExecSuccess) {
      callback(taskStatus);
    } else if (update === "revert" && taskStatus.taskState === TaskState.ExecReverted) {
      callback(taskStatus);
    } else if (update === "cancel" && taskStatus.taskState === TaskState.Cancelled) {
      callback(taskStatus);
    }
  };

  const errorHandler = (error: Error) => {
    if (update === "error") {
      callback(error);
    }
  };

  statusApiWebSocket.onUpdate(updateHandler);
  statusApiWebSocket.onError(errorHandler);

  statusApiWebSocket.subscribe(taskId).catch((error) => {
    if (update === "error") {
      callback(error);
    }
  });

  // Cleanup function
  return () => {
    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
    statusApiWebSocket.offError(errorHandler);
  };
};
