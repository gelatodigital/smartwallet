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
