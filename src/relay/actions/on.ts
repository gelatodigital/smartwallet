import { Hash } from "viem";
import type { GelatoTaskEvent, TransactionStatusResponse } from "../status/index.js";
import { TaskState } from "../status/index.js";
import { statusApiWebSocket } from "../ws.js";
import { onError } from "./internal/onError.js";

type SuccessCallback = (data: TransactionStatusResponse) => void;
type ErrorCallback = (error: Error) => void;
type Callback = SuccessCallback | ErrorCallback;

export const on = (
  taskId: string,
  parameters: {
    update: GelatoTaskEvent | "error";
    callback: Callback;
  }
) => {
  const { update, callback } = parameters;

  if (update === "error") {
    return onError(taskId, { update, callback: callback as ErrorCallback });
  }

  const successCallback = callback as SuccessCallback;

  const updateHandler = (taskStatus: TransactionStatusResponse) => {
    if (taskStatus.taskId !== taskId) return;

    if (update === "success" && taskStatus.taskState === TaskState.ExecSuccess) {
      successCallback(taskStatus);
    } else if (update === "revert" && taskStatus.taskState === TaskState.ExecReverted) {
      successCallback(taskStatus);
    } else if (update === "cancel" && taskStatus.taskState === TaskState.Cancelled) {
      successCallback(taskStatus);
    }
  };

  statusApiWebSocket.onUpdate(updateHandler);

  statusApiWebSocket.subscribe(taskId);

  // Cleanup function
  return () => {
    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
  };
};
