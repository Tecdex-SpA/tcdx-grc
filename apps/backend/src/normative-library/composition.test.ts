import {describe,it,expect,vi} from 'vitest';
import Fastify from 'fastify';
import {buildApp} from '../app.js';
import type {CoreGrcDependencies} from '../core-grc/model.js';
import {NORMATIVE_LIBRARY} from '@tcdx-grc/contracts/normative-library';
import {registerNormativeLibraryRoutes} from './routes.js';
import {composeNormativeLibrary,composeNormativeLibraryFromStorage,type LibraryComposition} from './composition.js';
import {CanonicalKnowledgePolicy} from './knowledge-policy.js';
import {MinioFileStoragePort,type MinioFileStorageConfig} from '../ports/minio-file-storage.js';
import type {Client} from 'minio';
import {FoundationError} from '../errors.js';
import type {VerifiedIdentity} from '../security/authentication.js';
import type {Kysely} from 'kysely';
import type {FoundationDatabase} from '../database.js';
import type {KnowledgeCustody} from './custody.js';
import type {CoreActor} from '../core-grc/model.js';
const id='018f47f2-6170-7000-8000-000000000001';
const identity={principalId:id,principalClass:'HUMAN_INTERACTIVE',tokenId:'isolated',expiresAt:new Date('2099-01-01')} as VerifiedIdentity;
const verifier={verifyBearerToken:vi.fn(async()=>identity)};
function fixture(){
 const calls:unknown[]=[];const handlers=new Map([...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations].map(op=>[op.operation_id,async(input:unknown)=>{calls.push({operation:op.operation_id,input});return {response:{operation:op.operation_id},etag:'"'+'a'.repeat(64)+'"',replay:true};}]));
 const composition={handlers} as unknown as LibraryComposition;const app=Fastify();app.setErrorHandler((err,_,reply)=>reply.code(err instanceof FoundationError?err.statusCode:500).send({message:err instanceof Error?err.message:'Internal failure'}));registerNormativeLibraryRoutes(app,verifier,composition);return {app,calls};
}
describe('published route composition in isolated Fastify inject, never QA',()=>{
 it('reuses the canonical private storage client and builds concrete custody/evidence adapters without network calls',async()=>{
  const client={getObject:vi.fn(()=>{throw Error('must not read');})} as unknown as Client;
  const fileStorage=new MinioFileStoragePort({bucket:'isolated-test',maxUploadBytes:65536} as MinioFileStorageConfig,client);
  const composition=await composeNormativeLibraryFromStorage({database:{} as Kysely<FoundationDatabase>,fileStorage,environment:'test',cursor:{signReferenceCursor:async v=>v,verifyReferenceCursor:async v=>v}});expect(composition.handlers.size).toBe(32);expect(client.getObject).not.toHaveBeenCalled();
 });

 it('constructs real adapters and all published handlers plus existing create without touching DB/storage',()=>{const database={transaction:()=>{throw Error('must not execute');}} as unknown as Kysely<FoundationDatabase>;const composition=composeNormativeLibrary({database,custody:{} as KnowledgeCustody,rightsEvidence:{verify:async()=>false},environment:'qa',cursor:{signReferenceCursor:async v=>v,verifyReferenceCursor:async v=>v}});expect(composition.handlers.size).toBe(32);expect(composition.applicabilityHooks.afterMutation).toBeTypeOf('function');for(const op of NORMATIVE_LIBRARY.registry.new_operations)expect(composition.handlers.has(op.operation_id)).toBe(true);});
 it('mounts every exact published path including static action suffixes and propagates CAS/idempotency metadata',async()=>{
  const f=fixture();try{for(const op of [...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations]){
   const url='/api/v1'+op.path.replace('{id}',id).replace('{matrix_type}','requirements_controls');
   const response=await f.app.inject({method:op.method.toUpperCase() as 'GET'|'POST'|'PATCH',url,headers:{authorization:'Bearer fixture',...(op.context==='TENANT'?{'x-tcdx-tenant-id':id}:{}),'if-match':'"'+'a'.repeat(64)+'"','idempotency-key':'retry-one'},...(op.method==='get'?{}:{payload:{rationale:'Isolated fixture'}})});
   expect(response.statusCode,op.operation_id).toBe(op.success);expect(response.json()).toEqual({operation:op.operation_id});expect(response.headers['cache-control']).toBe('no-store');expect(response.headers['idempotency-replayed']).toBe('true');
  }expect(f.calls).toHaveLength(32);}finally{await f.app.close();}
 });
 it('denies missing authentication, missing tenant and a Platform request carrying tenant before any handler',async()=>{
  const f=fixture();try{for(const [url,headers,status]of [['/api/v1/knowledge-versions',{},401],['/api/v1/knowledge-versions',{authorization:'Bearer fixture'},403],['/api/v1/platform/knowledge-versions',{authorization:'Bearer fixture','x-tcdx-tenant-id':id},403],['/api/v1/knowledge-versions/not-a-uuid',{authorization:'Bearer fixture','x-tcdx-tenant-id':id},400]] as const){expect((await f.app.inject({method:'GET',url,headers})).statusCode).toBe(status);}expect(f.calls).toEqual([]);}finally{await f.app.close();}
 });
 it('does not expose prepared routes in the current application without adopted composition',async()=>{const database={executeQuery:vi.fn(()=>{throw Error('unexpected DB');})};const app=buildApp(async()=>true,{database,identityVerifier:verifier,fileStorage:{}} as unknown as CoreGrcDependencies);expect((await app.inject({method:'GET',url:'/api/v1/knowledge-versions'})).statusCode).toBe(404);expect(database.executeQuery).not.toHaveBeenCalled();await app.close();});
 it('denies private cross-tenant metadata, global drafts to tenants, and protected body to Support before queries',async()=>{
  const policy=new CanonicalKnowledgePolicy('qa',{verify:async()=>{throw Error('no evidence supplied');}});const tx={} as Parameters<typeof policy.visibleVersion>[0];
  const actor={tenantId:id} as CoreActor;expect(await policy.visibleVersion(tx,actor,{tenant_id:'foreign'},[])).toBe(false);expect(await policy.visibleVersion(tx,actor,{tenant_id:null,lifecycle_state:'draft'},[])).toBe(false);
  expect(await policy.bodyAllowed(tx,{identity,permissions:new Set(),roles:['PLATFORM_SUPPORT']},{tenant_id:null})).toBe(false);
 });
});
