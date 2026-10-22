import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const evidence=root+'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/code-b04-01-full-resolution-20261022/';
export default defineConfig({testDir:root+'e2e',testMatch:'b04-contextual-resolution.spec.ts',outputDir:evidence+'browser',workers:1,reporter:[['list'],['json',{outputFile:evidence+'browser-results.json'}]],use:{baseURL:'http://127.0.0.1:4184',trace:'retain-on-failure'},projects:[{name:'desktop',use:{browserName:'chromium',viewport:{width:1536,height:1024}}},{name:'narrow',use:{browserName:'chromium',viewport:{width:390,height:844}}}],webServer:{command:`"${process.execPath}" "${root}apps/frontend/node_modules/vite/bin/vite.js" preview --host 127.0.0.1 --port 4184 --strictPort`,cwd:root+'apps/frontend',url:'http://127.0.0.1:4184',reuseExistingServer:false}});
