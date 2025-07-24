import type { Client, Hash, Transport } from "viem";

import { waitForTransactionReceipt } from "viem/actions";
import {
  defaultProviderPollingInterval,
  statusApiPollingInterval,
  statusApiPollingMaxRetries
} from "../../../constants/index.js";
import { ExecutionTimeoutError } from "../../status/types.js";
import { waitHttp } from "./waitHttp.js";

export const waitPolling = async (
  taskId: string,
  parameters: {
    submission: boolean;
    submissionHash?: Hash;
    client?: Client<Transport>;
    pollingInterval?: number;
    confirmations?: number;
    maxRetries?: number;
  }
): Promise<Hash> => {
  const { submission, submissionHash, client, pollingInterval, maxRetries, confirmations } =
    parameters;

  const _maxRetries = maxRetries ?? statusApiPollingMaxRetries();
  const httpRequest = async () => {
    for (let attempt = 0; attempt < _maxRetries; attempt++) {
      const transactionHash = await waitHttp(taskId, submission);

      if (transactionHash) {
        return { transactionHash };
      }

      // If not in a final state, wait before polling again
      await new Promise((resolve) => setTimeout(resolve, statusApiPollingInterval()));
    }
    return undefined;
  };

  // Waiting for execution but TX hash gathered from submission event already
  // race with provider's receipt
  if (!submission && submissionHash) {
    const { resolver, result } = client
      ? await Promise.race([
          httpRequest().then((result) => {
            return {
              resolver: "statusApi",
              result
            };
          }),
          waitForTransactionReceipt(client, {
            hash: submissionHash,
            pollingInterval: pollingInterval ?? defaultProviderPollingInterval(),
            confirmations
          }).then((result) => {
            return {
              resolver: "provider",
              result
            };
          })
        ])
      : await httpRequest().then((result) => {
          return {
            resolver: "statusApi",
            result
          };
        });

    if (resolver === "statusApi" && client && confirmations !== undefined && confirmations > 0) {
      await waitForTransactionReceipt(client, {
        hash: submissionHash,
        pollingInterval: pollingInterval ?? defaultProviderPollingInterval(),
        confirmations
      });
    }

    if (result) {
      return result.transactionHash;
    }
  } else {
    const response = await httpRequest();
    if (response) {
      return response.transactionHash;
    }
  }

  throw new ExecutionTimeoutError(taskId);
};
