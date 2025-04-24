import { useLogin, usePrivy } from "@privy-io/react-auth";
import type { FC, ReactNode } from "react";

interface GelatoMegaPrivyConnectButtonProps {
  children: ReactNode;
}

export const GelatoMegaPrivyConnectButton: FC<GelatoMegaPrivyConnectButtonProps> = ({
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
