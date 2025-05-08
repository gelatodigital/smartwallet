import { TaskState } from "./types.js";

export const isFinalTaskState = (taskState: TaskState): boolean => {
  switch (taskState) {
    case TaskState.ExecSuccess:
    case TaskState.ExecReverted:
    case TaskState.Cancelled:
      return true;
    default:
      return false;
  }
};

export const isSubmitted = (taskState: TaskState): boolean => {
  return taskState === TaskState.ExecPending || taskState === TaskState.WaitingForConfirmation;
};
