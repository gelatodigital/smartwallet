import type { Chain, PublicActions, Transport } from "viem";

import type { GelatoResponse, WaitParams } from "../index.js";
import type { GelatoTaskEvent, GelatoTaskWaitEvent } from "./types.js";

import type { GelatoSmartAccount } from "../../accounts/index.js";
import { on } from "../actions/on.js";
import { wait } from "../actions/wait.js";
export { getTaskStatus } from "./http.js";
export {
  TaskState,
  TransactionStatusResponse,
  GelatoTaskError,
  ExecutionCancelledError,
  ExecutionRevertedError,
  InternalError,
  GelatoTaskEvent,
  GelatoTaskWaitEvent
} from "./types.js";

export function track<
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(taskId: string, client?: PublicActions<transport, chain, account>): GelatoResponse {
  return {
    id: taskId,
    wait: (e?: GelatoTaskWaitEvent, params?: WaitParams) =>
      wait(taskId, { client, event: e, ...params }),
    on: (update: GelatoTaskEvent | "error", callback) => on(taskId, { update, callback, client })
  };
}
