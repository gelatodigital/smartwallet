import { EthereumWalletConnectors, isEthereumWallet } from '@dynamic-labs/ethereum';
import { DynamicContextProvider, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import type React from 'react';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { WalletClient } from 'viem';

interface GelatoMegaDynamicContextType {
  walletClient: WalletClient | null;
  handleLogOut: () => void;
}

const GelatoMegaDynamicProviderContext = createContext<GelatoMegaDynamicContextType | undefined>(
  undefined,
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

export const GelatoMegaDynamicContextProvider: React.FC<GelatoMegaDynamicContextProps> = ({
  children,
  settings,
}) => {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  useEffect(() => {
    const fetchWalletClient = async () => {
      if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
        throw new Error('No primary wallet found');
      }

      try {
        const client = await primaryWallet.getWalletClient();
        setWalletClient(client);
      } catch (error) {
        console.error('Failed to get wallet client:', error);
      }
    };

    fetchWalletClient();
  }, [primaryWallet]);

  return (
    <DynamicContextProvider
      settings={{
        environmentId: settings.environmentId,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <GelatoMegaDynamicProviderContext.Provider value={{ walletClient, handleLogOut }}>
        {children}
      </GelatoMegaDynamicProviderContext.Provider>
    </DynamicContextProvider>
  );
};
