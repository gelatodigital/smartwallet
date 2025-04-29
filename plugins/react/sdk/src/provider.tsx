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

import { isDynamic } from "./utils/index.js";

interface GelatoSmartWalletProviderContextType extends wallet.ProviderContext {
  type: wallet.ProviderType;
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

type GelatoSmartWalletProviderProps = wallet.ProviderProps;

export const GelatoSmartWalletContextProvider: React.FC<GelatoSmartWalletProviderProps> = ({
  children,
  settings
}) => {
  const GelatoSmartWalletProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
    const context = isDynamic(settings.waas.type)
      ? useGelatoSmartWalletDynamicContext()
      : useGelatoSmartWalletPrivyContext();

    return (
      <GelatoSmartWalletProviderContext.Provider value={{ ...context, type: settings.waas.type }}>
        {children}
      </GelatoSmartWalletProviderContext.Provider>
    );
  };

  return (
    <>
      {isDynamic(settings.waas.type) ? (
        <GelatoSmartWalletDynamicContextProvider settings={settings}>
          <GelatoSmartWalletProviderInner>{children}</GelatoSmartWalletProviderInner>
        </GelatoSmartWalletDynamicContextProvider>
      ) : (
        <GelatoSmartWalletPrivyContextProvider settings={settings}>
          <GelatoSmartWalletProviderInner>{children}</GelatoSmartWalletProviderInner>
        </GelatoSmartWalletPrivyContextProvider>
      )}
    </>
  );
};
