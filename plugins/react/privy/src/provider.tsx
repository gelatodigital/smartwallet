import { PrivyProvider, usePrivy, useSignAuthorization, useWallets } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChainId } from "caip";
import { createContext, useContext, useEffect, useState } from "react";
import {
  type Account,
  type Chain,
  type Hex,
  type Transport,
  type WalletClient,
  createWalletClient,
  custom
} from "viem";
import * as chains from "viem/chains";
import { extractChain } from "viem/utils";

import type { wallet } from "@gelatonetwork/smartwallet-react-types";
import type { FC, ReactNode } from "react";
import type { Config as WagmiConfig } from "wagmi";

type GelatoSmartWalletPrivyContextType = wallet.ProviderContext;

const GelatoSmartWalletPrivyProviderContext = createContext<
  GelatoSmartWalletPrivyContextType | undefined
>(undefined);

export const useGelatoSmartWalletPrivyContext = () => {
  const context = useContext(GelatoSmartWalletPrivyProviderContext);
  if (!context) {
    throw new Error(
      "useGelatoSmartWalletPrivyProvider must be used within a GelatoSmartWalletPrivyProvider"
    );
  }
  return context;
};

type GelatoSmartWalletPrivyContextProps = wallet.ProviderProps;

const GelatoSmartWalletPrivyInternal: FC<{
  children: ReactNode;
  wagmi: { config: WagmiConfig | undefined };
}> = ({ children, wagmi }) => {
  const { ready, authenticated, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signAuthorization } = useSignAuthorization();

  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  const logoutWrapper = async () => {
    if (!walletClient) {
      return;
    }

    setWalletClient(null);
    await logout();
  };

  const switchNetwork = async (chain: Chain) => {
    if (!walletClient) {
      return;
    }

    const primaryWallet = wallets[0];

    await primaryWallet.switchChain(chain.id);
    walletClient.switchChain({ id: chain.id });
  };

  useEffect(() => {
    if (!ready || !walletsReady) {
      return;
    }

    if (!authenticated || !wallets || wallets.length === 0) {
      setWalletClient(null);
      return;
    }

    const fetchWalletClient = async () => {
      const primaryWallet = wallets[0];

      try {
        // Privy wallet provides chainId in CAIP2 format
        const { reference: chainId } = ChainId.parse(primaryWallet.chainId);
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const chain = extractChain({ chains: Object.values(chains), id: Number(chainId) as any });

        if (!chain) {
          return;
        }

        const provider = await primaryWallet.getEthereumProvider();
        const walletClient = createWalletClient({
          account: primaryWallet.address as Hex,
          chain,
          transport: custom(provider)
        });

        walletClient.signAuthorization = async (parameters) => {
          const { chainId, nonce } = parameters;
          const contractAddress = parameters.contractAddress ?? parameters.address;

          if (!contractAddress) {
            throw new Error("Contract address is required");
          }

          const signedAuthorization = await signAuthorization({
            contractAddress,
            chainId,
            nonce
          });

          return signedAuthorization;
        };

        setWalletClient(walletClient);
      } catch (error) {
        console.error("Failed to get wallet client:", error);
      }
    };

    fetchWalletClient();
  }, [ready, wallets, walletsReady, authenticated, signAuthorization]);

  return (
    <GelatoSmartWalletPrivyProviderContext.Provider
      value={{
        wagmi: {
          config: wagmi.config,
          client: walletClient as WalletClient<Transport, Chain, Account>
        },
        logout: logoutWrapper,
        switchNetwork
      }}
    >
      {children}
    </GelatoSmartWalletPrivyProviderContext.Provider>
  );
};

export const GelatoSmartWalletPrivyContextProvider: FC<GelatoSmartWalletPrivyContextProps> = ({
  children,
  settings
}) => {
  const queryClient = new QueryClient();
  const wagmiConfig = settings.wagmi ? createConfig(settings.wagmi.config) : undefined;

  return (
    <PrivyProvider
      appId={settings.waas.appId}
      config={{
        defaultChain: settings.defaultChain ?? chains.sepolia
      }}
    >
      <GelatoSmartWalletPrivyInternal wagmi={{ config: wagmiConfig }}>
        {wagmiConfig ? (
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
          </QueryClientProvider>
        ) : (
          children
        )}
      </GelatoSmartWalletPrivyInternal>
    </PrivyProvider>
  );
};
