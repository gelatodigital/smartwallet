import type { Client, Transport } from "viem";
import type {
  GetUserOperationReceiptParameters,
  GetUserOperationReceiptReturnType
} from "viem/account-abstraction";

export async function getUserOperationReceipt(
  _client: Client<Transport>,
  { hash: _hash }: GetUserOperationReceiptParameters
): Promise<GetUserOperationReceiptReturnType> {
  throw new Error("TODO");
}
