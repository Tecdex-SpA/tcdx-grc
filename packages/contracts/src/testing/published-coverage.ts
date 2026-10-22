/// <reference types="node" />
// Test-only authority reconciliation: preserve frozen historical annotations and apply the published successor.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
const original='docs/executable-contracts/amendments/STEP_6A3_INITIAL_SOURCE_v1.11/';
function bytes(path:string){return readFileSync(path,'utf8');}
function operations(api:any){return Object.entries(api.paths).flatMap(([path,methods])=>Object.entries(methods as Record<string,any>).filter(([method])=>['get','post','put'].includes(method)).map(([method,operation])=>({path,method,operation})));}
export function publishedCoverage(matrix:string){
 const receipt=JSON.parse(bytes(original+'CONTRACT_PUBLICATION_RECEIPT.json')) as {status:string;files:{path:string;sha256:string}[]};
 assert.equal(receipt.status,'PUBLISHED_LOCAL_EFFECTIVE');
 const archived=bytes(original+'snapshots/02_OPENAPI_BASE_CONTRACT.yaml');
 const binding=receipt.files.find(f=>f.path==='docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml');assert(binding);
 assert.equal(createHash('sha256').update(archived).digest('hex'),binding.sha256);
 const old=operations(parse(bytes(original+'predecessor-snapshots/02_OPENAPI_BASE_CONTRACT.yaml'))),next=operations(parse(archived));
 const oldIds=new Set(old.map(o=>o.operation.operationId)),nextIds=new Set(next.map(o=>o.operation.operationId));
 assert(old.every(o=>nextIds.has(o.operation.operationId)));
 const added=next.filter(o=>!oldIds.has(o.operation.operationId));
 assert.deepEqual(added.map(o=>o.operation.operationId),['retentionApplicabilityBindInitialSource']);
 for(const o of added)assert(matrix.includes(`| ${o.operation.operationId} | ${o.method.toUpperCase()} \`${o.path}\``));
 const historicalTotal=Number(matrix.match(/`CONTRACTUAL_OPERATIONS=(\d+)`/)?.[1]);
 const historicalReads=Number(matrix.match(/`PUBLIC_READ_OPERATIONS=(\d+)`/)?.[1]);
 const historicalMutations=Number(matrix.match(/`PUBLIC_MUTATING_OPERATIONS=(\d+)`/)?.[1]);
 assert.equal(historicalTotal,old.length);assert.equal(historicalReads,old.filter(o=>o.method==='get').length);
 assert.equal(historicalMutations,old.filter(o=>o.method!=='get').length);
 return {historicalTotal,historicalMutations,total:historicalTotal+added.length,reads:historicalReads+added.filter(o=>o.method==='get').length,mutations:historicalMutations+added.filter(o=>o.method!=='get').length,posts:old.filter(o=>o.method==='post').length+added.filter(o=>o.method==='post').length,puts:old.filter(o=>o.method==='put').length+added.filter(o=>o.method==='put').length,addedAuditCount:new Set(added.map(o=>o.operation['x-tcdx-audit-event']).filter(code=>code&&code!=='NONE')).size};
}
