import type { GelatoSmartWalletClient } from "@gelatonetwork/smartwallet";
import type { GelatoSmartAccount } from "@gelatonetwork/smartwallet/accounts";
import type { Config, CreateConfigParameters } from "@wagmi/core";
import type { ReactNode } from "react";
import type {
  Account,
  Chain,
  Client,
  JsonRpcAccount,
  LocalAccount,
  Transport,
  WalletClient
} from "viem";

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
    toGelatoSmartAccount: (
      client: Client<Transport, Chain | undefined, JsonRpcAccount | LocalAccount | undefined>,
      owner: Account | WalletClient<Transport, Chain | undefined, Account>
    ) => Promise<GelatoSmartAccount>;
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
