import { GelatoMegaDynamicConnectButton } from "@gelatomega/react-dynamic";
import { GelatoMegaPrivyConnectButton } from "@gelatomega/react-privy";
import type { FC, ReactNode } from "react";

import { useGelatoMegaProviderContext } from "../provider.js";

interface GelatoMegaConnectButtonProps {
  children: ReactNode;
}

export const GelatoMegaConnectButton: FC<GelatoMegaConnectButtonProps> = ({ children }) => {
  const { type } = useGelatoMegaProviderContext();
  return (
    <>
      {type === "dynamic" ? (
        <GelatoMegaDynamicConnectButton>{children}</GelatoMegaDynamicConnectButton>
      ) : (
        <GelatoMegaPrivyConnectButton>{children}</GelatoMegaPrivyConnectButton>
      )}
    </>
  );
};
