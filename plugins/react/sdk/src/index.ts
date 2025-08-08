import type { wallet } from "@gelatonetwork/smartwallet-react-types";

export {
  GelatoSmartWalletContextProvider,
  useGelatoSmartWalletProviderContext
} from "./provider.js";
export { GelatoSmartWalletConnectButton } from "./components/connect.js";

export const dynamic = (appId: string, options?: wallet.DynamicOptions) => {
  return {
    type: "dynamic" as wallet.ProviderType,
    appId,
    customChains: {
      evmNetworks: options?.evmNetworks
    }
  };
};

export const privy = (appId: string, options?: wallet.PrivyOptions) => {
  return {
    type: "privy" as wallet.ProviderType,
    appId,
    clientId: options?.clientId,
    customChains: {
      supportedChains: options?.supportedChains
    }
  };
};

export const wagmi = (config: wallet.WagmiCreateConfigParameters) => {
  return {
    config
  };
};
