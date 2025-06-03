import { http, createConfig } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";
import { safe, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [sepolia, baseSepolia],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http()
  },
  connectors: [
    safe(),
    walletConnect({
      projectId: "WALLET_CONNECT_PROJECT_ID"
    })
  ]
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
