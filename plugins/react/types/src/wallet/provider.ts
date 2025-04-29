import type { Config } from "@wagmi/core";
import type { ReactNode } from "react";
import type { Account, Chain, Transport, WalletClient } from "viem";

export type ProviderType = "dynamic" | "privy";

export interface ProviderContext {
  wagmi: {
    client?: WalletClient<Transport, Chain, Account> | undefined;
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
      config: Config;
    };
  };
}
