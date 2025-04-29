import { http } from "viem";
import { sepolia } from "viem/chains";
import { createConfig } from "wagmi";

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http()
  }
});
