import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import type { FC, ReactNode } from "react";

interface GelatoMegaDynamicConnectButtonProps {
  children: ReactNode;
}

export const GelatoMegaDynamicConnectButton: FC<GelatoMegaDynamicConnectButtonProps> = ({
  children
}) => {
  return <DynamicConnectButton>{children}</DynamicConnectButton>;
};
