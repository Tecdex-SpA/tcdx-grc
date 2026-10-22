import {describe,it,expect} from 'vitest';
import {NORMATIVE_LIBRARY,validateLibrarySchema} from '@tcdx-grc/contracts/normative-library';
import {contextualFixture,tenant,control,fixtureId} from './control-definition-references.test-support.js';
const headers={authorization:'Bearer isolated','x-tcdx-tenant-id':tenant};
const path=(id=control)=>'/api/v1/control-versions/'+id+'/configuration-definition-references';
const body=(id:string)=>({configuration_definition_id:id,scope_level:'control_version',control_version_id:control,text_value:'Orientación operativa sintética',effective_from:'2026-10-23T00:00:00.000Z',effective_to:'2026-12-23T00:00:00.000Z',rationale:'Prueba aislada; no contenido normativo.'});
describe('B04 contextual refs and actual service composition against a SQL executor fixture, no QA',()=>{
 it('returns four exact canonical references with only B04 create authorization; no Platform grant, catalogue values or writes',async()=>{
  const f=contextualFixture();try{const r=await f.app.inject({url:path(),headers});expect(r.statusCode,r.body).toBe(200);expect(validateLibrarySchema('ControlDefinitionReferencePage',r.json()).valid).toBe(true);expect(r.json().items).toHaveLength(4);expect(r.headers['cache-control']).toBe('no-store');expect(r.body).not.toContain('default_text');expect(r.body).not.toContain('tenant_id');expect(f.state.statements.some(q=>/INSERT|UPDATE|DELETE/.test(q.sql))).toBe(false);expect(f.state.statements.find(q=>q.sql.includes('FROM config.configuration_definitions'))!.sql).toContain("d.lifecycle_state='published'");}finally{await f.app.close();}
 });
 it.each([{allowed:false},{role:'PLATFORM_ADMIN'},{role:'PLATFORM_SUPPORT'},{scope:'owned_object'},{capability:false}])('denies ineligible actor %j before target or definitions are queried',async patch=>{
  const f=contextualFixture();Object.assign(f.state,patch);try{const r=await f.app.inject({url:path(),headers});expect(r.statusCode).toBe(403);expect(f.state.statements.some(q=>q.sql.includes('FROM config.configuration_definitions')||q.sql.includes('FROM controls.control_versions'))).toBe(false);}finally{await f.app.close();}
 });
 it('does not enumerate foreign, global or absent target IDs; never queries their Definitions',async()=>{
  const f=contextualFixture();try{for(const id of [fixtureId(80),fixtureId(81),fixtureId(82)]){expect((await f.app.inject({url:path(id),headers})).statusCode).toBe(404);}expect(f.state.statements.some(q=>q.sql.includes('FROM config.configuration_definitions'))).toBe(false);const q=f.state.statements.find(q=>q.sql.includes('FROM controls.control_versions'))!;expect(q.sql).toContain('cv.tenant_id=$2::uuid');expect(q.sql).toContain("c.ownership_class='TENANT_OWNED'");}finally{await f.app.close();}
 });
 it('validates authentication, tenant, UUID and rejects every filter without data enumeration',async()=>{
  const f=contextualFixture();try{expect((await f.app.inject({url:path()})).statusCode).toBe(401);expect((await f.app.inject({url:path(),headers:{authorization:'Bearer test'}})).statusCode).toBe(403);for(const url of [path('invalid'),path()+'?tenant_id='+tenant,path()+'?as_of=x&as_of=y'])expect((await f.app.inject({url,headers})).statusCode).toBe(400);expect(f.state.statements).toHaveLength(0);}finally{await f.app.close();}
 });
 it.each(['draft','approved','retired','foreign','expired','future','flags','scope','version'])('excludes %s definitions and returns legitimate empty data',async reason=>{
  const f=contextualFixture();for(const d of f.state.definitions){if(['draft','approved','retired'].includes(reason))d.lifecycle_state=reason;else if(reason==='foreign')d.ownership_class='TENANT_OWNED';else if(reason==='expired')d.effective_to='2026-01-01T00:00:00.000Z';else if(reason==='future')d.effective_from='2099-01-01T00:00:00.000Z';else if(reason==='flags')d.object_overridable=false;else if(reason==='scope')d.allowed_scope_levels=['tenant'];else if(reason==='version')d.version_number='2';}
  try{const r=await f.app.inject({url:path(),headers});expect(r.statusCode,r.body).toBe(200);expect(r.json().items).toEqual([]);}finally{await f.app.close();}
 });
 it.each([{missingRules:true,status:503},{badRules:true,status:422}])('fails closed on validation binding dependency %j',async patch=>{
  const f=contextualFixture();Object.assign(f.state,patch);try{const r=await f.app.inject({url:path(),headers});expect(r.statusCode,r.body).toBe(patch.status);expect(r.json().code).toBe(patch.status===422?'TCDX.INVARIANT.VIOLATION':'TCDX.DEPENDENCY.UNAVAILABLE');expect(r.json()).not.toHaveProperty('items');}finally{await f.app.close();}
 });
 it('creates a draft with the selected FK through the existing handler and preserves single audit/outbox/idempotency',async()=>{
  const f=contextualFixture();try{const options=(await f.app.inject({url:path(),headers})).json();const d=options.items.find((d:{configuration_code:string})=>d.configuration_code==='control_operational_activity');const r=await f.app.inject({method:'POST',url:'/api/v1/configuration-overrides',headers:{...headers,'idempotency-key':'isolated-create'},payload:body(d.configuration_definition_id)});expect(r.statusCode,r.body).toBe(202);expect(validateLibrarySchema('ControlOverrideResult',r.json()).valid).toBe(true);expect(r.json().result).toMatchObject({configuration_definition_id:d.configuration_definition_id,lifecycle_state:'draft',control_version_id:control});for(const table of ['ops_audit.audit_events','ops_audit.outbox_events'])expect(f.state.statements.filter(q=>q.sql.includes('INSERT INTO '+table))).toHaveLength(1);expect(f.state.statements.filter(q=>q.sql.includes('UPDATE ops_audit.idempotency_records'))).toHaveLength(1);}finally{await f.app.close();}
 });
 it.each(['draft','expired','flags'])('revalidates %s after selection, denies the write409 without audit/outbox',async reason=>{
  const f=contextualFixture();try{const selected=(await f.app.inject({url:path(),headers})).json().items[0].configuration_definition_id;const d=f.state.definitions.find(d=>d.configuration_definition_id===selected)!;if(reason==='draft')d.lifecycle_state='draft';else if(reason==='expired')d.effective_to='2026-01-01T00:00:00.000Z';else d.tenant_overridable=false;
   const r=await f.app.inject({method:'POST',url:'/api/v1/configuration-overrides',headers:{...headers,'idempotency-key':'stale-selection'},payload:body(selected)});expect(r.statusCode,r.body).toBe(409);expect(r.json().details.field).toBe('configuration_definition_id');expect(f.state.overrides).toHaveLength(0);expect(f.state.statements.some(q=>q.sql.includes('INSERT INTO ops_audit.audit_events'))).toBe(false);
  }finally{await f.app.close();}
 });
 it('reauthorizes a previously selected reference on write and conceals an alien control before Definition lookup',async()=>{
  const f=contextualFixture();try{
   const chosen=(await f.app.inject({url:path(),headers})).json().items[0].configuration_definition_id;
   f.state.allowed=false;
   expect((await f.app.inject({method:'POST',url:'/api/v1/configuration-overrides',headers:{...headers,'idempotency-key':'withdrawn'},payload:body(chosen)})).statusCode).toBe(403);
   f.state.allowed=true;f.state.statements=[];
   const result=await f.app.inject({method:'POST',url:'/api/v1/configuration-overrides',headers:{...headers,'idempotency-key':'alien'},payload:{...body(chosen),control_version_id:fixtureId(90)}});
   expect(result.statusCode).toBe(404);expect(f.state.statements.some(q=>q.sql.includes('FROM config.configuration_definitions'))).toBe(false);expect(f.state.overrides).toHaveLength(0);
  }finally{await f.app.close();}
 });
 it('rolls back a create on audit failure rather than returning a false accepted result',async()=>{const f=contextualFixture();f.state.failAudit=true;try{const r=await f.app.inject({method:'POST',url:'/api/v1/configuration-overrides',headers:{...headers,'idempotency-key':'audit-failure'},payload:body(f.state.definitions[0]!.configuration_definition_id)});expect(r.statusCode).toBe(500);expect(r.body).not.toContain('private');expect(f.state.overrides).toHaveLength(0);expect(f.state.rollback).toBe(1);expect(f.state.statements.some(q=>q.sql.includes('INSERT INTO ops_audit.outbox_events'))).toBe(false);}finally{await f.app.close();}});
 it('keeps response schema closed and no extra lifecycle edge or administrative permission',()=>{
  const op=NORMATIVE_LIBRARY.registry.new_operations.find(o=>o.operation_id==='controlConfigurationDefinitionReferenceList')!;expect(op.permission).toBe('configuration.configuration_override.create');expect(NORMATIVE_LIBRARY.lifecycle.bindings.some(b=>b.operation_id===op.operation_id)).toBe(false);
  expect(validateLibrarySchema('ControlDefinitionReferencePage',{control_version_id:control,evaluated_at:'2026-10-22T00:00:00Z',items:[],tenant_id:tenant}).valid).toBe(false);
 });
});
