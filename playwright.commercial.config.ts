import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", testMatch: "subscription-change-plan.real.spec.ts", timeout: 30_000,
  workers: 1, fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:4174", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "commercial-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1536, height: 1024 } } },
    { name: "commercial-narrow", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } }
  ],
  webServer: {
    command: "VITE_API_ORIGIN=http://127.0.0.1:55435 npm --prefix apps/frontend run dev -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174", reuseExistingServer: false
  }
});
