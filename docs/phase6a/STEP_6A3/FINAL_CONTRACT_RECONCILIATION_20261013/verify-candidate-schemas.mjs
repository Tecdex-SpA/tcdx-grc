// Documentary schema compilation with the existing pinned contracts dependencies.
// No product requests, DB, IAM, fixtures, migration runner, or approval changes.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=process.cwd();
const out=resolve(root,'docs/phase6a/STEP_6A3/FINAL_CONTRACT_RECONCILIATION_20261013');
const require=createRequire(resolve(root,'packages/contracts/package.json'));
const Ajv=require('ajv/dist/2020').default;
const addFormats=require('ajv-formats').default;
const {parse}=require('yaml');
const base=parse(readFileSync(resolve(root,'docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml'),'utf8'));
const api=JSON.parse(readFileSync(resolve(out,'07_OPENAPI_COMMERCIAL_CANDIDATE.json'),'utf8'));
function replaceRefs(value,prefix) {
  if(Array.isArray(value)) return value.map(node=>replaceRefs(node,prefix));
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,node])=>[
    key,key==='$ref' && typeof node==='string' && node.startsWith('#/components/schemas/')
      ? '#/$defs/'+prefix+node.slice('#/components/schemas/'.length) : replaceRefs(node,prefix)
  ]));
  return value;
}
const defs=Object.fromEntries(Object.entries(base.components.schemas).map(([key,value])=>['base_'+key,replaceRefs(value,'base_')]));
for(const [key,value] of Object.entries(api.components.schemas)) defs[key]=key==='ErrorEnvelope'
  ? {$ref:'#/$defs/base_ErrorEnvelope'} : replaceRefs(value,'');
const ajv=new Ajv({strict:false,allErrors:true,validateSchema:true});
addFormats(ajv);
let compiled=0;
for(const name of Object.keys(api.components.schemas)) {
  ajv.compile({$schema:'https://json-schema.org/draft/2020-12/schema',$defs:defs,$ref:'#/$defs/'+name});
  compiled++;
}
for(const name of ['17_PUBLICATION_MANIFEST_SCHEMA.json','18_CATALOG_PUBLICATION_RESULT_SCHEMA.json']) {
  ajv.compile(JSON.parse(readFileSync(resolve(out,name),'utf8')));
  compiled++;
}
const audit=JSON.parse(readFileSync(resolve(out,'12_AUDIT_EVENT_PAYLOAD_SCHEMAS.json'),'utf8'));
audit.$defs.ErrorEnvelope={$ref:'#/$defs/base_ErrorEnvelope'};
Object.assign(audit.$defs,Object.fromEntries(Object.entries(defs).filter(([key])=>key.startsWith('base_'))));
for(const name of ['ParentAuditBefore','ParentAuditAfter','ChildAuditBefore','ChildAuditAfter','PlanChangedEventPayload']) {
  ajv.compile({...audit,$id:audit.$id+':'+name,$ref:'#/$defs/'+name});compiled++;
}
for(const [path,methods] of Object.entries(api.paths)) {
  if(path.includes('?')) throw new Error('Query embedded in OpenAPI path');
  for(const operation of Object.values(methods)) {
    const parameters=operation.parameters.map(item=>api.components.parameters[item.$ref.split('/').at(-1)]);
    for(const token of path.matchAll(/\{([^}]+)\}/g)) {
      if(!parameters.some(p=>p.in==='path' && p.name===token[1] && p.required===true)) throw new Error('Missing required path parameter');
    }
    if(!operation.security?.length || !operation['x-permission']) throw new Error('Unbound operation authority');
  }
}
process.stdout.write(JSON.stringify({candidateSchemaCompilation:'PASS',compiledSchemas:compiled,operations:4,
  scope:'JSON Schema meta-validation/reference compilation and documentary operation structure; no runtime tests or human gate'},null,2)+'\n');
