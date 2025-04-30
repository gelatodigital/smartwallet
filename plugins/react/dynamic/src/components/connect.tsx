import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import type { FC, ReactNode } from "react";

interface GelatoSmartWalletDynamicConnectButtonProps {
  children: ReactNode;
}

export const GelatoSmartWalletDynamicConnectButton: FC<
  GelatoSmartWalletDynamicConnectButtonProps
> = ({ children }) => {
  return <DynamicConnectButton>{children}</DynamicConnectButton>;
};
