import { useContext } from "react";

import { GelatoSmartWalletContext } from "../context.js";

export const useGelatoSmartWalletClient = () => {
  const { client } = useContext(GelatoSmartWalletContext);

  return { client };
};
