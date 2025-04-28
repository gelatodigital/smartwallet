import type { Config, CreateConfigParameters } from "@wagmi/core";
import type { ReactNode } from "react";
import type { Account, Chain, Transport, WalletClient } from "viem";

export interface ProviderContext {
  walletClient: WalletClient<Transport, Chain, Account> | undefined;
  wagmiConfig: Config | undefined;
  logout: () => void;
  switchNetwork: (chain: Chain) => Promise<void>;
}

export interface ProviderProps {
  children: ReactNode;
  settings: {
    appId: string;
    defaultChain?: Chain;
    wagmiConfigParameters?: CreateConfigParameters;
  };
}
