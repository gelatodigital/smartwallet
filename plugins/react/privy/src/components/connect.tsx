import { useLogin, usePrivy } from "@privy-io/react-auth";
import type { FC, ReactNode } from "react";

interface GelatoSmartWalletPrivyConnectButtonProps {
  children: ReactNode;
}

export const GelatoSmartWalletPrivyConnectButton: FC<GelatoSmartWalletPrivyConnectButtonProps> = ({
  children
}) => {
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const disableLogin = !ready || (ready && authenticated);

  return (
    <button type="button" disabled={disableLogin} onClick={login}>
      {children}
    </button>
  );
};
