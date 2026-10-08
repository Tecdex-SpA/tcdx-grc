import { createRequire } from 'node:module';
const require = createRequire('/Users/andresbarouh/repos/tcdx-grc/package.json');
const { defineConfig, devices } = require('@playwright/test');
export default defineConfig({
 testDir: '/Users/andresbarouh/repos/tcdx-grc/e2e', timeout: 30000,
 use: { baseURL: 'http://127.0.0.1:4197', launchOptions: { args: ['--host-resolver-rules=MAP grc.tecdex.net ~NOTFOUND, MAP iam.grc.tecdex.net ~NOTFOUND'] }, trace: 'off', screenshot: 'off' },
 projects: [
  { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1536, height: 1024 } } },
  { name: 'chromium-laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  { name: 'chromium-tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-narrow', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }
 ],
});
