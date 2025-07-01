import type { Client, Transport } from "viem";
import type {
  WaitForUserOperationReceiptParameters,
  WaitForUserOperationReceiptReturnType
} from "viem/account-abstraction";
import { track } from "../../relay/status/index.js";
import { getUserOperationReceiptFromTaskStatus } from "./getUserOperationReceipt.js";

export async function waitForUserOperationReceipt(
  client: Client<Transport>,
  { hash }: WaitForUserOperationReceiptParameters
): Promise<WaitForUserOperationReceiptReturnType> {
  const response = track(hash, client);

  return new Promise((resolve, reject) => {
    response.on("success", async (status) => {
      const receipt = await getUserOperationReceiptFromTaskStatus(client, status);
      resolve(receipt);
    });
    response.on("error", (error) => {
      reject({
        success: false,
        reason: error.message,
        userOpHash: hash
      });
    });
  });
}
