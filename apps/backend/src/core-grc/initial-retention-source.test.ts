import {describe,it,expect} from 'vitest';
import {mutations} from './service.js';
import {coreGrcCommandRoutes,retentionIfMatch} from './routes.js';
const request=(headers:Record<string,string>,body:Record<string,unknown>={})=>({headers,body}) as Parameters<typeof retentionIfMatch>[1];
describe('INITIAL_SOURCE command boundary',()=>{
 it('uses one existing permission, tenant scope and audit without a new outbox event',()=>{
  const d=mutations.get('retentionApplicabilityBindInitialSource')!;
  expect(d.permission).toBe('privacy.retention_policy.update');expect(d.capability).toBe('PRIVACY');expect(d.scopes).toEqual(['tenant']);
  expect(d.auditEvent).toBe('audit.privacy.retention_policy_applicability.bind_initial_source.v1');expect(d.domainEvent).toBeUndefined();
  expect(d.requiredFields).toEqual(['expected_version','source_evidence_version_id','source_clause_ref','effective_from']);
  expect(coreGrcCommandRoutes.find(([id])=>id===d.operationId)?.[1]).toBe('/api/v1/retention-policy-applicabilities/:id\\:bind-initial-source');
 });
 it('requires strong If-Match and rejects a caller supplied body version',()=>{
  for(const headers of [{},{'if-match':'W/"1"'},{'if-match':'1'},{'if-match':'"0"'}])expect(()=>retentionIfMatch('retentionApplicabilityBindInitialSource',request(headers))).toThrow();
  expect(()=>retentionIfMatch('retentionApplicabilityBindInitialSource',request({'if-match':'"1"'},{expected_version:1}))).toThrow();
  expect(retentionIfMatch('retentionApplicabilityBindInitialSource',request({'if-match':'"2"'},{source_clause_ref:'clause'}))).toEqual({source_clause_ref:'clause',expected_version:2});
 });
});
