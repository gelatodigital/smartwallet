import type { Hash } from "viem";

export type TransactionStatusResponse = {
  chainId: number;
  taskId: string;
  taskState: TaskState;
  creationDate: string;
  lastCheckDate?: string;
  lastCheckMessage?: string;
  transactionHash?: string;
  blockNumber?: number;
  executionDate?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
};

export enum TaskState {
  CheckPending = "CheckPending",
  ExecPending = "ExecPending",
  WaitingForConfirmation = "WaitingForConfirmation",
  ExecSuccess = "ExecSuccess",
  ExecReverted = "ExecReverted",
  Cancelled = "Cancelled"
}

export enum WebsocketEvent {
  ERROR = "error",
  UPDATE = "update"
}

export interface WebsocketMessage<T> {
  event: WebsocketEvent;
  payload: T;
}

export interface UpdateWebsocketMessage {
  event: WebsocketEvent.UPDATE;
  payload: TransactionStatusResponse;
}

export interface ErrorWebsocketMessage {
  event: WebsocketEvent.ERROR;
  payload: Error;
}

export type GelatoTaskEvent = "success" | "cancel" | "revert";

export class GelatoTaskError extends Error {
  readonly taskId: string;
  readonly transactionHash: Hash | undefined;

  constructor(taskId: string, message?: string, transactionHash?: Hash) {
    super(message || `Task ${taskId} failed`);
    this.taskId = taskId;
    this.transactionHash = transactionHash;
    this.name = "GelatoTaskError";
  }
}

export class ExecutionRevertedError extends GelatoTaskError {
  constructor(taskId: string, message?: string, transactionHash?: Hash) {
    super(taskId, message || `Task ${taskId} execution reverted`, transactionHash);
    this.name = "ExecutionRevertedError";
  }
}

export class ExecutionCancelledError extends GelatoTaskError {
  constructor(taskId: string, message?: string) {
    super(taskId, message || `Task ${taskId} execution cancelled`);
    this.name = "ExecutionCancelledError";
  }
}

export class ExecutionTimeoutError extends GelatoTaskError {
  constructor(taskId: string, message?: string) {
    super(taskId, message || `Task ${taskId} execution timed out`);
    this.name = "ExecutionTimeoutError";
  }
}

export class InternalError extends GelatoTaskError {
  constructor(taskId: string, message?: string) {
    super(taskId, message || `Task ${taskId} failed with internal error`);
    this.name = "InternalError";
  }
}
