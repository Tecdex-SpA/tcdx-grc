import {describe,it,expect} from 'vitest';
import {parse} from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import apiSource from '../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw';
const api=parse(apiSource);
describe('published INITIAL_SOURCE schema',()=>{
 it('closes source binding body and preserves the existing permission/audit boundary',()=>{
  const operation=api.paths['/retention-policy-applicabilities/{id}:bind-initial-source'].post;
  expect(operation.operationId).toBe('retentionApplicabilityBindInitialSource');
  expect(operation['x-tcdx-permission']).toBe('`privacy.retention_policy.update`');
  expect(operation['x-tcdx-audit-event']).toBe('`audit.privacy.retention_policy_applicability.bind_initial_source.v1`');
  expect(operation.responses['200']).toBeDefined();
  expect(operation.parameters.some((p:{$ref:string})=>p.$ref==='#/components/parameters/IfMatch')).toBe(true);
  const schema=api.components.schemas.RetentionApplicabilityBindInitialSourceRequest;
  expect(schema.additionalProperties).toBe(false);expect(schema.properties.expected_version).toBeUndefined();
  expect(Object.keys(schema.properties).sort()).toEqual(['effective_from','effective_to','source_clause_ref','source_evidence_version_id']);
 });
 it('rejects fabricated fields, empty clauses and missing dates at the published JSON schema boundary',()=>{
  const ajv=new Ajv.default({strict:false});addFormats.default(ajv);
  const validate=ajv.compile({components:api.components,$ref:"#/components/schemas/RetentionApplicabilityBindInitialSourceRequest"});
  const valid={source_evidence_version_id:'01900000-0000-7000-8000-000000000001',source_clause_ref:'Cláusula real',effective_from:'2026-10-15T12:00:00Z'};
  expect(validate(valid)).toBe(true);
  for(const invalid of [{...valid,expected_version:1},{...valid,published:true},{...valid,source_clause_ref:'   '},{...valid,effective_from:null},{source_evidence_version_id:valid.source_evidence_version_id,source_clause_ref:'Cláusula'}])expect(validate(invalid)).toBe(false);
 });
});
