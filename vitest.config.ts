import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/backend/src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false
  }
});
