import {defineConfig} from '@playwright/test';
import previous from './playwright-b04-resolution.config.js';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const evidence=root+'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/local-definitions-01-resolution-20261022/';
export default defineConfig({...previous,outputDir:evidence+'browser',reporter:[['list'],['json',{outputFile:evidence+'browser-results.json'}]]});
