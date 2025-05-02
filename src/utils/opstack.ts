import type { Chain, ChainContract } from "viem";

export const isOpStack = (chain: Chain) => {
  return (
    (chain.contracts?.gasPriceOracle as ChainContract)?.address ===
    "0x420000000000000000000000000000000000000F"
  );
};
