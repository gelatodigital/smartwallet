import { EthereumWalletConnectors, isEthereumWallet } from '@dynamic-labs/ethereum';
import { DynamicContextProvider, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import type { FC, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { WalletClient } from 'viem';
import { hashAuthorization } from 'viem/utils';

interface GelatoMegaDynamicContextType {
  walletClient: WalletClient | null;
  handleLogOut: () => void;
}

const GelatoMegaDynamicProviderContext = createContext<GelatoMegaDynamicContextType | undefined>(
  undefined
);

export const useGelatoMegaDynamicContext = () => {
  const context = useContext(GelatoMegaDynamicProviderContext);
  if (!context) {
    throw new Error('useGelatoMegaDynamicProvider must be used within a GelatoMegaDynamicProvider');
  }
  return context;
};

interface GelatoMegaDynamicContextProps {
  children: ReactNode;
  settings: {
    environmentId: string;
  };
}

const GelatoMegaDynamicInternal: FC<{ children: ReactNode }> = ({ children }) => {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  const customHandleLogOut = async () => {
    setWalletClient(null);
    handleLogOut();
  };

  useEffect(() => {
    const fetchWalletClient = async () => {
      if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
        return;
      }

      try {
        const client = await primaryWallet.getWalletClient();

        client.account.signAuthorization = async (parameters) => {
          const { chainId, nonce } = parameters;
          const address = parameters.contractAddress ?? parameters.address;

          const hashedAuthorization = hashAuthorization({
            address,
            chainId,
            nonce
          });
          const signature = await client.signMessage({
            message: {
              raw: hashedAuthorization
            }
          });

          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          return signature as any;
        };

        setWalletClient(client);
      } catch (error) {
        console.error('Failed to get wallet client:', error);
      }
    };

    fetchWalletClient();
  }, [primaryWallet]);

  return (
    <GelatoMegaDynamicProviderContext.Provider
      value={{ walletClient, handleLogOut: customHandleLogOut }}
    >
      {children}
    </GelatoMegaDynamicProviderContext.Provider>
  );
};

export const GelatoMegaDynamicContextProvider: FC<GelatoMegaDynamicContextProps> = ({
  children,
  settings
}) => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: settings.environmentId,
        walletConnectors: [EthereumWalletConnectors]
      }}
    >
      <GelatoMegaDynamicInternal>{children}</GelatoMegaDynamicInternal>
    </DynamicContextProvider>
  );
};
