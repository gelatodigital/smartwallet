console.warn(
  "[@gelatonetwork/smartwallet-react-privy] DEPRECATED: This package is deprecated. " +
  "Please migrate to @gelatocloud/gasless. " +
  "See https://github.com/gelatodigital/gasless"
);

export { GelatoSmartWalletPrivyConnectButton } from "./components/connect.js";
export {
  GelatoSmartWalletPrivyContextProvider,
  useGelatoSmartWalletPrivyContext
} from "./provider.js";
