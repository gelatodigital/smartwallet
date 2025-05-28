import type { Chain, PublicActions, Transport } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

import type { GelatoResponse } from "../index.js";
import type { GelatoTaskWaitEvent } from "./types.js";
import type { GelatoTaskEvent } from "./types.js";

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
  account extends SmartAccount = SmartAccount
>(taskId: string, client?: PublicActions<transport, chain, account>): GelatoResponse {
  return {
    id: taskId,
    wait: (e: GelatoTaskWaitEvent = "execution") =>
      wait(taskId, { client, submission: e === "submission" }),
    on: (update: GelatoTaskEvent | "error", callback) => on(taskId, { update, callback, client })
  };
}
