import type { wallet } from "@gelatonetwork/smartwallet-react-types";

export {
  GelatoSmartWalletContextProvider,
  useGelatoSmartWalletProviderContext
} from "./provider.js";
export { GelatoSmartWalletConnectButton } from "./components/connect.js";

export const dynamic = (appId: string) => {
  return {
    type: "dynamic" as wallet.ProviderType,
    appId
  };
};

export const privy = (appId: string) => {
  return {
    type: "privy" as wallet.ProviderType,
    appId
  };
};

export const wagmi = (config: wallet.WagmiCreateConfigParameters) => {
  return {
    config
  };
};
