import type { wallet } from "@gelatonetwork/smartwallet-react-types";

export const isDynamic = (type: wallet.ProviderType) => {
  return type === "dynamic";
};
