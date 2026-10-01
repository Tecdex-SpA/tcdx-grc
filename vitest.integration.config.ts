import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/backend/src/**/*.postgres.test.ts"],
    environment: "node",
    passWithNoTests: false
  }
});
