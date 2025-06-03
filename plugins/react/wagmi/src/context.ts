import type React from "react";
import { createContext, createElement, useEffect, useState } from "react";

import {
  type GelatoSmartWalletClient,
  type GelatoSmartWalletParams,
  createGelatoSmartWalletClient
} from "@gelatonetwork/smartwallet";
import type { GelatoSmartAccount } from "@gelatonetwork/smartwallet/accounts";
import type { Chain, Transport } from "viem";
import { useWalletClient } from "wagmi";

export const GelatoSmartWalletContext = createContext<{
  client?: GelatoSmartWalletClient<Transport, Chain, GelatoSmartAccount>;
}>({
  client: undefined
});

export type GelatoSmartWalletProviderProps = {
  params?: GelatoSmartWalletParams;
};

export const GelatoSmartWalletProvider = (
  parameters: React.PropsWithChildren<GelatoSmartWalletProviderProps>
) => {
  const { params, children } = parameters;

  const { data: walletClient, isLoading } = useWalletClient();

  const [gelatoClient, setGelatoClient] = useState<
    GelatoSmartWalletClient<Transport, Chain, GelatoSmartAccount> | undefined
  >(undefined);

  useEffect(() => {
    const fetchGelatoClient = async () => {
      if (!isLoading && walletClient) {
        const _gelato = await createGelatoSmartWalletClient(walletClient, params);
        setGelatoClient(_gelato);
      } else if (!isLoading && !walletClient) {
        setGelatoClient(undefined);
      }
    };

    fetchGelatoClient();
  }, [walletClient, isLoading, params]);

  const props = { value: { client: gelatoClient } };

  return createElement(GelatoSmartWalletContext.Provider, props, children);
};
