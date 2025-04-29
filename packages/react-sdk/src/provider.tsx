import {
  GelatoMegaDynamicContextProvider,
  useGelatoMegaDynamicContext
} from "@gelatomega/react-dynamic";
import { GelatoMegaPrivyContextProvider, useGelatoMegaPrivyContext } from "@gelatomega/react-privy";
import type { wallet } from "@gelatomega/react-types";
import type React from "react";
import { type ReactNode, createContext, useContext } from "react";
import { sepolia } from "viem/chains";

type ProviderType = "dynamic" | "privy";

interface GelatoMegaProviderContextType extends wallet.ProviderContext {
  type: ProviderType;
}

const GelatoMegaProviderContext = createContext<GelatoMegaProviderContextType | undefined>(
  undefined
);

export const useGelatoMegaProviderContext = () => {
  const context = useContext(GelatoMegaProviderContext);
  if (!context) {
    throw new Error("useGelatoMegaProviderContext must be used within a GelatoMegaContextProvider");
  }
  return context;
};

interface GelatoMegaProviderProps extends wallet.ProviderProps {
  type: ProviderType;
}

export const GelatoMegaContextProvider: React.FC<GelatoMegaProviderProps> = ({
  children,
  type,
  settings
}) => {
  const GelatoMegaProviderInner: React.FC<{ children: ReactNode }> = ({ children }) => {
    const context =
      type === "dynamic" ? useGelatoMegaDynamicContext() : useGelatoMegaPrivyContext();
    return (
      <GelatoMegaProviderContext.Provider value={{ ...context, type }}>
        {children}
      </GelatoMegaProviderContext.Provider>
    );
  };

  return (
    <>
      {type === "dynamic" ? (
        <GelatoMegaDynamicContextProvider
          settings={{
            appId: settings.appId,
            defaultChain: settings.defaultChain ?? sepolia,
            wagmiConfigParameters: settings.wagmiConfigParameters
          }}
        >
          <GelatoMegaProviderInner>{children}</GelatoMegaProviderInner>
        </GelatoMegaDynamicContextProvider>
      ) : (
        <GelatoMegaPrivyContextProvider
          settings={{
            appId: settings.appId,
            defaultChain: settings.defaultChain ?? sepolia,
            wagmiConfigParameters: settings.wagmiConfigParameters
          }}
        >
          <GelatoMegaProviderInner>{children}</GelatoMegaProviderInner>
        </GelatoMegaPrivyContextProvider>
      )}
    </>
  );
};
