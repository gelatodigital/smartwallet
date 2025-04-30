import type { wallet } from "@gelatodigital/smartwallet-react-types";

export const isDynamic = (type: wallet.ProviderType) => {
  return type === "dynamic";
};
