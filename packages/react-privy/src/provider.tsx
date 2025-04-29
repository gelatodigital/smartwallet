import type { wallet } from "@gelatomega/react-types";
import { PrivyProvider, usePrivy, useSignAuthorization, useWallets } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChainId } from "caip";
import type { FC, ReactNode } from "react";
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
import type { Config as WagmiConfig } from "wagmi";

type GelatoMegaPrivyContextType = wallet.ProviderContext;

const GelatoMegaPrivyProviderContext = createContext<GelatoMegaPrivyContextType | undefined>(
  undefined
);

export const useGelatoMegaPrivyContext = () => {
  const context = useContext(GelatoMegaPrivyProviderContext);
  if (!context) {
    throw new Error("useGelatoMegaPrivyProvider must be used within a GelatoMegaPrivyProvider");
  }
  return context;
};

type GelatoMegaPrivyContextProps = wallet.ProviderProps;

const GelatoMegaPrivyInternal: FC<{
  children: ReactNode;
  wagmiConfig: WagmiConfig | undefined;
}> = ({ children, wagmiConfig }) => {
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
    <GelatoMegaPrivyProviderContext.Provider
      value={{
        walletClient: walletClient as WalletClient<Transport, Chain, Account>,
        wagmiConfig,
        logout: logoutWrapper,
        switchNetwork
      }}
    >
      {children}
    </GelatoMegaPrivyProviderContext.Provider>
  );
};

export const GelatoMegaPrivyContextProvider: FC<GelatoMegaPrivyContextProps> = ({
  children,
  settings
}) => {
  const queryClient = new QueryClient();
  const wagmiConfig = settings.wagmiConfigParameters
    ? createConfig(settings.wagmiConfigParameters)
    : undefined;
  return (
    <PrivyProvider
      appId={settings.appId}
      config={{
        defaultChain: settings.defaultChain ?? chains.sepolia
      }}
    >
      <GelatoMegaPrivyInternal wagmiConfig={wagmiConfig}>
        {wagmiConfig ? (
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
          </QueryClientProvider>
        ) : (
          children
        )}
      </GelatoMegaPrivyInternal>
    </PrivyProvider>
  );
};
