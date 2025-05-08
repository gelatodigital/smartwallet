import type { GelatoSmartWalletClient } from "@gelatonetwork/smartwallet";
import type { Wallet } from "@gelatonetwork/smartwallet/constants";
import type { Config, CreateConfigParameters } from "@wagmi/core";
import type { ReactNode } from "react";
import type { Account, Chain, Transport } from "viem";

export type ProviderType = "dynamic" | "privy";

export type WagmiCreateConfigParameters = CreateConfigParameters;

export interface ProviderContext {
  gelato: {
    client?: GelatoSmartWalletClient<Transport, Chain, Account> | undefined;
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
    wallet?: Wallet;
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
