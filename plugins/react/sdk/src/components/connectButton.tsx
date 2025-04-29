import { GelatoSmartWalletDynamicConnectButton } from "@gelatodigital/smartwallet-react-dynamic";
import { GelatoSmartWalletPrivyConnectButton } from "@gelatodigital/smartwallet-react-privy";
import type { FC, ReactNode } from "react";

import { useGelatoSmartWalletProviderContext } from "../provider.js";

interface GelatoSmartWalletConnectButtonProps {
  children: ReactNode;
}

export const GelatoSmartWalletConnectButton: FC<GelatoSmartWalletConnectButtonProps> = ({
  children
}) => {
  const { type } = useGelatoSmartWalletProviderContext();
  return (
    <>
      {type === "dynamic" ? (
        <GelatoSmartWalletDynamicConnectButton>{children}</GelatoSmartWalletDynamicConnectButton>
      ) : (
        <GelatoSmartWalletPrivyConnectButton>{children}</GelatoSmartWalletPrivyConnectButton>
      )}
    </>
  );
};
