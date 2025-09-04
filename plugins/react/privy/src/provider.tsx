import {
  createGelatoSmartWalletClient,
  type GelatoSmartWalletClient
} from "@gelatonetwork/smartwallet";
import type {
  GelatoSmartAccount,
  GelatoSmartAccountSCW
} from "@gelatonetwork/smartwallet/accounts";
import type { wallet } from "@gelatonetwork/smartwallet-react-types";
import { PrivyProvider, usePrivy, useSignAuthorization, useWallets } from "@privy-io/react-auth";
import { createConfig, WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChainId } from "caip";
import type { FC, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  type Account,
  type Chain,
  createWalletClient,
  custom,
  type Hex,
  type Transport
} from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { type PrepareAuthorizationParameters, prepareAuthorization } from "viem/actions";
import * as chains from "viem/chains";
import { extractChain } from "viem/utils";
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
  scw: GelatoSmartAccountSCW;
  wagmi: { config?: WagmiConfig };
  apiKey?: string;
}> = ({ children, wagmi, apiKey, scw }) => {
  const { ready, authenticated, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signAuthorization } = useSignAuthorization();

  const [smartWalletClient, setSmartWalletClient] = useState<GelatoSmartWalletClient<
    Transport,
    Chain,
    GelatoSmartAccount
  > | null>(null);
  const currentChainIdRef = useRef<string | null>(null);

  const logoutWrapper = useCallback(async () => {
    if (!smartWalletClient) {
      return;
    }

    setSmartWalletClient(null);
    await logout();
  }, [smartWalletClient, logout]);

  const switchNetwork = useCallback(
    async (chainId: number) => {
      if (!smartWalletClient || !wallets || wallets.length === 0) {
        return;
      }

      const primaryWallet = wallets[0];

      try {
        await primaryWallet.switchChain(chainId);
        // The useEffect will handle recreating the client with the new chain
        // We don't need to manually call smartWalletClient.switchChain
      } catch (error) {
        console.error("Failed to switch network:", error);
      }
    },
    [smartWalletClient, wallets]
  );

  useEffect(() => {
    if (!ready || !walletsReady) {
      return;
    }

    if (!authenticated || !wallets || wallets.length === 0) {
      setSmartWalletClient(null);
      currentChainIdRef.current = null;
      return;
    }

    const primaryWallet = wallets[0];
    const walletChainId = primaryWallet.chainId;

    // Only recreate the client if the chain ID changes
    if (currentChainIdRef.current === walletChainId && smartWalletClient) {
      return;
    }

    const fetchWalletClient = async () => {
      try {
        // Privy wallet provides chainId in CAIP2 format
        const { reference: chainId } = ChainId.parse(primaryWallet.chainId);
        const chain = extractChain({
          chains: Object.values(chains),
          // biome-ignore lint/suspicious/noExplicitAny: chainId type override
          id: Number(chainId) as any
        });

        if (!chain) {
          return;
        }

        const provider = await primaryWallet.getEthereumProvider();
        const client = createWalletClient({
          account: primaryWallet.address as Hex,
          chain,
          transport: custom(provider)
        });

        (
          client.account as SmartAccount & { signAuthorization: typeof client.signAuthorization }
        ).signAuthorization = async (parameters: PrepareAuthorizationParameters<Account>) => {
          const preparedAuthorization = await prepareAuthorization(client, parameters);

          const signedAuthorization = await signAuthorization({
            chainId: preparedAuthorization.chainId,
            contractAddress: preparedAuthorization.address,
            nonce: preparedAuthorization.nonce
          });

          return signedAuthorization;
        };

        const walletClientGelato = await createGelatoSmartWalletClient<Transport, Chain, Account>(
          client,
          { apiKey, scw }
        );
        setSmartWalletClient(walletClientGelato);
        currentChainIdRef.current = walletChainId;
      } catch (error) {
        console.error("Failed to get wallet client:", error);
      }
    };

    fetchWalletClient();
  }, [ready, walletsReady, authenticated, apiKey, scw, signAuthorization]);

  return (
    <GelatoSmartWalletPrivyProviderContext.Provider
      value={{
        gelato: {
          client: smartWalletClient as GelatoSmartWalletClient<Transport, Chain, GelatoSmartAccount>
        },
        logout: logoutWrapper,
        switchNetwork,
        wagmi: {
          config: wagmi.config
        }
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
      clientId={settings.waas.clientId}
      config={{
        defaultChain:
          settings.defaultChain ?? settings.wagmi?.config?.chains?.[0] ?? chains.sepolia,
        supportedChains: settings.waas.customChains?.supportedChains
      }}
    >
      <GelatoSmartWalletPrivyInternal
        apiKey={settings.apiKey}
        scw={settings.scw}
        wagmi={{ config: wagmiConfig }}
      >
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
