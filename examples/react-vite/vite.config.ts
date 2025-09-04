import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: [
      "@gelatonetwork/smartwallet",
      "@gelatonetwork/smartwallet-react-dynamic",
      "@gelatonetwork/smartwallet-react-privy",
      "@gelatonetwork/smartwallet-react-sdk"
    ]
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@gelatonetwork/smartwallet": path.resolve(__dirname, "../../src/index.ts"),
      "@gelatonetwork/smartwallet-react-dynamic": path.resolve(
        __dirname,
        "../../plugins/react/dynamic/src/index.ts"
      ),
      "@gelatonetwork/smartwallet-react-privy": path.resolve(
        __dirname,
        "../../plugins/react/privy/src/index.ts"
      ),
      "@gelatonetwork/smartwallet-react-sdk": path.resolve(
        __dirname,
        "../../plugins/react/sdk/src/index.ts"
      )
    }
  }
});
