import type React from "react";
import { createContext, createElement, useEffect, useState } from "react";

import {
  type GelatoSmartWalletClient,
  type GelatoSmartWalletParams,
  createGelatoSmartWalletClient
} from "@gelatonetwork/smartwallet";
import type { Account, Chain, Transport } from "viem";
import { useWalletClient } from "wagmi";

export const GelatoSmartWalletContext = createContext<{
  client?: GelatoSmartWalletClient<Transport, Chain, Account>;
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
    GelatoSmartWalletClient<Transport, Chain, Account> | undefined
  >(undefined);

  useEffect(() => {
    if (!isLoading && walletClient) {
      const _gelato = createGelatoSmartWalletClient(walletClient, params);
      setGelatoClient(_gelato);
    } else if (!isLoading && !walletClient) {
      setGelatoClient(undefined);
    }
  }, [walletClient, isLoading, params]);

  const props = { value: { client: gelatoClient } };

  return createElement(GelatoSmartWalletContext.Provider, props, children);
};
