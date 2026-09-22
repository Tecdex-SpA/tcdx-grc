import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/backend/src/**/*.test.ts", "apps/frontend/src/**/*.test.ts", "apps/frontend/src/**/*.test.tsx", "packages/*/src/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false
  }
});
