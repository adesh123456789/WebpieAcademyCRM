import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/support/global-setup.ts"],
    setupFiles: ["./tests/support/setup.ts"],
    pool: "forks",
    isolate: true,
    maxWorkers: 2,
    minWorkers: 1,
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
