import { GelatoSmartWalletDynamicConnectButton } from "@gelatodigital/smartwallet-react-dynamic";
import { GelatoSmartWalletPrivyConnectButton } from "@gelatodigital/smartwallet-react-privy";
import type { FC, ReactNode } from "react";

import { useGelatoSmartWalletProviderContext } from "../provider.js";
import { isDynamic } from "../utils/index.js";

interface GelatoSmartWalletConnectButtonProps {
  children: ReactNode;
}

export const GelatoSmartWalletConnectButton: FC<GelatoSmartWalletConnectButtonProps> = ({
  children
}) => {
  const { type } = useGelatoSmartWalletProviderContext();

  return (
    <>
      {isDynamic(type) ? (
        <GelatoSmartWalletDynamicConnectButton>{children}</GelatoSmartWalletDynamicConnectButton>
      ) : (
        <GelatoSmartWalletPrivyConnectButton>{children}</GelatoSmartWalletPrivyConnectButton>
      )}
    </>
  );
};
