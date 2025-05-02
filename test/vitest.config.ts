import { basename, dirname, join } from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  return {
    test: {
      alias: {
        "@gelatodigital/smartwallet": join(__dirname, "../src")
      },
      coverage: {
        all: false,
        include: ["**/src/**"],
        provider: "v8",
        reporter: process.env.CI ? ["lcov"] : ["text", "json", "html"]
      },
      include: ["test/**/*.test.ts"],
      passWithNoTests: true,
      resolveSnapshotPath: (path, ext) =>
        join(join(dirname(path), "_snapshots"), `${basename(path)}${ext}`),
      setupFiles: [join(__dirname, "./setup.ts")],
      testTimeout: 30_000,
      env: loadEnv(mode, process.cwd(), "")
    }
  };
});
