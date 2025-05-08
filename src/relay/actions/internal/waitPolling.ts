import type { Account, Chain, Hash, Transport } from "viem";

import { waitHttp } from "./waitHttp.js";

import type { GelatoWalletClient } from "../../../actions/index.js";
import { statusApiPollingInterval, statusApiPollingMaxRetries } from "../../../constants/index.js";
import { ExecutionTimeoutError } from "../../status/types.js";

export const waitPolling = async <
  transport extends Transport = Transport,
  chain extends Chain = Chain,
  account extends Account = Account
>(
  taskId: string,
  submission: boolean,
  client: GelatoWalletClient<transport, chain, account>,
  submissionHash?: Hash,
  pollInterval?: number,
  maxRetries?: number
): Promise<Hash> => {
  const _pollInterval = pollInterval ?? statusApiPollingInterval();
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
    const response = await Promise.race([
      httpRequest(),
      client.waitForTransactionReceipt({ hash: submissionHash, pollingInterval: pollInterval })
    ]);

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
