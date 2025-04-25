import type { ReactNode } from "react";
import type { Account, Chain, Transport, WalletClient } from "viem";

export interface ProviderContext {
  walletClient: WalletClient<Transport, Chain, Account> | null;
  logout: () => void;
  switchNetwork: (chain: Chain) => Promise<void>;
}

export interface ProviderProps {
  children: ReactNode;
  settings: {
    appId: string;
    defaultChain?: Chain;
  };
}
