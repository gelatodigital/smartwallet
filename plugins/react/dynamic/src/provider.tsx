import { EthereumWalletConnectors, isEthereumWallet } from "@dynamic-labs/ethereum";
import { DynamicContextProvider, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { isTurnkeyWalletConnector } from "@dynamic-labs/wallet-connector-core";
import type { wallet } from "@gelatodigital/smartwallet-react-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FC, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Account, Chain, Transport, WalletClient } from "viem";
import { type Config as WagmiConfig, WagmiProvider, createConfig } from "wagmi";

type GelatoSmartWalletDynamicContextType = wallet.ProviderContext;

const GelatoSmartWalletDynamicProviderContext = createContext<
  GelatoSmartWalletDynamicContextType | undefined
>(undefined);

export const useGelatoSmartWalletDynamicContext = () => {
  const context = useContext(GelatoSmartWalletDynamicProviderContext);
  if (!context) {
    throw new Error(
      "useGelatoSmartWalletDynamicProvider must be used within a GelatoSmartWalletDynamicProvider"
    );
  }
  return context;
};

type GelatoSmartWalletDynamicContextProps = wallet.ProviderProps;

const GelatoSmartWalletDynamicInternal: FC<{
  children: ReactNode;
  defaultChain: Chain | undefined;
  wagmiConfig: WagmiConfig | undefined;
}> = ({ children, defaultChain, wagmiConfig }) => {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  const logoutHandler = async () => {
    setWalletClient(null);
    await handleLogOut();
  };

  const switchNetwork = async (chain: Chain) => {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
      return;
    }

    await primaryWallet.switchNetwork(chain.id);
  };

  useEffect(() => {
    const fetchWalletClient = async () => {
      if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
        return;
      }

      const connector = primaryWallet.connector;

      if (!connector || !isTurnkeyWalletConnector(connector)) {
        return;
      }

      try {
        if (defaultChain) {
          await primaryWallet.switchNetwork(defaultChain.id);
        }

        const client = await primaryWallet.getWalletClient();

        client.account.signAuthorization = async (parameters) => {
          const { chainId, nonce } = parameters;
          const contractAddress = parameters.contractAddress ?? parameters.address;

          const signedAuthorization = await connector.experimental_signAuthorization({
            contractAddress
          });

          return {
            address: contractAddress,
            chainId,
            nonce,
            r: signedAuthorization.r,
            s: signedAuthorization.s,
            v: signedAuthorization.v,
            yParity: signedAuthorization.yParity
          };
        };

        setWalletClient(client);
      } catch (error) {
        console.error("Failed to get wallet client:", error);
      }
    };

    fetchWalletClient();
  }, [primaryWallet, defaultChain]);

  return (
    <GelatoSmartWalletDynamicProviderContext.Provider
      value={{
        walletClient: walletClient as WalletClient<Transport, Chain, Account>,
        wagmiConfig,
        logout: logoutHandler,
        switchNetwork
      }}
    >
      {children}
    </GelatoSmartWalletDynamicProviderContext.Provider>
  );
};

export const GelatoSmartWalletDynamicContextProvider: FC<GelatoSmartWalletDynamicContextProps> = ({
  children,
  settings
}) => {
  const queryClient = new QueryClient();
  const wagmiConfig = settings.wagmiConfigParameters
    ? createConfig(settings.wagmiConfigParameters)
    : undefined;
  return (
    <DynamicContextProvider
      settings={{
        environmentId: settings.appId,
        walletConnectors: [EthereumWalletConnectors]
      }}
    >
      <GelatoSmartWalletDynamicInternal
        defaultChain={settings.defaultChain}
        wagmiConfig={wagmiConfig}
      >
        {wagmiConfig ? (
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
            </QueryClientProvider>
          </WagmiProvider>
        ) : (
          children
        )}
      </GelatoSmartWalletDynamicInternal>
    </DynamicContextProvider>
  );
};
