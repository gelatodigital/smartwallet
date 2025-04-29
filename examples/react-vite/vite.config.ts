import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@gelatodigital/smartwallet": path.resolve(__dirname, "../../src/index.ts"),
      "@gelatodigital/smartwallet-react-dynamic": path.resolve(
        __dirname,
        "../../plugins/react/dynamic/src/index.ts"
      ),
      "@gelatodigital/smartwallet-react-privy": path.resolve(
        __dirname,
        "../../plugins/react/privy/src/index.ts"
      ),
      "@gelatodigital/smartwallet-react-sdk": path.resolve(
        __dirname,
        "../../plugins/react/sdk/src/index.ts"
      )
    }
  },
  optimizeDeps: {
    include: [
      "@gelatodigital/smartwallet",
      "@gelatodigital/smartwallet-react-dynamic",
      "@gelatodigital/smartwallet-react-privy",
      "@gelatodigital/smartwallet-react-sdk"
    ]
  }
});
