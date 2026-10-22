/// <reference types="node" />
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
import {businessForms,formSchema,propertySchema,validateForm,normalizeForm,requiredField,formFailure,problemErrors} from './business-forms.js';
import {BusinessScalarField} from './business-form-fields.js';
import * as generated from './business-form-validators.generated.js';
import {ApiProblem} from './api-client.js';
const require=createRequire(new URL('../../../packages/contracts/package.json',import.meta.url));
const {parse}=require('yaml');
const api=parse(readFileSync('docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml','utf8'));
const uuid='018f47f2-6170-7bd0-9d43-12f644a2b111';
function sample(rule:any):any {if(rule.$ref)return sample(api.components.schemas[rule.$ref.split('/').at(-1)]);if(rule.enum)return rule.enum[0];if(rule.format==='uuid')return uuid;if(rule.format==='date-time')return '2026-10-20T12:00:00Z';if(rule.format==='date')return '2026-10-20';if(rule.type==='boolean')return false;if(rule.type==='number'||rule.type==='integer')return rule.minimum??1;if(rule.type==='array')return Array.from({length:rule.minItems??0},()=>sample(rule.items));if(rule.type==='object'){const body=Object.fromEntries((rule.required??[]).map((key:string)=>[key,sample(rule.properties[key])]));if(rule.oneOf)for(const key of rule.oneOf[0].required)body[key]=sample(rule.properties[key]);return body;}return 'Valor de negocio';}
// Independent original-source fixtures, not a runtime implementation authority.
export function formFixture(schema:string){const body=sample(api.components.schemas[schema]);if(schema==='ApplicabilityCreateRequest')body.effective_from='2026-10-20T12:00:00Z';if(schema==='RetentionPolicyCreateRequest'){body.policy_kind='tenant_policy';body.precedence_rank=200;body.retention_seconds=0;}return body;}
describe('STEP6A4 all published business forms',()=>{
 expect(businessForms).toHaveLength(42);
 for(const form of businessForms){it(`${form.id} ${form.operation}: exact operation, payload, required/optional and closed fields`,()=>{
  const op=api.paths[form.path][form.method];expect(op.operationId).toBe(form.operation);expect(op['x-tcdx-permission'].replaceAll('`','')).toBe(form.permission);
  const body=formFixture(form.schema),validator=(generated as any)[form.schema];expect(validator(body),JSON.stringify(validator.errors)).toBe(true);expect(validateForm(form.schema,body)).toEqual({});
  expect(validator({...body,unpublished_field:true})).toBe(false);
  for(const field of formSchema(form).required??[]){const missing={...body};delete missing[field];expect(validateForm(form.schema,missing)[field],field).toBeDefined();}
  for(const [field,rule]of Object.entries(formSchema(form).properties??{})){if(field==='expected_version')continue;const html=renderToStaticMarkup(<BusinessScalarField schema={form.schema} field={field} value="" onChange={()=>{}}/>);expect(html).toContain('<');expect(html).not.toContain('Ingresa el identificador');if((rule.type==='number'||rule.type==='integer')&&!rule.enum)expect(html).toContain('type="number"');}
 });}
 it('keeps optional assessment/review/triage entries optional',()=>{for(const [schema,fields]of [['RequirementAssessmentSubmitRequest',['domain_conclusion','coverage_percent']],['AssuranceTestExecuteRequest',['domain_conclusion','samples']],['EvidenceApproveRequest',['sufficiency','relevance']],['IssueTriageRequest',['business_owner_subject_id','due_date']]] as const)for(const field of fields)expect(requiredField(schema,field)).toBe(false);});
 it('handles precision, ranges, integers, date-only and UTC without coercion',()=>{
  expect(normalizeForm('RetentionPolicyCreateRequest',{retention_seconds:'9007199254740993'},'America/Santiago').errors.retention_seconds).toBeDefined();
  expect(validateForm('RequirementAssessmentSubmitRequest',{expected_version:1,result_status:'valid',coverage_percent:101}).coverage_percent).toBeDefined();
  expect(validateForm('IssueTriageRequest',{expected_version:1,severity:'major',priority:'high',due_date:'2026-02-30'}).due_date).toBeDefined();
  expect(normalizeForm('ApplicabilityCreateRequest',{effective_from:'2026-10-20T09:00:00-03:00'},'America/Santiago').body.effective_from).toBe('2026-10-20T12:00:00Z');
  expect(normalizeForm('ApplicabilityCreateRequest',{effective_from:'2026-10-20'},'America/Santiago').errors.effective_from).toBeDefined();
 });
 it('rejects structured row gaps, incompatible pairs and oversized samples',()=>{
  const soa=formFixture('SoaCreateRequest');soa.items[0].tenant_control_id=uuid;expect(validateForm('SoaCreateRequest',soa)['items.0.tenant_control_version_id']).toBeDefined();
  const body={expected_version:1,result_status:'no_data',samples:[{sample_code:'M-1',sample_count:3,population_count:2,selection_method:'census',result_status:'no_data'}]};expect(validateForm('AssuranceTestExecuteRequest',body)['samples.0.sample_count']).toBeDefined();
  expect(validateForm('EvidenceCreateRequest',{...formFixture('EvidenceCreateRequest'),links:[{control_id:uuid,requirement_id:uuid}]})).not.toEqual({});
  expect(validateForm('ApplicabilityCreateRequest',{...formFixture('ApplicabilityCreateRequest'),applicability_decision:'not_applicable',rationale:'   '}).rationale).toBeDefined();
 });
 it('uses safe Spanish permission/conflict feedback and field paths without server secrets',()=>{for(const status of [401,403,404,409,422]){const failure=new ApiProblem({code:'TCDX.VALIDATION.FAILED',message:'signed-secret-value',correlation_id:uuid,retryable:false,field_errors:[{field:'items[0].justification',code:'INVALID',message:'signed-secret-value'}]},status);expect(formFailure(failure)).not.toMatch(/signed-secret|018f/);expect(JSON.stringify(problemErrors(failure))).not.toContain('signed-secret-value');}});
});

describe('STEP6A4 labels for existing authorized references',()=>{
 it('resolves a requirement across authorized framework pages without entering a technical ID',async()=>{
  const {readBusinessEntityLabel}=await import('./structured-reference-fields.js');
  const calls:string[]=[];
  const client={currentTenantId:()=>uuid,request:async(path:string)=>{calls.push(path);if(path.includes('framework-version-references'))return {items:[{framework_version_id:uuid,framework_name:'Marco autorizado',selectable:true}],page:{has_more:false,next_cursor:null}};return {items:[{requirement_id:uuid,requirement_code:'REQ-NEGOCIO',tenant_id:null}],page:{has_more:false,next_cursor:null}};}} as unknown as import('./api-client.js').ApiClient;
  expect(await readBusinessEntityLabel(client,'requirement',uuid,undefined,'America/Santiago',new AbortController().signal)).toBe('REQ-NEGOCIO');
  expect(calls[0]).toContain('purpose=select');expect(calls[1]).toContain('/requirements?');
 });
 it('resolves the selected control version and rejects a foreign tenant response',async()=>{
  const {readBusinessEntityLabel}=await import('./structured-reference-fields.js');
  const control={control_id:uuid,tenant_id:uuid,control_code:'CTL-NEGOCIO',ownership_class:'TENANT_OWNED',versions:[{control_version_id:uuid,control_id:uuid,tenant_id:uuid,version_number:7}]};
  const client={currentTenantId:()=>uuid,request:async()=>control} as unknown as import('./api-client.js').ApiClient;
  expect(await readBusinessEntityLabel(client,'controlVersion',uuid,uuid,'America/Santiago',new AbortController().signal)).toContain('CTL-NEGOCIO · v7');
  control.tenant_id='018f47f2-6170-7bd0-9d43-12f644a2b199';
  await expect(readBusinessEntityLabel(client,'controlVersion',uuid,uuid,'America/Santiago',new AbortController().signal)).rejects.toThrow('REFERENCE_CONTEXT_CHANGED');
 });
});
