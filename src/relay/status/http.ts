import { api } from "../../constants/index.js";
import type { TransactionStatusResponse } from "./types.js";

export const getTaskStatus = async (
  taskId: string
): Promise<TransactionStatusResponse | undefined> => {
  try {
    return (await fetch(`${api()}/tasks/status/${taskId}`).then((response) => response.json()))
      .task;
    // biome-ignore lint/suspicious/noExplicitAny: error type override
  } catch (error: any) {
    throw new Error(
      `GelatoSmartWalletSDK/getTaskStatus: Failed with error: ${
        error.response?.data?.message ?? error.message ?? "Internal Error"
      }`
    );
  }
};
