console.warn(
  "[@gelatonetwork/smartwallet-react-wagmi] DEPRECATED: This package is deprecated. " +
    "Please migrate to @gelatocloud/gasless. " +
    "See https://github.com/gelatodigital/gasless"
);

export {
  GelatoSmartWalletProvider,
  type GelatoSmartWalletProviderProps
} from "./context.js";
export { useGelatoSmartWalletClient } from "./hooks/useGelatoSmartWalletClient.js";
export {
  type UseSendTransactionParameters,
  type UseSendTransactionReturnType,
  useSendTransaction
} from "./hooks/useSendTransaction.js";
export {
  type UseWaitForTransactionReceiptParameters,
  type UseWaitForTransactionReceiptReturnType,
  useWaitForTransactionReceipt
} from "./hooks/useWaitForTransactionReceipt.js";
