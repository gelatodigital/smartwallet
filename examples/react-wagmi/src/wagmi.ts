import { http, createConfig } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [sepolia, baseSepolia],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http()
  }
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
