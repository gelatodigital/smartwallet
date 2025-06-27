import {
  type GetSupportedEntryPointsReturnType,
  entryPoint07Address,
  entryPoint08Address
} from "viem/account-abstraction";

export async function getSupportedEntryPoints(): Promise<GetSupportedEntryPointsReturnType> {
  return [entryPoint07Address, entryPoint08Address];
}
