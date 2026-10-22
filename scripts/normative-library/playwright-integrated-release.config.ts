import {defineConfig} from '@playwright/test';
import previous from './playwright-b04-resolution.config.js';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const custody=root+'.release-custody/integrated-qa-release-20261022/';
export default defineConfig({...previous,outputDir:custody+'browser-b04',reporter:[['list'],['json',{outputFile:custody+'browser-b04.json'}]]});
