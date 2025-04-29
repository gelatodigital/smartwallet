import {
  GelatoSmartWalletDynamicContextProvider,
  useGelatoSmartWalletDynamicContext
} from "@gelatodigital/smartwallet-react-dynamic";
import {
  GelatoSmartWalletPrivyContextProvider,
  useGelatoSmartWalletPrivyContext
} from "@gelatodigital/smartwallet-react-privy";
import type { wallet } from "@gelatodigital/smartwallet-react-types";
import type React from "react";
import { type ReactNode, createContext, useContext } from "react";
import { sepolia } from "viem/chains";

type ProviderType = "dynamic" | "privy";

interface GelatoSmartWalletProviderContextType extends wallet.ProviderContext {
  type: ProviderType;
}

const GelatoSmartWalletProviderContext = createContext<
  GelatoSmartWalletProviderContextType | undefined
>(undefined);

export const useGelatoSmartWalletProviderContext = () => {
  const context = useContext(GelatoSmartWalletProviderContext);
  if (!context) {
    throw new Error(
      "useGelatoSmartWalletProviderContext must be used within a GelatoSmartWalletContextProvider"
    );
  }
  return context;
};

interface GelatoSmartWalletProviderProps extends wallet.ProviderProps {
  type: ProviderType;
}

export const GelatoSmartWalletContextProvider: React.FC<GelatoSmartWalletProviderProps> = ({
  children,
  type,
  settings
}) => {
  const GelatoSmartWalletProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
    const context =
      type === "dynamic"
        ? useGelatoSmartWalletDynamicContext()
        : useGelatoSmartWalletPrivyContext();
    return (
      <GelatoSmartWalletProviderContext.Provider value={{ ...context, type }}>
        {children}
      </GelatoSmartWalletProviderContext.Provider>
    );
  };

  return (
    <>
      {type === "dynamic" ? (
        <GelatoSmartWalletDynamicContextProvider
          settings={{
            appId: settings.appId,
            defaultChain: settings.defaultChain ?? sepolia,
            wagmiConfigParameters: settings.wagmiConfigParameters
          }}
        >
          <GelatoSmartWalletProviderInner>{children}</GelatoSmartWalletProviderInner>
        </GelatoSmartWalletDynamicContextProvider>
      ) : (
        <GelatoSmartWalletPrivyContextProvider
          settings={{
            appId: settings.appId,
            defaultChain: settings.defaultChain ?? sepolia,
            wagmiConfigParameters: settings.wagmiConfigParameters
          }}
        >
          <GelatoSmartWalletProviderInner>{children}</GelatoSmartWalletProviderInner>
        </GelatoSmartWalletPrivyContextProvider>
      )}
    </>
  );
};
