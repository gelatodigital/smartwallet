import type { Client, Hex, Transport } from "viem";
import { on } from "../actions/on.js";
import { wait } from "../actions/wait.js";
import type { GelatoResponse, WaitParams } from "../index.js";
import type { GelatoTaskEvent, GelatoTaskWaitEvent } from "./types.js";

export { getTaskStatus } from "./http.js";
export {
  ExecutionCancelledError,
  ExecutionRevertedError,
  GelatoTaskError,
  GelatoTaskEvent,
  GelatoTaskWaitEvent,
  InternalError,
  TaskState,
  TransactionStatusResponse
} from "./types.js";

export function track(taskId: Hex, client?: Client<Transport>): GelatoResponse {
  return {
    id: taskId,
    on: (update: GelatoTaskEvent | "error", callback) => on(taskId, { callback, client, update }),
    wait: (e?: GelatoTaskWaitEvent, params?: WaitParams) =>
      wait(taskId, { client, event: e, ...params })
  };
}
