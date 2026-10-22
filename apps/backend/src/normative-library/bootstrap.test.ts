import {describe,it,expect,vi} from 'vitest';
import type {Kysely} from 'kysely';
import type {Client} from 'minio';
import type {FoundationDatabase} from '../database.js';
import {buildApp} from '../app.js';
import {BlockedIdentityVerifier} from '../security/authentication.js';
import {UnavailableFileStoragePort} from '../ports/file-storage.js';
import {MinioFileStoragePort,type MinioFileStorageConfig} from '../ports/minio-file-storage.js';
import {NORMATIVE_LIBRARY} from '@tcdx-grc/contracts/normative-library';
import {composeNormativeLibraryForBootstrap} from './bootstrap.js';
const id='018f47f2-6170-7000-8000-000000000001';
const cursor={signReferenceCursor:vi.fn(async()=>{throw Error('No unsigned cursor');}),verifyReferenceCursor:vi.fn(async()=>{throw Error('No unsigned cursor');})};
function deps(){
 const transaction=vi.fn(()=>{throw Error('No database contact permitted in bootstrap');});
 const client=new Proxy({}, {get(){throw Error('No storage contact permitted in bootstrap');}}) as Client;
 return {database:{transaction} as unknown as Kysely<FoundationDatabase>,fileStorage:new MinioFileStoragePort({bucket:'isolated',maxUploadBytes:65536} as MinioFileStorageConfig,client),environment:'test' as const,cursor,transaction};
}
describe('canonical server normative bootstrap, local only',()=>{
 it('fails closed for either missing canonical dependency, without fallback or database calls',async()=>{
  const d=deps();
  await expect(composeNormativeLibraryForBootstrap({...d,cursor:undefined})).rejects.toMatchObject({statusCode:503});
  await expect(composeNormativeLibraryForBootstrap({...d,fileStorage:new UnavailableFileStoragePort()})).rejects.toMatchObject({statusCode:503});
  expect(d.transaction).not.toHaveBeenCalled();
 });
 it('mounts precisely thirty new operations and existing create in the full canonical app; denies every unauthenticated request',async()=>{
  const d=deps(),normativeLibrary=await composeNormativeLibraryForBootstrap(d);
  const operations=[...NORMATIVE_LIBRARY.registry.new_operations,...NORMATIVE_LIBRARY.existingOperations];
  expect([...normativeLibrary.handlers.keys()].sort()).toEqual(operations.map(o=>o.operation_id).sort());
  expect(normativeLibrary.applicabilityHooks.afterMutation).toBeTypeOf('function');
  expect(normativeLibrary.applicabilityHooks.replay).toBeTypeOf('function');
  expect(normativeLibrary.effectiveConfiguration).toBeTypeOf('function');
  const app=buildApp(async()=>true,{database:d.database,fileStorage:d.fileStorage,identityVerifier:new BlockedIdentityVerifier(),normativeLibrary,referenceCursor:cursor,runtimeEnvironment:'test'});
  try{
   for(const op of operations){
    const response=await app.inject({method:op.method.toUpperCase() as 'GET'|'POST'|'PATCH',url:'/api/v1'+op.path.replace('{id}',id).replace('{matrix_type}','issues_actions'),...(op.method==='get'?{}:{payload:{}})});
    expect(response.statusCode,op.operation_id).toBe(401);
    expect(response.headers['cache-control']).toBe('no-store');
   }
   expect(d.transaction).not.toHaveBeenCalled();
  }finally{await app.close();}
 });
});
