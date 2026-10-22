import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
import {originFields,changeOrigin,validateForm,normalizeForm,requiredField} from './business-forms.js';
import * as validators from './business-form-validators.generated.js';
const require=createRequire(new URL('../../../packages/contracts/package.json',import.meta.url));
const {parse}=require('yaml');
const contract=parse(readFileSync('docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml','utf8'));
const id='018f47f2-6170-7bd0-9d43-12f644a2b111';
for(const [schema,path,operation,base] of [
  ['EvidenceRequestCreateRequest','/evidence-requests','evidenceRequestCreate',{request_code:'SOL-TEST'}],
  ['IssueCreateRequest','/issues','issueCreate',{issue_code:'HALL-TEST',issue_kind:'finding',title:'Hallazgo',description:'Descripción',severity:'minor',priority:'low',origin_role:'trigger'}]
] as const){
 describe(`${operation}: published exclusive reference contract`,()=>{
  const source=contract.components.schemas[schema];
  const fields:string[]=source.oneOf.flatMap((branch:{required:string[]})=>branch.required);
  const validator=(validators as unknown as Record<string,validators.Validator>)[schema]!;
  it('projects only the exact published alternatives; no auxiliary origin FK or anyOf',()=>{
   expect(contract.paths[path].post.operationId).toBe(operation);
   expect(originFields(schema)).toEqual(fields);expect(source.anyOf).toBeUndefined();
   expect(source.additionalProperties).toBe(false);expect(source.properties.control_version_id).toBeUndefined();
   expect(requiredField(schema,'_reference')).toBe(true);
  });
  it('rejects no origin with an actionable field error',()=>{
   expect(validator(base)).toBe(false);expect(validateForm(schema,base)._reference).toContain('único registro');
   expect(validateForm(schema,base)._form).toBeUndefined();
  });
  for(const field of fields)it(`accepts one valid ${field}, with optional fields and no context in payload`,()=>{
   const optional=schema==='EvidenceRequestCreateRequest'?{assigned_membership_id:id,due_at:'2026-10-20T12:00:00Z'}:{business_owner_subject_id:id,due_date:'2026-10-20'};
   const normalized=normalizeForm(schema,{...base,[field]:id,...optional},'America/Santiago');
   expect(normalized.errors).toEqual({});expect(validator(normalized.body),JSON.stringify(validator.errors)).toBe(true);
   expect(validateForm(schema,normalized.body)).toEqual({});
   expect(fields.filter(key=>key in normalized.body)).toEqual([field]);
   expect(requiredField(schema,field)).toBe(true);
   expect(validator({...normalized.body,origin_type:field})).toBe(false);
  });
  for(let i=0;i<fields.length;i++)for(let j=i+1;j<fields.length;j++)it(`rejects simultaneous ${fields[i]} / ${fields[j]}`,()=>{
   const body={...base,[fields[i]!]:id,[fields[j]!]:id};
   expect(validator(body)).toBe(false);expect(validateForm(schema,body)._reference).toBeDefined();
  });
  it('clears all incompatible references and context-dependent assignee when switching; preserves optional independent values',()=>{
   const values={...Object.fromEntries(fields.map(field=>[field,id])),title:'Conservar',business_owner_subject_id:id,due_at:'2026-10-20T12:00:00Z',assigned_membership_id:id};
   const changed=changeOrigin(schema,values);
   for(const field of fields)expect(changed).not.toHaveProperty(field);
   expect(changed.title).toBe(values.title);expect(changed.business_owner_subject_id).toBe(id);
   expect(changed.due_at).toBe(values.due_at);
   if(schema==='EvidenceRequestCreateRequest')expect(changed).not.toHaveProperty('assigned_membership_id');
   const corrected={...base,[fields.at(-1)!]:id};
   expect(validateForm(schema,corrected)).toEqual({});expect(validator(corrected)).toBe(true);
  });
  it('continues rejecting malformed references and unsupported auxiliary IDs',()=>{
   expect(validateForm(schema,{...base,[fields[0]!]: 'invalid'})[fields[0]!]).toBeDefined();
   expect(validator({...base,[fields[0]!]:id,control_version_id:id})).toBe(false);
  });
 });
}
it('does not enable origin UI or alter grouping requirements for other schemas',()=>{
 expect(originFields('EvidenceCreateRequest')).toEqual([]);
 expect(originFields('ControlAssessmentCreateRequest')).toEqual([]);
 expect(requiredField('ActionCreateRequest','business_owner_subject_id')).toBe(false);
});
