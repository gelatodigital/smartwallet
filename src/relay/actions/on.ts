import type { Account, Chain, Hash, Transport } from "viem";
import type { GelatoWalletClient } from "../../actions/index.js";
import { statusApiPollingInterval } from "../../constants/index.js";
import type { GelatoTaskEvent, TransactionStatusResponse } from "../status/index.js";
import { TaskState } from "../status/index.js";
import { isSubmitted } from "../status/utils.js";
import { statusApiWebSocket } from "../ws.js";
import { type ErrorCallback, onError } from "./internal/onError.js";

type SuccessCallback = (data: TransactionStatusResponse) => void;
type Callback = SuccessCallback | ErrorCallback;

type TaskStatusReturn = { taskStatus: TransactionStatusResponse; waitForReceipt?: boolean };

export const on = <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  taskId: string,
  client: GelatoWalletClient<transport, chain, account>,
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

      const _result = await Promise.race([
        promise,
        client.waitForTransactionReceipt({
          hash: result.taskStatus.transactionHash as Hash,
          pollingInterval: statusApiPollingInterval()
        })
      ]);

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
