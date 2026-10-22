import {describe,it,expect,vi} from 'vitest';
import {retentionPolicyDisplayLabel,businessLabel,readReferenceDetail,readBusinessReferences} from './reference-read.js';
import type {ApiClient} from './api-client.js';
const tenant='018f47f2-6170-7bd0-9d43-12f644a2b111';
const policy={retention_policy_id:tenant,policy_kind:'tenant_policy',policy_code:'QA_RET_ORD_001',version_number:1,lifecycle_state:'published'};
describe('STEP6A3 evidence policy presentation',()=>{
 it('uses canonical kind, user-defined code and domain version without inventing a name',()=>{
  expect(retentionPolicyDisplayLabel({...policy,row_version:9,name:'not a canonical attribute'})).toBe('Política de la organización · QA_RET_ORD_001 · v1');
  expect(businessLabel({...policy,row_version:9})).toBe('Política de la organización · QA_RET_ORD_001 · v1 · Publicada');
 });
 it('localizes applicability classification while preserving its own version',()=>{
  expect(businessLabel({classification:'confidential',version_number:2,lifecycle_state:'published'})).toBe('Confidencial · v2 · Publicada');
 });
 it('never renders a policy reference returned for another tenant',async()=>{
  const request=vi.fn().mockResolvedValue({...policy,tenant_id:'other'});
  const api={currentTenantId:()=>tenant,request} as unknown as ApiClient;
  await expect(readReferenceDetail(api,'retentionPolicy',tenant)).rejects.toThrow('REFERENCE_CONTEXT_CHANGED');
 });
 it('offers only command-selectable policies but preserves authorized history',async()=>{
  const request=vi.fn().mockResolvedValue({items:[{...policy,selectable:true},{...policy,retention_policy_id:'other',selectable:false}],page:{has_more:false,next_cursor:null}});
  const api={currentTenantId:()=>tenant,request} as unknown as ApiClient;
  expect((await readBusinessReferences(api,{kind:'retention',purpose:'evidence'})).options.map(row=>row.value)).toEqual([tenant]);
  expect((await readBusinessReferences(api,{kind:'retention',purpose:'history',parents:{evidence_id:tenant},filters:{retention_policy_id:tenant}})).options).toHaveLength(2);
 });
});
