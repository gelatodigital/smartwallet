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
