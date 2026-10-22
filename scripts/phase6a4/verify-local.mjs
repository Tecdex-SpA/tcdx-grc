import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
const out='docs/phase6a/STEP_6A4/evidence/local-20261020';mkdirSync(out,{recursive:true});
const checks=[
 ['typecheck','pnpm',['run','typecheck']],
 ['lint','pnpm',['run','lint']],
 ['build','pnpm',['run','build']],
 ['form-assets',process.execPath,['scripts/phase6a4/generate-form-assets.mjs','--check']],
 ['contract-assets',process.execPath,['scripts/foundations/generate-contract-assets.mjs','--check']],
 ['unit-component','pnpm',['exec','vitest','run','apps/frontend/src/business-forms.test.tsx','apps/frontend/src/core-grc.test.tsx','--reporter=default','--reporter=json',`--outputFile=${out}/unit-results.json`]],
 ['rector-governance','bash',['scripts/verify-rector-governance.sh']],
 ['whitespace','git',['diff','--check']]
];
const results=[];
for(const [id,command,args]of checks){const start=new Date().toISOString();const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:20*1024*1024});writeFileSync(`${out}/${id}.log`,(result.stdout??'')+(result.stderr??''));results.push({id,command:[command,...args],start,end:new Date().toISOString(),exit_code:result.status,status:result.status===0?'PASS':'FAIL',log:`${out}/${id}.log`});console.log(`${id}=${results.at(-1).status}`);}
writeFileSync(`${out}/CHECKS.json`,JSON.stringify({node:process.version,scope:'STEP6A4 local only; component mocks do not establish backend or QA E2E',checks:results},null,2)+'\n');
if(results.some(result=>result.status!=='PASS'))process.exitCode=1;
