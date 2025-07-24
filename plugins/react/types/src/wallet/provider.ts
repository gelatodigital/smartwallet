import type { GenericNetwork } from "@dynamic-labs/types";
import type { GelatoSmartWalletClient } from "@gelatonetwork/smartwallet";
import type {
  GelatoSmartAccount,
  GelatoSmartAccountSCW
} from "@gelatonetwork/smartwallet/accounts";
import type { Config, CreateConfigParameters } from "@wagmi/core";
import type { ReactNode } from "react";
import type { Chain, Transport } from "viem";

export type ProviderType = "dynamic" | "privy";

export type WagmiCreateConfigParameters = CreateConfigParameters;

export interface ProviderContext {
  gelato: {
    client?: GelatoSmartWalletClient<Transport, Chain, GelatoSmartAccount> | undefined;
  };
  wagmi: {
    config?: Config | undefined;
  };
  logout: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

export interface ProviderProps {
  children: ReactNode;
  settings: {
    apiKey?: string;
    scw: GelatoSmartAccountSCW;
    waas: {
      type: ProviderType;
      appId: string;
      customChains?: {
        evmNetworks?: GenericNetwork[] | ((networks: GenericNetwork[]) => GenericNetwork[]);
        supportedChains?: Chain[];
      };
    };
    defaultChain?: Chain;
    wagmi?: {
      config: CreateConfigParameters;
    };
  };
}
