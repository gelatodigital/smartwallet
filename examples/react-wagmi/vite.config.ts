import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ["@gelatonetwork/smartwallet"]
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@gelatonetwork/smartwallet": path.resolve(__dirname, "../../src/index.ts"),
      "@gelatonetwork/smartwallet-react-wagmi": path.resolve(
        __dirname,
        "../../plugins/react/wagmi/src/index.ts"
      )
    }
  }
});
