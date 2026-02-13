console.warn(
  "[@gelatonetwork/smartwallet-react-dynamic] DEPRECATED: This package is deprecated. " +
    "Please migrate to @gelatocloud/gasless. " +
    "See https://github.com/gelatodigital/gasless"
);

export { GelatoSmartWalletDynamicConnectButton } from "./components/connect.js";
export {
  GelatoSmartWalletDynamicContextProvider,
  useGelatoSmartWalletDynamicContext
} from "./provider.js";
