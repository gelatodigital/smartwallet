import type { GelatoSmartWalletClient } from "@gelatonetwork/smartwallet";
import type { Config, CreateConfigParameters } from "@wagmi/core";
import type { ReactNode } from "react";
import type { Account, Chain, Transport } from "viem";

export type ProviderType = "dynamic" | "privy";

export type WagmiCreateConfigParameters = CreateConfigParameters;

export interface ProviderContext {
  wagmi: {
    client?: GelatoSmartWalletClient<Transport, Chain, Account> | undefined;
    config?: Config | undefined;
  };
  logout: () => void;
  switchNetwork: (chain: Chain) => Promise<void>;
}

export interface ProviderProps {
  children: ReactNode;
  settings: {
    waas: {
      type: ProviderType;
      appId: string;
    };
    defaultChain?: Chain;
    wagmi?: {
      config: CreateConfigParameters;
    };
  };
}
