import { PrivyProvider, usePrivy, useSignAuthorization, useWallets } from "@privy-io/react-auth";
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

interface GelatoMegaPrivyContextType {
  walletClient: WalletClient<Transport, Chain, Account> | null;
  handleLogOut: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

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

interface GelatoMegaPrivyContextProps {
  children: ReactNode;
  settings: {
    environmentId: string;
  };
}

const GelatoMegaPrivyInternal: FC<{ children: ReactNode }> = ({ children }) => {
  const { ready, authenticated, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signAuthorization } = useSignAuthorization();

  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  const customHandleLogOut = async () => {
    const disableLogout = !ready || (ready && !authenticated);

    if (!disableLogout) {
      setWalletClient(null);
      logout();
    }
  };

  const switchNetwork = async (chainId: number) => {
    if (!walletsReady || !wallets || wallets.length === 0) {
      return;
    }

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const chain = extractChain({ chains: Object.values(chains), id: chainId as any });

    if (!chain) {
      return;
    }

    const primaryWallet = wallets[0];

    await primaryWallet.switchChain(chain.id);

    if (walletClient) {
      walletClient.switchChain({ id: chain.id });
    } else {
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
    }
  };

  useEffect(() => {
    const fetchWalletClient = async () => {
      if (!walletsReady) {
        return;
      }

      const primaryWallet = wallets[0];

      try {
        const chainId = primaryWallet.chainId;

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

        setWalletClient(walletClient);
      } catch (error) {
        console.error("Failed to get wallet client:", error);
      }
    };

    fetchWalletClient();
  }, [wallets, walletsReady]);

  return (
    <GelatoMegaPrivyProviderContext.Provider
      value={{
        walletClient: walletClient as WalletClient<Transport, Chain, Account>,
        handleLogOut: customHandleLogOut,
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
  return (
    <PrivyProvider appId={settings.environmentId}>
      <GelatoMegaPrivyInternal>{children}</GelatoMegaPrivyInternal>
    </PrivyProvider>
  );
};
