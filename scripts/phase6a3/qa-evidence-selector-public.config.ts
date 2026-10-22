import {defineConfig} from '@playwright/test';
import original from '../../playwright.config.js';
import {fileURLToPath} from 'node:url';
export default defineConfig({...original,
 testDir:fileURLToPath(new URL('../../e2e',import.meta.url)),
 webServer:undefined,
 use:{...original.use,baseURL:'https://grc.tecdex.net'}
});
