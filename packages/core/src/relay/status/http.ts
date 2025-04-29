import type { TransactionStatusResponse } from "./types.js";

import { GELATO_API } from "../../constants/index.js";

export const getTaskStatus = async (
  taskId: string
): Promise<TransactionStatusResponse | undefined> => {
  try {
    return (await fetch(`${GELATO_API}/tasks/status/${taskId}`).then((response) => response.json()))
      .data.task;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } catch (error: any) {
    throw new Error(
      `GelatoMegaSDK/getTaskStatus: Failed with error: ${
        error.response?.data?.message ?? error.message ?? "Internal Error"
      }`
    );
  }
};
