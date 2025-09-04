import type { wallet } from "@gelatonetwork/smartwallet-react-types";

export { GelatoSmartWalletConnectButton } from "./components/connect.js";
export {
  GelatoSmartWalletContextProvider,
  useGelatoSmartWalletProviderContext
} from "./provider.js";

export const dynamic = (appId: string, options?: wallet.DynamicOptions) => {
  return {
    appId,
    customChains: {
      evmNetworks: options?.evmNetworks
    },
    type: "dynamic" as wallet.ProviderType
  };
};

export const privy = (appId: string, options?: wallet.PrivyOptions) => {
  return {
    appId,
    clientId: options?.clientId,
    customChains: {
      supportedChains: options?.supportedChains
    },
    type: "privy" as wallet.ProviderType
  };
};

export const wagmi = (config: wallet.WagmiCreateConfigParameters) => {
  return {
    config
  };
};
