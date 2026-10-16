// Candidate document verification only. No application, fixtures, DB or deployment execution.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseDocument} from '../../../../packages/contracts/node_modules/yaml/dist/index.js';
const root=process.cwd();
const pkg='docs/governance/amendments/STEP_6A3_INITIAL_SOURCE_20261015';
const candidate='docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.11_2026-10-15';
const exec='docs/executable-contracts/candidates/STEP_6A3_INITIAL_SOURCE_v1.11';
const out='docs/phase6a/STEP_6A3/evidence/po-approved-initial-source-20261015';
const bytes=p=>readFileSync(resolve(root,p));
const hash=p=>createHash('sha256').update(bytes(p)).digest('hex');
const json=p=>JSON.parse(bytes(p));
const review=json(pkg+'/NEW_BYTES_REVIEW_MANIFEST.json');
for(const entry of review.files)assert.equal(hash(entry.path),entry.sha256,entry.path);
for(const entry of review.supplemental_reviews??[])assert.equal(hash(entry.path),entry.sha256,entry.path);
assert.equal(hash(review.diff.path),review.diff.sha256);
const receipt=json(review.po_design_receipt.path);
assert.equal(hash(review.po_design_receipt.path),review.po_design_receipt.sha256);
assert.equal(hash(receipt.approved_proposal.path),receipt.approved_proposal.sha256);
assert.equal(hash(receipt.original_decision_manifest.path),receipt.original_decision_manifest.sha256);
assert.deepEqual(receipt.actor.additional_roles_exercised_in_this_act,[]);
assert.equal(receipt.original_act_time_utc,null);
assert.equal(bytes('docs/rector/BASELINE_ID').toString().trim(),review.active_baseline);
assert.equal(hash('docs/rector/baseline/SHA256SUMS.txt'),'b9b6bf6930931af5eb32ca1b4027212ad3a82f247fef677b919af24d30ac9060');
const entries=bytes(candidate+'/SHA256SUMS.txt').toString().trim().split('\n');
assert.equal(entries.length,51);
assert.equal(readdirSync(resolve(root,candidate)).filter(s=>s.endsWith('.md')).length,51);
for(const line of entries){const [digest,name]=line.split('  ');assert.equal(hash(candidate+'/'+name.replace(/^\.\//,'')),digest);}
assert.equal(hash(candidate+'/SHA256SUMS.txt'),review.candidate_rector_manifest_sha256);
const read=p=>{const doc=parseDocument(bytes(p).toString());assert.equal(doc.errors.length,0,doc.errors.map(v=>v.message).join('\n'));return doc.toJS();};
const base=read('docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml');
const next=read(exec+'/snapshots/02_OPENAPI_BASE_CONTRACT.yaml');
const methods=['get','post','put','patch','delete'];
const ops=doc=>Object.entries(doc.paths).flatMap(([path,item])=>Object.entries(item).filter(([method])=>methods.includes(method)).map(([method,value])=>({path,method,...value})));
const before=ops(base),after=ops(next);
assert.equal(after.length,before.length+1);
assert.equal(new Set(after.map(v=>v.operationId)).size,after.length);
for(const op of before){
 const found=after.find(v=>v.operationId===op.operationId);assert.ok(found);
 const {['x-tcdx-initial-source-contract']:unused,...original}=found;assert.deepEqual(original,op,op.operationId);
}
const bind=after.find(v=>v.operationId==='retentionApplicabilityBindInitialSource');
assert.equal(bind.path,'/retention-policy-applicabilities/{id}:bind-initial-source');
assert.equal(bind.method,'post');assert.equal(bind['x-tcdx-permission'],'`privacy.retention_policy.update`');
assert.equal(bind['x-tcdx-capability'],'PRIVACY');assert.equal(bind['x-tcdx-scope'],'tenant');
assert.equal(bind['x-tcdx-audit-event'],'`audit.privacy.retention_policy_applicability.bind_initial_source.v1`');
assert.ok(bind.parameters.some(v=>v.$ref==='#/components/parameters/IfMatch'));
assert.ok(bind.parameters.some(v=>v.$ref==='#/components/parameters/TenantContext'));
assert.ok(bind.parameters.some(v=>v.$ref==='#/components/parameters/IdempotencyKey'));
const schema=next.components.schemas.RetentionApplicabilityBindInitialSourceRequest;
assert.equal(schema.additionalProperties,false);
assert.deepEqual([...schema.required].sort(),['effective_from','source_clause_ref','source_evidence_version_id']);
assert.equal(schema.properties.expected_version,undefined);
assert.equal(new RegExp(schema.properties.source_clause_ref.pattern).test('   '),false);
for(const code of ['200','400','401','403','404','409','422'])assert.ok(bind.responses[code]);
const refs=[];
function walk(v){if(!v||typeof v!=='object')return;for(const [k,value]of Object.entries(v)){if(k==='$ref'&&typeof value==='string'&&value.startsWith('#/'))refs.push(value);else walk(value);}}
walk(next);
for(const ref of refs){let value=next;for(const key of ref.slice(2).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~')))value=value?.[key];assert.ok(value,ref);}
assert.equal(hash('database/migrations/20261015000100_c04w_applicability_hold_r2.sql'),'b2a5bc73f75d7f95fb7ba5068f1b3ea77a923d7da7501446d05455ee545ec523');
assert.equal(hash('docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md'),'eedf85debfb5eb48e25d4abdd5ff4332c5dba8197ab7b96a66b97f640cfef4df');
const results={recorded_at_utc:new Date().toISOString(),status:'PASS_CANDIDATE_DOCUMENT_VALIDATION_ONLY',
 scope:'Hash integrity, full51 rector candidate, PO receipt scope, OpenAPI parsing/local refs and closed bind schema; no product behavior tests',
 reviewed_files:review.files.length,baseline_files:entries.length,previous_openapi_operations:before.length,candidate_openapi_operations:after.length,
 local_refs_resolved:refs.length,existing_operations_unchanged_except_candidate_source_contract_annotation:true,
 active_baseline_unchanged:true,R2_and_contract27_unchanged:true,
 candidate_rector_manifest_sha256:review.candidate_rector_manifest_sha256,new_bytes_manifest_sha256:hash(pkg+'/NEW_BYTES_REVIEW_MANIFEST.json'),
 gates:{PO_DESIGN:'APPROVED',NEW_BYTES_HUMAN_REVIEW:'PENDING',ACTIVE_SUCCESSOR:'NOT_ACTIVATED',HUMAN_DATA_DICTAMEN:'PENDING',
 PRODUCT_IMPLEMENTATION_TESTS:'NOT_RUN',RELEASE_QA:'BLOCKED_DEPLOY_AUTHORITY',STEP_6A3:'PARTIAL_BLOCKED',STEP_6A4:'NOT_STARTED'}};
writeFileSync(resolve(root,out,'candidate-document-validation.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
