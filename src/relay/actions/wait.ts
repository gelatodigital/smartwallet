import type { Client, Hash, Transport } from "viem";

import { waitHttp } from "./internal/waitHttp.js";
import { waitPolling } from "./internal/waitPolling.js";

import { waitForTransactionReceipt } from "viem/actions";
import { defaultProviderPollingInterval } from "../../constants/index.js";
import type { WaitParams } from "../index.js";
import {
  ExecutionCancelledError,
  ExecutionRevertedError,
  GelatoTaskError,
  type GelatoTaskWaitEvent,
  InternalError,
  TaskState,
  type TransactionStatusResponse
} from "../status/types.js";
import { isSubmitted } from "../status/utils.js";
import { statusApiWebSocket } from "../status/ws.js";

type TaskStatusReturn = { hash: Hash; waitForReceipt?: boolean };

/**
 * Wait for a task to be executed on or submitted to chain
 * @param taskId - The ID of the task to wait for
 * @param parameters - additional parameters
 * @returns The transaction hash of the task when task is executed on chain
 */
export const wait = async (
  taskId: string,
  parameters: WaitParams & {
    event?: GelatoTaskWaitEvent;
    client?: Client<Transport>;
    maxRetries?: number;
  } = { event: "execution" }
): Promise<Hash> => {
  const { client, event, pollingInterval, maxRetries, confirmations } = parameters;

  const submission = event === "submission";

  // Check with HTTP first
  const transactionHash = await waitHttp(taskId, submission);

  if (transactionHash) {
    return transactionHash;
  }

  let resolvePromise: (value: TaskStatusReturn) => void;
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

    if (isSubmitted(taskStatus.taskState) && taskStatus.transactionHash) {
      resolvePromise({ hash: taskStatus.transactionHash as Hash, waitForReceipt: !submission });
    }

    if (taskStatus.taskState === TaskState.ExecSuccess) {
      taskStatus.transactionHash
        ? resolvePromise({ hash: taskStatus.transactionHash as Hash })
        : rejectPromise(new InternalError(taskId));
    }
  };

  const errorHandler = (error: Error) => {
    rejectPromise(error);
  };

  // Temporary TX hash in-case falling back to HTTP from WS
  let fallbackHash: Hash | undefined;

  try {
    const promise = new Promise<TaskStatusReturn>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    statusApiWebSocket.onUpdate(updateHandler);
    statusApiWebSocket.onError(errorHandler);

    await statusApiWebSocket.subscribe(taskId);

    // Listen for task status, when submission event is received but we're waiting for the executionn
    // `promise` will resolve with `waitForReceipt` set to true and Provider's TX receipt will race with
    // status API to fetch inclusion as quickly as possible
    const result = await promise;
    while (result.waitForReceipt && !submission) {
      fallbackHash = result.hash;
      const promise = new Promise<TaskStatusReturn>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
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
              hash: result.hash,
              pollingInterval: pollingInterval ?? defaultProviderPollingInterval(),
              confirmations
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
          hash: result.hash,
          pollingInterval: pollingInterval ?? defaultProviderPollingInterval(),
          confirmations
        });
      }

      if ("waitForReceipt" in _result && _result.waitForReceipt) {
        // Resubmission occurred, race for new hash again
        result.hash = _result.hash;
        result.waitForReceipt = _result.waitForReceipt;
      } else {
        // Either transaction receipt succeeded or we got ExecSuccess event
        break;
      }
    }

    return result.hash;
  } catch (error) {
    if (error instanceof GelatoTaskError) {
      throw error;
    }

    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
    statusApiWebSocket.offError(errorHandler);

    // Websocket error happened fallback to HTTP polling
    console.warn("WebSocket connection failed, falling back to HTTP polling");
    return await waitPolling(taskId, {
      submission,
      client,
      submissionHash: fallbackHash,
      pollingInterval,
      maxRetries
    });
  } finally {
    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
    statusApiWebSocket.offError(errorHandler);
  }
};
