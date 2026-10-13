import openApiSource from '../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw';
import vocabularySource from '../../../docs/executable-contracts/30_PHASE6A3_VOCABULARIES_MANIFEST.json?raw';
import rbacSource from '../../../docs/executable-contracts/29_PHASE6A3_RBAC_MANIFEST.json?raw';
import macroSource from '../../../docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_MANIFEST_R1.json?raw';
import receiptSource from '../../../docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R1.json?raw';
import {describe,it,expect} from 'vitest';
import {parse} from 'yaml';
import {contractSchemaValidator} from './testing/schema-validator.js';
const sources:Record<string,string>={'docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml':openApiSource,'docs/executable-contracts/30_PHASE6A3_VOCABULARIES_MANIFEST.json':vocabularySource,'docs/executable-contracts/29_PHASE6A3_RBAC_MANIFEST.json':rbacSource,'docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_MANIFEST_R1.json':macroSource,'docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R1.json':receiptSource};
const read=(p:string)=>sources[p]!;
const api=parse(read('docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml'));
const manifest=JSON.parse(read('docs/executable-contracts/30_PHASE6A3_VOCABULARIES_MANIFEST.json'));
const macro=read('docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_MANIFEST_R1.json');
const validators=contractSchemaValidator(api.components.schemas);
describe('macro R1 publication provenance and schema negatives',()=> {
 it('preserves exact human-approved macro bytes and verifies the approval receipt',async()=> {
  const receipt=JSON.parse(read('docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/MACRO_APPROVAL_RECEIPT_R1.json'));
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(macro));expect(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')).toBe(receipt.manifest_sha256);
  expect(receipt.exact_human_response).toBe('Apruebo el manifiesto y su texto exacto');expect(receipt.status).toBe('APPROVED_EXACT_MACRO_R1');
 });
 it('publishes exactly three read-only operations and 44 bounded pairs without unrelated roles',()=> {
  const rbac=JSON.parse(read('docs/executable-contracts/29_PHASE6A3_RBAC_MANIFEST.json'));expect(rbac.pairs).toHaveLength(44);
  expect(new Set(rbac.pairs.map((p:{role_code:string;permission:string})=>p.role_code+':'+p.permission)).size).toBe(44);
  expect(rbac.pairs.some((p:{role_code:string})=>['PLATFORM_ADMIN','PLATFORM_SUPPORT','TENANT_ADMIN'].includes(p.role_code))).toBe(false);
  for(const path of ['/framework-version-references','/membership-references','/retention-policy-references']) {const operation=api.paths[path];expect(Object.keys(operation)).toEqual(['get']);expect(operation.get['x-tcdx-transaction-boundary']).toBe('RO');expect(operation.get['x-tcdx-audit-event']).toBe('NONE');}
 });
 it('preserves all 52 published values, contextual schemas and absence of defaults',()=> {
  expect(manifest.families).toHaveLength(14);expect(manifest.families.reduce((n:number,f:{values:unknown[]})=>n+f.values.length,0)).toBe(52);
  for(const family of manifest.families) for(const name of family.schemas) {expect(api.components.schemas[name].enum).toEqual(family.values.map((v:{code:string})=>v.code));expect(api.components.schemas[name]).not.toHaveProperty('default');}
  expect(api.components.schemas.IssuePriority).not.toBe(api.components.schemas.ActionPriority);
 });
 for(const family of manifest.families) for(const name of family.schemas) it(`${name} rejects invalid new-write vocabulary values`,()=> {
  const validate=validators.compile(name);for(const item of family.values)expect(validate(item.code)).toBe(true);
  for(const value of ['unknown','',null,{},[],false,12,' '.repeat(family.max_length+1)])expect(validate(value),name+':'+String(value)).toBe(false);
 });
 it('minimizes membership schema and rejects leaked PII or malformed date/UUID',()=> {
  const validate=validators.compile('MembershipReference');const good={tenant_membership_id:'01a4af00-0000-7000-8000-000000000001',display_name:'Persona',joined_at:'2026-10-09T18:00:00Z',selectable:true};expect(validate(good)).toBe(true);
  for(const patch of [{email:'private@example.invalid'},{user_identity_id:good.tenant_membership_id},{joined_at:'yesterday'},{tenant_membership_id:'malformed'},{selectable:'true'}]) expect(validate({...good,...patch})).toBe(false);
 });
 it('history read projections preserve original unknown codes rather than coercing them',()=> {
  expect(api.components.schemas.EvidenceProjection.properties.source_kind).not.toHaveProperty('enum');expect(api.components.schemas.IssueProjection.properties.priority).not.toHaveProperty('enum');
  expect(validators.compile('EvidenceSourceKind')('upload')).toBe(false);expect(validators.compile('EvidenceSourceKind')('uploaded')).toBe(true);
 });
 it('keeps dialect selection fail-closed and validates 2020-12 unevaluated properties and draft7 constraints',()=> {
  const v=contractSchemaValidator({modern:{$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',properties:{count:{type:'integer',minimum:1}},required:['count'],unevaluatedProperties:false},old:{$schema:'http://json-schema.org/draft-07/schema#',type:'integer',minimum:2},unknown:{$schema:'unsupported'}});
  expect(v.compile('modern')({count:1})).toBe(true);for(const item of [{count:0},{count:'1'},{count:1,extra:true},{}])expect(v.compile('modern')(item)).toBe(false);
  expect(v.compile('old')(2)).toBe(true);for(const item of [1,'2',null,2.5])expect(v.compile('old')(item)).toBe(false);expect(()=>v.compile('unknown')).toThrow('Unsupported');
 });
});
