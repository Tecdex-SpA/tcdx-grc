import { CompiledQuery, type Transaction } from 'kysely';
import type { FoundationDatabase } from '../database.js';
import { hashCanonical } from '../regulatory/hash.js';
import type { MatrixAxis, MatrixCell, MatrixRef } from '@tcdx-grc/contracts/normative-library';
import type { CoreActor } from '../core-grc/model.js';
import { authorizeMatrix, type MatrixPopulation, type MatrixQuery } from './matrices.js';
import { invariant } from './authorization.js';

type Row = Record<string,unknown>;
type Shape = { joins:string; rowId:string; columnId:string; relationId:string; lifecycle:string; ownership:string; effective:string; filters:Record<string,string>; rowLabel:string; columnLabel:string };
// Version numbers identify a revision only within their canonical parent.
// These fixed FK lookups expose business labels under the same source/object
// authorization used for each axis; callers cannot supply SQL or another parent.
const versionParentCodes:Partial<Record<MatrixQuery['type'],string>>={
 requirements_controls:'(SELECT parent.control_code FROM controls.controls parent WHERE parent.control_id=c.control_id AND parent.ownership_class=c.ownership_class AND parent.tenant_id IS NOT DISTINCT FROM c.tenant_id)',
 controls_evidence:'(SELECT parent.evidence_code FROM evidence.evidences parent WHERE parent.evidence_id=c.evidence_id AND parent.tenant_id=c.tenant_id)'
};
// Only these published joins exist. User input never chooses a table, column, axis or SQL expression.
const shapes:Record<MatrixQuery['type'],Shape>={
 requirements_controls:{joins:'regulatory.requirement_control_mappings l JOIN regulatory.requirements r ON r.requirement_id=l.requirement_id JOIN controls.control_versions c ON c.control_version_id=l.control_version_id',rowId:'requirement_id',columnId:'control_version_id',relationId:'requirement_control_mapping_id',lifecycle:'l.lifecycle_state',ownership:'(l.tenant_id IS NULL OR l.tenant_id=$1::uuid) AND (r.tenant_id IS NULL OR r.tenant_id=$1::uuid) AND (c.tenant_id IS NULL OR c.tenant_id=$1::uuid)',effective:'l',filters:{source_framework_version_id:'r.framework_version_id',requirement_id:'r.requirement_id',control_version_id:'c.control_version_id'},rowLabel:'requirement_code',columnLabel:'version_number'},
 controls_evidence:{joins:'evidence.evidence_links l JOIN controls.controls r ON r.control_id=l.control_id OR r.control_id=(SELECT v.control_id FROM controls.control_versions v WHERE v.control_version_id=l.control_version_id AND v.tenant_id=l.tenant_id) JOIN evidence.evidence_versions c ON c.evidence_version_id=l.evidence_version_id AND c.tenant_id=l.tenant_id',rowId:'control_id',columnId:'evidence_version_id',relationId:'evidence_link_id',lifecycle:'c.lifecycle_state',ownership:'l.tenant_id=$1::uuid AND r.tenant_id=$1::uuid',effective:'l',filters:{control_id:'r.control_id',control_version_id:'l.control_version_id'},rowLabel:'control_code',columnLabel:'version_number'},
 requirements_assessments:{joins:'regulatory.requirement_applicabilities l JOIN regulatory.requirements r ON r.requirement_id=l.requirement_id JOIN regulatory.requirement_assessments c ON c.requirement_applicability_id=l.requirement_applicability_id AND c.tenant_id=l.tenant_id',rowId:'requirement_id',columnId:'requirement_assessment_id',relationId:'requirement_assessment_id',lifecycle:'c.lifecycle_state',ownership:'l.tenant_id=$1::uuid AND (r.tenant_id IS NULL OR r.tenant_id=$1::uuid)',effective:'l',filters:{source_framework_version_id:'r.framework_version_id',requirement_id:'r.requirement_id',scope_subject_id:'l.scope_subject_id',result_status:'c.result_status'},rowLabel:'requirement_code',columnLabel:'requirement_assessment_id'},
 frameworks_frameworks:{joins:'regulatory.framework_crosswalks l JOIN regulatory.framework_versions r ON r.framework_version_id=l.source_framework_version_id JOIN regulatory.framework_versions c ON c.framework_version_id=l.target_framework_version_id',rowId:'framework_version_id',columnId:'framework_version_id',relationId:'framework_crosswalk_id',lifecycle:'l.lifecycle_state',ownership:'(l.tenant_id IS NULL OR l.tenant_id=$1::uuid) AND (r.tenant_id IS NULL OR r.tenant_id=$1::uuid) AND (c.tenant_id IS NULL OR c.tenant_id=$1::uuid)',effective:'l',filters:{source_framework_version_id:'r.framework_version_id',target_framework_version_id:'c.framework_version_id'},rowLabel:'edition',columnLabel:'edition'},
 obligations_applicability:{joins:'regulatory.requirement_applicabilities l JOIN regulatory.requirements r ON r.requirement_id=l.requirement_id JOIN regulatory.requirement_applicabilities c ON c.requirement_applicability_id=l.requirement_applicability_id AND c.tenant_id=l.tenant_id',rowId:'requirement_id',columnId:'requirement_applicability_id',relationId:'requirement_applicability_id',lifecycle:'l.lifecycle_state',ownership:'l.tenant_id=$1::uuid AND (r.tenant_id IS NULL OR r.tenant_id=$1::uuid)',effective:'l',filters:{source_framework_version_id:'r.framework_version_id',requirement_id:'r.requirement_id',scope_subject_id:'l.scope_subject_id'},rowLabel:'requirement_code',columnLabel:'applicability_version'},
 issues_actions:{joins:'remediation.actions l JOIN remediation.issues r ON r.issue_id=l.issue_id AND r.tenant_id=l.tenant_id JOIN remediation.actions c ON c.action_id=l.action_id AND c.tenant_id=l.tenant_id',rowId:'issue_id',columnId:'action_id',relationId:'action_id',lifecycle:'l.lifecycle_state',ownership:'l.tenant_id=$1::uuid',effective:'created_at',filters:{issue_id:'r.issue_id',action_id:'c.action_id'},rowLabel:'issue_code',columnLabel:'action_code'}
};
export function matrixSourceQuery(actor:CoreActor,query:MatrixQuery) {
 authorizeMatrix(actor,query.type);const d=shapes[query.type];const values:unknown[]=[actor.tenantId,query.filters.as_of];
 let where=d.ownership;
 if(d.effective==='created_at')where+=' AND l.created_at<=$2::timestamptz AND r.created_at<=$2::timestamptz';
 else where+=` AND (${d.effective}.effective_from IS NULL OR ${d.effective}.effective_from<=$2::timestamptz) AND (${d.effective}.effective_to IS NULL OR ${d.effective}.effective_to>$2::timestamptz)`;
 for(const [field,value]of Object.entries(query.filters)){
  if(field==='as_of')continue;
  if(field==='query') {values.push('%'+value+'%');where+=` AND (r.${d.rowLabel}::text ILIKE $${values.length} OR c.${d.columnLabel}::text ILIKE $${values.length}${versionParentCodes[query.type]?` OR ${versionParentCodes[query.type]} ILIKE $${values.length}`:''})`;continue;}
  const expression=field==='lifecycle_state'?d.lifecycle:d.filters[field];
  if(expression){values.push(value);where+=` AND ${expression}=$${values.length}${field.endsWith('_id')?'::uuid':'::text'}`;continue;}
  if(field==='period_start'||field==='period_end'){values.push(value);where+=` AND c.assessed_at${field==='period_start'?'>=':'<'}$${values.length}::timestamptz`;continue;}
  invariant('Unbound matrix source filter');
 }
 const parentCode=versionParentCodes[query.type];
 const columnData=parentCode?`to_jsonb(c)||jsonb_build_object('matrix_parent_code',${parentCode})`:'to_jsonb(c)';
 return {sql:`SELECT to_jsonb(r) AS row_data,${columnData} AS column_data,to_jsonb(l) AS relation_data,transaction_timestamp() AS read_at FROM ${d.joins} WHERE ${where}`,parameters:values};
}
function iso(v:unknown):string|null {if(v==null)return null;const t=new Date(String(v));if(!Number.isFinite(t.getTime()))invariant('Invalid persisted timestamp');return t.toISOString();}
function text(v:unknown):string|null{return v==null||v===''?null:String(v);}
function ref(field:string,value:unknown):MatrixRef {if(typeof value!=='string')invariant('Missing typed matrix identity');return {[field]:value} as MatrixRef;}
function axis(value:Row,id:string,label:string):MatrixAxis {
 const identity=ref(id,value[id]);const code=text(value[label]);
 if(!code)invariant('Missing canonical matrix label');
 // Hash only metadata exposed by the projection, never bodies/private JSON columns.
 const parentCode=text(value.matrix_parent_code);
 const projection={ref:identity,label:parentCode?`${parentCode} · v${code}`:code,code:parentCode??code,framework_version_id:text(value.framework_version_id)};
 return {...projection,revision_hash:hashCanonical(projection)};
}
/** Caller runs this inside READ ONLY/REPEATABLE READ and passes all results through projectMatrixPage authority. */
export async function loadMatrixPopulation(tx:Transaction<FoundationDatabase>,actor:CoreActor,query:MatrixQuery):Promise<MatrixPopulation>{
 const compiled=matrixSourceQuery(actor,query),d=shapes[query.type];
 const result=await tx.executeQuery<{row_data:Row;column_data:Row;relation_data:Row;read_at:Date}>(CompiledQuery.raw(compiled.sql,compiled.parameters));
 const rows=new Map<string,MatrixAxis>(),columns=new Map<string,MatrixAxis>(),cells:MatrixCell[]=[];
 for(const record of result.rows){const r=record.row_data,c=record.column_data,l=record.relation_data;
  // An EvidenceLink to exact ControlVersion stays exact; never guess latest for control_id.
  const exact=query.type==='controls_evidence'&&typeof l.control_version_id==='string';
  const rowAxis=exact?axis({control_version_id:l.control_version_id,control_code:r.control_code},'control_version_id','control_code'):axis(r,d.rowId,d.rowLabel);
  const colAxis=axis(c,d.columnId,d.columnLabel);rows.set(hashCanonical(rowAxis.ref),rowAxis);columns.set(hashCanonical(colAxis.ref),colAxis);
  const relationId=query.type==='requirements_assessments'?c[d.relationId]:l[d.relationId];if(typeof relationId!=='string')invariant('Missing canonical relation');
  cells.push({row_ref:rowAxis.ref,column_ref:colAxis.ref,relation_ref:{[d.relationId]:relationId},relationship_type:text(l.mapping_type??l.applicability_decision),direction:text(l.direction),rationale:text(l.rationale),provenance_ref:text(l.provenance_ref??c.provenance_ref),effective_from:iso(l.effective_from),effective_to:iso(l.effective_to),stored_result:query.type==='requirements_assessments'?{assessment_ref:{requirement_assessment_id:c.requirement_assessment_id},result_status:c.result_status,domain_conclusion:text(c.domain_conclusion),methodology_version_ref:text(c.methodology_version_ref),effective_at:iso(c.assessed_at),period_start:null,period_end:null,effective_configuration_id:text(c.effective_configuration_id),source_revision_hash:hashCanonical({id:c.requirement_assessment_id,row_version:c.row_version,result_status:c.result_status,domain_conclusion:c.domain_conclusion,methodology_version_ref:c.methodology_version_ref,assessed_at:c.assessed_at,effective_configuration_id:c.effective_configuration_id})}:null,source_lifecycle_state:text(query.type==='requirements_assessments'||query.type==='controls_evidence'?c.lifecycle_state:l.lifecycle_state)});
 }
 return {rows:[...rows.values()],columns:[...columns.values()],cells,readAt:result.rows[0]?.read_at.toISOString()??(await tx.executeQuery<{now:Date}>(CompiledQuery.raw('SELECT transaction_timestamp() AS now'))).rows[0]!.now.toISOString()};
}
