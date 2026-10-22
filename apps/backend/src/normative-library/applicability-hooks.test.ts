import {describe,it,expect,vi} from 'vitest';
import {composeApplicabilityContextHooks} from './applicability-persistence.js';
import {executeMutation,mutations} from '../core-grc/service.js';
import type {CoreActor} from '../core-grc/model.js';
import {PostgresQueryCompiler,type Transaction} from 'kysely';
import type {FoundationDatabase} from '../database.js';
const id='018f47f2-6170-7000-8000-000000000001';
function txWith(executeQuery:ReturnType<typeof vi.fn>){const compiler=new PostgresQueryCompiler();const executor={transformQuery:(node:unknown)=>node,compileQuery:(...args:Parameters<PostgresQueryCompiler['compileQuery']>)=>compiler.compileQuery(...args),executeQuery};return {executeQuery,getExecutor:()=>executor} as unknown as Transaction<FoundationDatabase>;}
const actor={tenantId:id,userIdentityId:id,permissions:new Set(['compliance.applicability.submit']),permissionScopes:new Map([['compliance.applicability.submit',new Set(['tenant'])]]),capabilityGroups:new Set(['ISO_COMPLIANCE'])} as unknown as CoreActor;
describe('applicability hooks preserve existing authority and history',()=>{
 it('composes the context into exactly the existing create audit and never adds an outbox event',async()=>{
  const statements:{sql:string;parameters:readonly unknown[]}[]=[];
  const tx=txWith(vi.fn(async(q:{sql:string;parameters:readonly unknown[]})=>{statements.push(q);return q.sql.includes('INSERT INTO ops_audit.idempotency_records')?{rows:[{idempotency_record_id:id}]}:{rows:[],numAffectedRows:1n};}));
  const creator={...actor,permissions:new Set(['compliance.applicability.create']),permissionScopes:new Map([['compliance.applicability.create',new Set(['tenant' as const])]])};
  const original=mutations.get('applicabilityCreate')!;
  const afterMutation=vi.fn(async()=>({applicability_context_v1:{profile:'APPLICABILITY_CONTEXT_V1',context:{knowledge_version_id:id}}}));
  const result=await executeMutation(tx,creator,{...original,execute:async()=>({resource:'applicability',id,response:{requirement_applicability_id:id,row_version:1,applicability_version:1,lifecycle_state:'draft'}})},{body:{requirement_id:id,applicability_decision:'applicable',effective_from:'2026-10-21T00:00:00Z',context_knowledge_version_id:id},idempotencyKey:'fixture-create',correlationId:id,applicabilityHooks:{afterMutation,replay:vi.fn(async()=>{})}});
  expect(afterMutation).toHaveBeenCalledOnce();expect(result.response.context_knowledge_version_id).toBe(id);
  const audits=statements.filter(q=>q.sql.includes('INSERT INTO ops_audit.audit_events'));expect(audits).toHaveLength(1);expect(audits[0]!.parameters.map(String).join(' ')).toContain('applicability_context_v1');expect(statements.filter(q=>q.sql.includes('INSERT INTO ops_audit.outbox_events'))).toHaveLength(0);
 });

 it('does not invoke a missing-schema path when contextual adoption is unavailable',async()=>{const tx={executeQuery:vi.fn()} as unknown as Transaction<FoundationDatabase>;await expect(executeMutation(tx,actor,mutations.get('applicabilityCreate')!,{body:{context_knowledge_version_id:id},idempotencyKey:'fixture',correlationId:id})).rejects.toMatchObject({code:'TCDX.DEPENDENCY.UNAVAILABLE'});expect(tx.executeQuery).not.toHaveBeenCalled();});
 it('records current null context without inventing a historical version or any new write/event',async()=>{
  const queries:string[]=[];const tx=txWith(vi.fn(async (q:{sql:string})=>{queries.push(q.sql);return q.sql.includes('FROM regulatory.requirement_applicabilities')?{rows:[{requirement_applicability_id:id,tenant_id:id,scope_subject_id:null,applicability_version:2,row_version:3,context_knowledge_version_id:null}]}:{rows:[{now:'2026-10-21T12:00:00Z'}]};}));
  const read=vi.fn(async()=>{});const hooks=composeApplicabilityContextHooks(read);const profile=await hooks.afterMutation(tx,actor,'applicabilitySubmit',id,{});expect(profile).toMatchObject({applicability_context_v1:{context:null,applicability_version:2,row_version:3}});expect(read).not.toHaveBeenCalled();expect(queries.every(q=>q.startsWith('SELECT'))).toBe(true);
 });
 it('fails context authority before a contextual create can write a binding',async()=>{const tx=txWith(vi.fn(async()=>({rows:[{requirement_applicability_id:id,tenant_id:id,row_version:1,applicability_version:1,context_knowledge_version_id:null}]})));const hooks=composeApplicabilityContextHooks(async()=>{throw Error('context denied');});await expect(hooks.afterMutation(tx,actor,'applicabilityCreate',id,{context_knowledge_version_id:id})).rejects.toThrow('context denied');expect(tx.executeQuery).toHaveBeenCalledOnce();});
});
