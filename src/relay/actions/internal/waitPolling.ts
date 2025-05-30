import type { Chain, Hash, PublicActions, Transport } from "viem";

import { statusApiPollingInterval, statusApiPollingMaxRetries } from "../../../constants/index.js";
import { ExecutionTimeoutError } from "../../status/types.js";
import { waitHttp } from "./waitHttp.js";
import type { GelatoSmartAccount } from "../../../accounts/index.js";

export const waitPolling = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends GelatoSmartAccount = GelatoSmartAccount
>(
  taskId: string,
  parameters: {
    submission: boolean;
    submissionHash?: Hash;
    client?: PublicActions<transport, chain, account>;
    pollingInterval?: number;
    maxRetries?: number;
  }
): Promise<Hash> => {
  const { submission, submissionHash, client, pollingInterval, maxRetries } = parameters;

  const _pollInterval = pollingInterval ?? statusApiPollingInterval();
  const _maxRetries = maxRetries ?? statusApiPollingMaxRetries();

  const httpRequest = async () => {
    for (let attempt = 0; attempt < _maxRetries; attempt++) {
      const transactionHash = await waitHttp(taskId, submission);

      if (transactionHash) {
        return { transactionHash };
      }

      // If not in a final state, wait before polling again
      await new Promise((resolve) => setTimeout(resolve, _pollInterval));
    }
    return undefined;
  };

  // Waiting for execution but TX hash gathered from submission event already
  // race with provider's receipt
  if (!submission && submissionHash) {
    const response = client
      ? await Promise.race([
          httpRequest(),
          client.waitForTransactionReceipt({ hash: submissionHash, pollingInterval: _pollInterval })
        ])
      : await httpRequest();

    if (response) {
      return response.transactionHash;
    }
  } else {
    const response = await httpRequest();
    if (response) {
      return response.transactionHash;
    }
  }

  throw new ExecutionTimeoutError(taskId);
};
