import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      "@gelatodigital/smartwallet",
      "@gelatodigital/smartwallet-react-dynamic",
      "@gelatodigital/smartwallet-react-privy",
      "@gelatodigital/smartwallet-react-sdk",
    ],
  },
});
