import {describe,it,expect,vi} from 'vitest';
import {internalNormativeAccreditationNotRequired,permitsSourceUse,rightsBindingHash,rightsInstant,MinioRightsEvidence,type RightsRecord,type RightsRequest,type UseAct,type UseEnvironment} from './rights.js';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import type {Client} from 'minio';
const id=(n:number)=>'018f47f2-6170-7000-8000-'+n.toString(16).padStart(12,'0');
const record:RightsRecord={knowledge_source_usage_right_id:id(1),knowledge_source_id:id(2),ownership_class:'TENANT_OWNED',tenant_id:id(3),audience_tenant_id:id(3),content_hash:'a'.repeat(64),edition_ref:'Exact edition in isolated fixture',regulatory_pack_version_id:id(4),use_act:'consultation',use_environment:'qa',content_kind:'third_party',effective_from:'2026-01-01T00:00:00.000Z',effective_to:'2027-01-01T00:00:00.000Z',revoked_at:null,evidence_ref:JSON.stringify({key:'knowledge-rights/'+id(1)+'/'+id(5)+'.json',version:'immutable-test-version'}),evidence_hash:'b'.repeat(64),recorded_audit_event_id:id(6)};
const request:RightsRequest={sourceId:id(2),ownershipClass:'TENANT_OWNED',sourceTenantId:id(3),audienceTenantId:id(3),contentHash:'a'.repeat(64),packVersionId:id(4),act:'consultation',environment:'qa',now:'2026-10-21T12:00:00Z',preliminary:false,edition:record.edition_ref};
describe('Internal normative accreditation boundary; never a legal authorization',()=>{
 it.each(['development','test','qa'] as const)('does not require H04 for internal normative operations in %s',environment=>{
  expect(internalNormativeAccreditationNotRequired(environment,['consultation','extraction','storage','presentation','import','publication'],[true,true])).toBe(true);
 });
 it('keeps production, export, unknown acts and every official or unresolved dependency outside the binding',()=>{
  expect(internalNormativeAccreditationNotRequired('production',['consultation'],[true])).toBe(false);
  expect(internalNormativeAccreditationNotRequired('qa',['consultation','export'],[true])).toBe(false);
  expect(internalNormativeAccreditationNotRequired('qa',['unknown' as UseAct],[true])).toBe(false);
  for(const dependencies of [[],[false],[true,false],[undefined as unknown as boolean]])expect(internalNormativeAccreditationNotRequired('qa',['consultation'],dependencies)).toBe(false);
  expect(internalNormativeAccreditationNotRequired('qa',[],[true])).toBe(false);
 });
});
describe('H04 explicit evidence conjunction, isolated fixtures never real licenses',()=>{
 it('binds equivalent UTC representations without rounding exact PostgreSQL microseconds',()=>{expect(rightsInstant('2026-01-01 03:00:00.123456+03')).toBe('2026-01-01T00:00:00.123456Z');expect(rightsBindingHash({...record,effective_from:'2026-01-01T00:00:00.000001Z'})).not.toBe(rightsBindingHash({...record,effective_from:'2026-01-01T00:00:00.000002Z'}));});
 it('allows exactly evidenced source/hash/edition/pack/act/environment/audience',async()=>{const verify=vi.fn(async()=>true);expect(await permitsSourceUse(request,[record],{verify})).toBe(true);expect(verify).toHaveBeenCalledOnce();});
 it('preserves microsecond half-open validity and revocation boundaries without early authorization',async()=>{
  const r={...record,effective_from:'2026-10-21T12:00:00.000001Z',effective_to:'2026-10-21T12:00:00.000004Z'};
  for(const [now,allowed]of [['2026-10-21T12:00:00.000000Z',false],['2026-10-21T12:00:00.000001Z',true],['2026-10-21T12:00:00.000003Z',true],['2026-10-21T12:00:00.000004Z',false],['2026-10-21T15:00:00.000002+03:00',true]] as const)expect(await permitsSourceUse({...request,now},[r],{verify:async()=>true}),now).toBe(allowed);
  const revoked={...r,revoked_at:'2026-10-21T12:00:00.000003Z'};
  expect(await permitsSourceUse({...request,now:'2026-10-21T12:00:00.000002Z'},[revoked],{verify:async()=>true})).toBe(true);
  expect(await permitsSourceUse({...request,now:revoked.revoked_at},[revoked],{verify:async()=>true})).toBe(false);
  for(const malformed of [{...r,effective_from:'invalid'},{...r,effective_to:'invalid'},{...r,revoked_at:'invalid'}])expect(await permitsSourceUse(request,[malformed],{verify:async()=>true})).toBe(false);
 });
 it.each(['consultation','extraction','storage','presentation','export','import','publication'] as UseAct[])('does not inherit act %s from another grant',async act=>{expect(await permitsSourceUse({...request,act},[{...record,use_act:act}],{verify:async()=>true})).toBe(true);expect(await permitsSourceUse({...request,act},[{...record,use_act:act==='import'?'export':'import'}],{verify:async()=>true})).toBe(false);});
 it.each(['sourceId','contentHash','packVersionId','audienceTenantId','edition'] as const)('denies changed %s',async key=>{expect(await permitsSourceUse({...request,[key]:'wrong'},[record],{verify:async()=>true})).toBe(false);});
 it.each(['development','test','qa','production'] as UseEnvironment[])('checks exact environment %s',async environment=>{expect(await permitsSourceUse({...request,environment},[{...record,use_environment:environment}],{verify:async()=>true})).toBe(true);});
 it('fails closed for absent, ambiguous, expired, revoked, unknown or unverified evidence',async()=>{
  for(const rows of [[],[record,record],[{...record,effective_to:request.now}],[{...record,revoked_at:request.now}],[{...record,revoked_at:'invalid'}],[{...record,content_kind:'unknown'}],[{...record,content_kind:'metadata'}]])expect(await permitsSourceUse(request,rows,{verify:async()=>true})).toBe(false);
  expect(await permitsSourceUse(request,[record],{verify:async()=>false})).toBe(false);expect(await permitsSourceUse(request,[record],{verify:async()=>{throw Error('unavailable');}})).toBe(false);
  expect(await permitsSourceUse({...request,act:'unknown' as UseAct},[record],{verify:async()=>true})).toBe(false);
 });
 it('never treats preliminary QA evidence as production or official source authority',async()=>{expect(await permitsSourceUse({...request,preliminary:true},[record],{verify:async()=>true})).toBe(true);expect(await permitsSourceUse({...request,environment:'production',preliminary:true},[{...record,use_environment:'production'}],{verify:async()=>true})).toBe(false);});
 it('keeps source ownership and tenant audience conjunctive',async()=>{expect(await permitsSourceUse({...request,audienceTenantId:id(9)},[{...record,audience_tenant_id:id(9)}],{verify:async()=>true})).toBe(false);});
 it('verifies exact private evidence object/version/hash and refuses alternate binding or public URL',async()=>{
  const proof={binding_hash:rightsBindingHash(record),authority:'Isolated test authority, no real rights',basis:'Synthetic test declaration',evidence_locator:'test-only',evidence_sha256:'d'.repeat(64)};
  const bytes=Buffer.from(JSON.stringify(proof));const get=vi.fn(async()=>Readable.from([bytes]));
  const client={getObject:get,getBucketVersioning:async()=>({Status:'Enabled'}),getBucketEncryption:async()=>({ServerSideEncryptionConfiguration:{Rule:{ApplyServerSideEncryptionByDefault:{SSEAlgorithm:'AES256'}}}})} as unknown as Client;
  const evidence=new MinioRightsEvidence(client,'private-test');const r={...record,evidence_hash:createHash('sha256').update(bytes).digest('hex')};
  expect(await evidence.verify(r)).toBe(true);expect(get).toHaveBeenCalledWith('private-test',JSON.parse(record.evidence_ref).key,{versionId:'immutable-test-version'});
  expect(await evidence.verify({...r,content_hash:'e'.repeat(64)})).toBe(false);
  expect(await evidence.verify({...r,evidence_ref:JSON.stringify({key:'https://example.invalid/legal',version:'v'})})).toBe(false);
 });
});
