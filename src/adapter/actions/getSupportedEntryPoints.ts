import {
  entryPoint07Address,
  entryPoint08Address,
  type GetSupportedEntryPointsReturnType
} from "viem/account-abstraction";

export async function getSupportedEntryPoints(): Promise<GetSupportedEntryPointsReturnType> {
  return [entryPoint07Address, entryPoint08Address];
}
