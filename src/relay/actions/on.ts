import type { Client, Hash, Transport } from "viem";

import { waitForTransactionReceipt } from "viem/actions";
import { defaultProviderPollingInterval } from "../../constants/index.js";
import type { GelatoTaskEvent, TransactionStatusResponse } from "../status/index.js";
import { TaskState } from "../status/index.js";
import { isSubmitted } from "../status/utils.js";
import { statusApiWebSocket } from "../status/ws.js";
import { type ErrorCallback, onError } from "./internal/onError.js";

type SuccessCallback = (data: TransactionStatusResponse) => void;
type Callback = SuccessCallback | ErrorCallback;

type TaskStatusReturn = { taskStatus: TransactionStatusResponse; waitForReceipt?: boolean };

export const on = (
  taskId: string,
  parameters: {
    client?: Client<Transport>;
    confirmations?: number;
    pollingInterval?: number;
    update: GelatoTaskEvent | "error";
    callback: Callback;
  }
) => {
  const { update, callback, client, confirmations, pollingInterval } = parameters;

  if (update === "error") {
    return onError(taskId, { callback: callback as ErrorCallback, update });
  }

  const successCallback = callback as SuccessCallback;

  let resolvePromise: (value: TaskStatusReturn) => void;

  const updateHandler = (taskStatus: TransactionStatusResponse) => {
    if (taskStatus.taskId !== taskId) return;

    if (taskStatus.taskState === TaskState.ExecReverted && update === "revert") {
      resolvePromise({ taskStatus });
    } else if (taskStatus.taskState === TaskState.Cancelled && update === "cancel") {
      resolvePromise({ taskStatus });
    } else if (taskStatus.taskState === TaskState.ExecSuccess && update === "success") {
      resolvePromise({ taskStatus });
    } else if (
      isSubmitted(taskStatus.taskState) &&
      taskStatus.transactionHash &&
      (update === "submitted" || update === "success")
    ) {
      resolvePromise({ taskStatus, waitForReceipt: update === "success" });
    }
  };

  const promise = new Promise<TaskStatusReturn>((resolve) => {
    resolvePromise = resolve;
  });
  statusApiWebSocket.onUpdate(updateHandler);

  statusApiWebSocket.subscribe(taskId).then(async () => {
    // Wait for general events on task status to resolve
    const result = await promise;

    // If result is `waitForReceipt`, this means we're waiting for "success" event and we got
    // execution submitted from status API, so race with client's TX receipt and Status API's ExecSuccess
    while (result.waitForReceipt) {
      const promise = new Promise<TaskStatusReturn>((resolve) => {
        resolvePromise = resolve;
      });

      const { resolver, result: _result } = client
        ? await Promise.race([
            promise.then((result) => {
              return {
                resolver: "statusApi",
                result
              };
            }),
            waitForTransactionReceipt(client, {
              confirmations,
              hash: result.taskStatus.transactionHash as Hash,
              pollingInterval: pollingInterval ?? defaultProviderPollingInterval()
            }).then((result) => {
              return {
                resolver: "provider",
                result
              };
            })
          ])
        : await promise.then((result) => {
            return {
              resolver: "statusApi",
              result
            };
          });

      // If confirmations are provided, we need to wait for the transaction receipt and respect the confirmations
      if (resolver === "statusApi" && client && confirmations !== undefined) {
        await waitForTransactionReceipt(client, {
          confirmations,
          hash: result.taskStatus.transactionHash as Hash,
          pollingInterval: pollingInterval ?? defaultProviderPollingInterval()
        });
      }

      if ("waitForReceipt" in _result && _result.waitForReceipt) {
        result.taskStatus = _result.taskStatus;
        result.waitForReceipt = _result.waitForReceipt;
      } else {
        break;
      }
    }

    successCallback(result.taskStatus);
  });

  // Cleanup function
  return () => {
    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
  };
};
