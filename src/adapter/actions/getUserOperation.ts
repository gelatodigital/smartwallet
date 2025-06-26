import type { Client, Transport } from "viem";
import type {
  GetUserOperationParameters,
  GetUserOperationReturnType
} from "viem/account-abstraction";

export async function getUserOperation(
  _client: Client<Transport>,
  { hash: _hash }: GetUserOperationParameters
): Promise<GetUserOperationReturnType> {
  throw new Error("TODO");
}
