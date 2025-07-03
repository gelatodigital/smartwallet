import type { Abi } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import type { PrivateKeyAccount } from "viem/accounts";
import type { WalletEncoding, WalletType } from "../wallet/index.js";

export { custom } from "./custom/index.js";
export { gelato } from "./gelato/index.js";
export { kernel } from "./kernel/index.js";
export { okx } from "./okx/index.js";
export { safe } from "./safe/index.js";
export { trustWallet } from "./trustWallet/index.js";
export { uniswap } from "./uniswap/index.js";

export type GelatoSmartAccountSCWEncoding = `${WalletEncoding}`;
export type GelatoSmartAccountSCWType = `${WalletType}`;
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
