import type { Client, Hash, Transport } from "viem";
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
import { waitHttp } from "./internal/waitHttp.js";
import { waitPolling } from "./internal/waitPolling.js";

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
    // If confirmations are provided, we need to wait for the transaction receipt and respect the confirmations
    if (confirmations !== undefined && confirmations > 0 && !submission && client) {
      await waitForTransactionReceipt(client, {
        confirmations,
        hash: transactionHash,
        pollingInterval: pollingInterval ?? defaultProviderPollingInterval()
      });
    }
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
      // If we're waiting for execution and got submission event, we need to wait for the execution (receipt)
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

    // We first check through status API
    let statusResolver = "statusApi";

    // Listen for task status, when submission event is received but we're waiting for the executionn
    // `promise` will resolve with `waitForReceipt` set to true and Provider's TX receipt will race with
    // status API to fetch inclusion as quickly as possible
    const result = await promise;
    while (result.waitForReceipt) {
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
              confirmations,
              hash: result.hash,
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

      // We got submission event from API again, resubmission occurred, race for new hash again
      if ("waitForReceipt" in _result && _result.waitForReceipt) {
        result.hash = _result.hash;
        result.waitForReceipt = _result.waitForReceipt;
      } else {
        statusResolver = resolver;
        break;
      }
    }

    // Confirmations are provided and above race resolved with status API, wait for receipt through client confirmations
    // If client won the race, it already waits for confirmations
    if (
      statusResolver === "statusApi" &&
      client &&
      confirmations !== undefined &&
      confirmations > 0 &&
      !submission
    ) {
      await waitForTransactionReceipt(client, {
        confirmations,
        hash: result.hash,
        pollingInterval: pollingInterval ?? defaultProviderPollingInterval()
      });
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
      client,
      confirmations,
      maxRetries,
      pollingInterval,
      submission,
      submissionHash: fallbackHash
    });
  } finally {
    statusApiWebSocket.unsubscribe(taskId);
    statusApiWebSocket.offUpdate(updateHandler);
    statusApiWebSocket.offError(errorHandler);
  }
};
