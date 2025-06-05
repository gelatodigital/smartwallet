import type { Abi } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import type { PrivateKeyAccount } from "viem/accounts";

export { gelato } from "./gelato/index.js";
export { kernel } from "./kernel/index.js";
export { safe } from "./safe/index.js";
export { custom } from "./custom/index.js";

export type GelatoSmartAccountSCWEncoding = "erc7821" | "safe";
export type GelatoSmartAccountSCWType = "gelato" | "kernel" | "safe" | "custom";
export type GelatoSmartAccountSCW =
  | {
      type: Exclude<GelatoSmartAccountSCWType, "custom">;
      encoding?: GelatoSmartAccountSCWEncoding;
      version?: string;
    }
  | {
      type: "custom";
      encoding: GelatoSmartAccountSCWEncoding;
      version?: string;
    };

export type GelatoSmartAccountExtension = {
  scw: GelatoSmartAccountSCW;
  eip7702: boolean;
  erc4337: boolean;
  owner?: PrivateKeyAccount;
  abi?: Abi;
};
export type GelatoSmartAccount = SmartAccount & GelatoSmartAccountExtension;
