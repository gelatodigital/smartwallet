import { EthereumWalletConnectors, isEthereumWallet } from "@dynamic-labs/ethereum";
import { DynamicContextProvider, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import type { wallet } from "@gelatomega/react-types";
import type { FC, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Account, Chain, Transport, WalletClient } from "viem";

type GelatoMegaDynamicContextType = wallet.ProviderContext;

const GelatoMegaDynamicProviderContext = createContext<GelatoMegaDynamicContextType | undefined>(
  undefined
);

export const useGelatoMegaDynamicContext = () => {
  const context = useContext(GelatoMegaDynamicProviderContext);
  if (!context) {
    throw new Error("useGelatoMegaDynamicProvider must be used within a GelatoMegaDynamicProvider");
  }
  return context;
};

type GelatoMegaDynamicContextProps = wallet.ProviderProps;

const GelatoMegaDynamicInternal: FC<{ children: ReactNode; defaultChain: Chain | undefined }> = ({
  children,
  defaultChain
}) => {
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

      try {
        if (defaultChain) {
          await primaryWallet.switchNetwork(defaultChain.id);
        }

        const client = await primaryWallet.getWalletClient();

        // TODO: Dynamic provider having issues with signing auth
        // client.account.signAuthorization = async (parameters) => {
        //   const { chainId, nonce } = parameters;
        //   const address = parameters.contractAddress ?? parameters.address;

        //   const hashedAuthorization = hashAuthorization({
        //     address,
        //     chainId,
        //     nonce
        //   });
        //   TODO there is no exposed sign method on the wallet client
        //   const signature = await client.sign({
        //     message: {
        //       raw: hashedAuthorization
        //     }
        //   });

        //   const parsedSignature = parseSignature(signature);

        //   const signedAuthorization: SignedAuthorization = {
        //     address,
        //     chainId,
        //     nonce,
        //     ...parsedSignature
        //   };

        //   return signedAuthorization;
        // };

        setWalletClient(client);
      } catch (error) {
        console.error("Failed to get wallet client:", error);
      }
    };

    fetchWalletClient();
  }, [primaryWallet, defaultChain]);

  return (
    <GelatoMegaDynamicProviderContext.Provider
      value={{
        walletClient: walletClient as WalletClient<Transport, Chain, Account>,
        logout: logoutHandler,
        switchNetwork
      }}
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
        environmentId: settings.appId,
        walletConnectors: [EthereumWalletConnectors]
      }}
    >
      <GelatoMegaDynamicInternal defaultChain={settings.defaultChain}>
        {children}
      </GelatoMegaDynamicInternal>
    </DynamicContextProvider>
  );
};
