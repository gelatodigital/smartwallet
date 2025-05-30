import type { PrivateKeyAccount } from "viem/accounts";
import type { Abi } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

export { gelato } from "./gelato/index.js";
export { kernel } from "./kernel/index.js";
export { custom } from "./custom/index.js";

export type GelatoSmartAccountSCWEncoding = "erc7821" | "erc7579"
export type GelatoSmartAccountSCWType = "gelato" | "kernel"|"custom"
export type GelatoSmartAccountSCW = { type: GelatoSmartAccountSCWType, encoding: GelatoSmartAccountSCWEncoding, version?: string }

export type GelatoSmartAccountExtension = { scw: GelatoSmartAccountSCW, eip7702: boolean, owner?: PrivateKeyAccount, abi?: Abi }
export type GelatoSmartAccount = SmartAccount & GelatoSmartAccountExtension