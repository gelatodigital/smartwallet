import { EthereumWalletConnectors, isEthereumWallet } from "@dynamic-labs/ethereum";
import { DynamicContextProvider, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { isTurnkeyWalletConnector } from "@dynamic-labs/wallet-connector-core";
import {
  type GelatoSmartWalletClient,
  createGelatoSmartWalletClient
} from "@gelatonetwork/smartwallet";
import type { wallet } from "@gelatonetwork/smartwallet-react-types";
import type { Wallet } from "@gelatonetwork/smartwallet/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import type { FC, ReactNode } from "react";
import type { Account, Chain, Transport } from "viem";
import { sepolia } from "viem/chains";
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
  defaultChain: Chain;
  wagmi: { config?: WagmiConfig };
  apiKey?: string;
  wallet?: Wallet;
}> = ({ children, defaultChain, wagmi, apiKey, wallet }) => {
  const [chainId, setChainId] = useState<number>(defaultChain.id);
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [smartWalletClient, setSmartWalletClient] = useState<GelatoSmartWalletClient<
    Transport,
    Chain,
    Account
  > | null>(null);

  const logoutHandler = async () => {
    setSmartWalletClient(null);
    await handleLogOut();
  };

  const switchNetwork = async (chainId: number) => {
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
      return;
    }

    await primaryWallet.switchNetwork(chainId);
    setChainId(chainId);
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
        if (chainId) {
          await primaryWallet.switchNetwork(chainId);
        }

        const client = await primaryWallet.getWalletClient();

        client.account.signAuthorization = async (parameters) => {
          const { chainId, nonce } = parameters;
          const contractAddress = parameters.contractAddress ?? parameters.address;

          const signedAuthorization = await connector.signAuthorization({
            address: contractAddress,
            chainId,
            nonce
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

        const smartWalletClient = createGelatoSmartWalletClient<Transport, Chain, Account>(client, {
          apiKey,
          wallet
        });
        setSmartWalletClient(smartWalletClient);
      } catch (error) {
        console.error("Failed to get wallet client:", error);
      }
    };

    fetchWalletClient();
  }, [primaryWallet, chainId, apiKey, wallet]);

  return (
    <GelatoSmartWalletDynamicProviderContext.Provider
      value={{
        gelato: {
          client: smartWalletClient as GelatoSmartWalletClient<Transport, Chain, Account>
        },
        wagmi: {
          config: wagmi.config
        },
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
  const wagmiConfig = settings.wagmi ? createConfig(settings.wagmi.config) : undefined;

  return (
    <DynamicContextProvider
      settings={{
        environmentId: settings.waas.appId,
        walletConnectors: [EthereumWalletConnectors]
      }}
    >
      <GelatoSmartWalletDynamicInternal
        defaultChain={settings.defaultChain ?? settings.wagmi?.config?.chains?.[0] ?? sepolia}
        wagmi={{
          config: wagmiConfig
        }}
        apiKey={settings.apiKey}
        wallet={settings.wallet}
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
