import { GelatoSmartWalletProvider } from "@gelatonetwork/smartwallet-react-wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";

import App from "./App.tsx";
import { config } from "./wagmi.ts";

import "./index.css";

const queryClient = new QueryClient();

const sponsorApiKey = import.meta.env.VITE_SPONSOR_API_KEY;

// biome-ignore lint/style/noNonNullAssertion: example
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <GelatoSmartWalletProvider params={sponsorApiKey}>
          <App />
        </GelatoSmartWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
