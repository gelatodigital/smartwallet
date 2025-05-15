import type { Account, Chain, PublicActions, Transport } from "viem";
import type { GelatoTaskWaitEvent } from "./types.js";
import type { GelatoTaskEvent } from "./types.js";
import type { GelatoResponse } from "../index.js";

import { wait } from "../actions/wait.js";
import { on } from "../actions/on.js";
export { WebsocketHandler } from "./ws.js";
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
  account extends Account = Account
>(taskId: string, client?: PublicActions<transport, chain, account>): GelatoResponse {
  return {
    id: taskId,
    wait: (e: GelatoTaskWaitEvent = "execution") =>
      wait(taskId, { client, submission: e === "submission" }),
    on: (update: GelatoTaskEvent | "error", callback) => on(taskId, { update, callback, client })
  };
}
