import type { Client, Transport } from "viem";
import type {
  WaitForUserOperationReceiptParameters,
  WaitForUserOperationReceiptReturnType
} from "viem/account-abstraction";

export function waitForUserOperationReceipt(
  _client: Client<Transport>,
  _parameters: WaitForUserOperationReceiptParameters
): Promise<WaitForUserOperationReceiptReturnType> {
  throw new Error("TODO");
}
