import { EthereumWalletConnectors, isEthereumWallet } from "@dynamic-labs/ethereum";
import {
  DynamicContextProvider,
  useDynamicContext
} from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { isDynamicWaasConnector } from "@dynamic-labs/wallet-connector-core";
import {
  type GelatoSmartWalletClient,
  createGelatoSmartWalletClient
} from "@gelatonetwork/smartwallet";
import type { wallet } from "@gelatonetwork/smartwallet-react-types";
import type {
  GelatoSmartAccount,
  GelatoSmartAccountSCW
} from "@gelatonetwork/smartwallet/accounts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FC, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Account, Chain, PrepareAuthorizationParameters, Transport } from "viem";
import type { SignAuthorizationReturnType } from "viem/accounts";
import { prepareAuthorization } from "viem/actions";
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
  scw: GelatoSmartAccountSCW;
}> = ({ children, defaultChain, wagmi, apiKey, scw }) => {
  const [chainId, setChainId] = useState<number>(defaultChain.id);
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [smartWalletClient, setSmartWalletClient] = useState<GelatoSmartWalletClient<
    Transport,
    Chain,
    GelatoSmartAccount
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

      if (!connector || !isDynamicWaasConnector(connector)) {
        return;
      }

      try {
        if (chainId) {
          await primaryWallet.switchNetwork(chainId);
        }

        const client = await primaryWallet.getWalletClient();

        client.account.signAuthorization = async (parameters) => {
          const preparedAuthorization = await prepareAuthorization(client, parameters);

          const signedAuthorization = await (connector as unknown as {signAuthorization: (parameters: PrepareAuthorizationParameters<Account>) => Promise<SignAuthorizationReturnType>}).signAuthorization(preparedAuthorization);

          return {
            address: preparedAuthorization.address,
            chainId: preparedAuthorization.chainId,
            nonce: preparedAuthorization.nonce,
            r: signedAuthorization.r,
            s: signedAuthorization.s,
            v: signedAuthorization.v,
            yParity: signedAuthorization.yParity
          } as SignAuthorizationReturnType;
        };

        const smartWalletClient = await createGelatoSmartWalletClient(client, {
          apiKey,
          scw
        });

        setSmartWalletClient(smartWalletClient);
      } catch (error) {
        console.error("Failed to get wallet client:", error);
        console.log(`Make sure you have enabled ${chainId} on your Dynamic account.`);
      }
    };

    fetchWalletClient();
  }, [primaryWallet, chainId, apiKey, scw]);

  return (
    <GelatoSmartWalletDynamicProviderContext.Provider
      value={{
        gelato: {
          client: smartWalletClient as GelatoSmartWalletClient<Transport, Chain, GelatoSmartAccount>
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
        walletConnectors: [EthereumWalletConnectors],
        overrides: {
          evmNetworks: settings.waas.customChains?.evmNetworks
        }
      }}
    >
      <GelatoSmartWalletDynamicInternal
        defaultChain={settings.defaultChain ?? settings.wagmi?.config?.chains?.[0] ?? sepolia}
        wagmi={{
          config: wagmiConfig
        }}
        apiKey={settings.apiKey}
        scw={settings.scw}
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
