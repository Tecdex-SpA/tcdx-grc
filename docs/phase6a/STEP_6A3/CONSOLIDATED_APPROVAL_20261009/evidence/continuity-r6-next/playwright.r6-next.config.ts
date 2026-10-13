import { defineConfig } from "@playwright/test";
import base from "/Users/andresbarouh/repos/tcdx-grc/playwright.config.ts";
export default defineConfig({...base, testDir:"/Users/andresbarouh/repos/tcdx-grc/e2e", workers:2, retries:0, timeout:30000,
  outputDir:process.env.R6_BROWSER_OUTPUT_DIR,
  use:{...base.use, baseURL:"http://127.0.0.1:4193"},
  webServer:{command:"npm --prefix apps/frontend run dev -- --host 127.0.0.1 --port 4193 --strictPort", cwd:"/Users/andresbarouh/repos/tcdx-grc", url:"http://127.0.0.1:4193",reuseExistingServer:false,timeout:30000}
});
