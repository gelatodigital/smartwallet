import type { Hash } from "viem";

import { waitHttp } from "./waitHttp.js";

import { statusApiPollingInterval, statusApiPollingMaxRetries } from "../../../constants/index.js";
import { ExecutionTimeoutError } from "../../status/types.js";

export const waitPolling = async (
  taskId: string,
  pollInterval?: number,
  maxRetries?: number
): Promise<Hash> => {
  const _pollInterval = pollInterval ?? statusApiPollingInterval();
  const _maxRetries = maxRetries ?? statusApiPollingMaxRetries();

  for (let attempt = 0; attempt < _maxRetries; attempt++) {
    const transactionHash = await waitHttp(taskId);

    if (transactionHash) {
      return transactionHash;
    }

    // If not in a final state, wait before polling again
    await new Promise((resolve) => setTimeout(resolve, _pollInterval));
  }

  throw new ExecutionTimeoutError(taskId);
};
