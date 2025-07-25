import type { GenericNetwork } from "@dynamic-labs/types";
import type { Chain } from "viem";

export * from "./provider.js";

export type DynamicOptions = {
  evmNetworks?: GenericNetwork[] | ((networks: GenericNetwork[]) => GenericNetwork[]);
};

export type PrivyOptions = {
  supportedChains?: Chain[];
};
