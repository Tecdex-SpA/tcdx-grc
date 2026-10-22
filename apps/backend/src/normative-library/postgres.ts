// Prepared adapter: intentionally not registered in server.ts until physical/IAM/runtime gates.
import { sql, type Transaction } from 'kysely';
import type { FoundationDatabase } from '../database.js';
import type { CoreActor } from '../core-grc/model.js';
import { requireAccess } from '../core-grc/security.js';
import { getResource } from '../core-grc/repository.js';
import { resources } from '../core-grc/model.js';
import { assertSelectableFramework } from '../core-grc/reference-reads.js';
import { validateLibrarySchema, type KnowledgeTarget, type KnowledgeLink } from '@tcdx-grc/contracts/normative-library';
import { concealed, invalid, type Ownership } from './authorization.js';
import type { TargetFacts } from './knowledge.js';
import { contextualAuditProfile, type ApplicabilityIdentity, type ContextFacts } from './applicability.js';

type Tx = Transaction<FoundationDatabase>;
/** Closed typed targets, parameterized SQL, canonical object/pack checks. No generic table input. */
export async function tenantKnowledgeTarget(tx: Tx, actor: CoreActor, target: KnowledgeTarget, lock = true): Promise<TargetFacts> {
  if (!validateLibrarySchema('KnowledgeTarget',target).valid) invalid('target');
  if ('subject_id' in target) {
    requireAccess(actor,'organization.subject.read','CORE_PLATFORM',['tenant']);
    const result=await sql<{ subject_id:string;tenant_id:string }>`SELECT subject_id,tenant_id FROM org.subjects WHERE subject_id=${target.subject_id}::uuid AND tenant_id=${actor.tenantId}::uuid AND lifecycle_state='active' AND effective_from<=transaction_timestamp() AND (effective_to IS NULL OR effective_to>transaction_timestamp())${sql.raw(lock ? " FOR SHARE" : "")}`.execute(tx);
    if(!result.rows[0])concealed();return {id:target.subject_id,kind:'subject_id',tenant_id:actor.tenantId,ownership_class:'TENANT_OWNED',readable:true};
  }
  if ('control_version_id' in target) {
    requireAccess(actor,'controls.control.read',resources.control.capability,['tenant','owned_object','assigned_object']);
    const rows=await sql<{ control_id:string;ownership_class:Ownership['ownership_class'];tenant_id:string|null }>`SELECT control_id,ownership_class,tenant_id FROM controls.control_versions WHERE control_version_id=${target.control_version_id}::uuid AND (tenant_id=${actor.tenantId}::uuid OR tenant_id IS NULL)${sql.raw(lock ? " FOR SHARE" : "")}`.execute(tx);
    const row=rows.rows[0];if(!row)concealed();await getResource(tx,actor,resources.control,row.control_id);
    return {id:target.control_version_id,kind:'control_version_id',...row,readable:true};
  }
  const unit='normative_unit_id' in target;
  const permission=unit?'compliance.normative_unit.read':'compliance.requirement.read';
  requireAccess(actor,permission,'ISO_COMPLIANCE',['tenant']);
  const id=unit?target.normative_unit_id:target.requirement_id;
  const result=unit ? await sql<{framework_version_id:string;ownership_class:Ownership['ownership_class'];tenant_id:string|null}>`SELECT framework_version_id,ownership_class,tenant_id FROM regulatory.normative_units WHERE normative_unit_id=${id}::uuid AND (tenant_id=${actor.tenantId}::uuid OR tenant_id IS NULL)${sql.raw(lock ? " FOR SHARE" : "")}`.execute(tx)
    : await sql<{framework_version_id:string;ownership_class:Ownership['ownership_class'];tenant_id:string|null}>`SELECT framework_version_id,ownership_class,tenant_id FROM regulatory.requirements WHERE requirement_id=${id}::uuid AND (tenant_id=${actor.tenantId}::uuid OR tenant_id IS NULL)${sql.raw(lock ? " FOR SHARE" : "")}`.execute(tx);
  const row=result.rows[0];if(!row)concealed();await assertSelectableFramework(tx,actor,row.framework_version_id,lock);
  return {id,kind:unit?'normative_unit_id':'requirement_id',...row,readable:true};
}
export async function insertKnowledgeLinks(tx: Tx, versionId: string, authority: Ownership, userId: string, links: readonly KnowledgeLink[], nextId:()=>string):Promise<void> {
  for(const link of links){
    if(!validateLibrarySchema('KnowledgeContextLinkInput',link).valid)invalid('links');
    await sql`INSERT INTO knowledge.knowledge_version_context_links
      (knowledge_version_context_link_id,created_by_user_identity_id,ownership_class,tenant_id,knowledge_version_id,normative_unit_id,requirement_id,control_version_id,subject_id,context_role,source_locator,provenance_ref,excerpt_hash)
      VALUES (${nextId()}::uuid,${userId}::uuid,${authority.ownership_class},${authority.tenant_id}::uuid,${versionId}::uuid,
        ${'normative_unit_id' in link.target?link.target.normative_unit_id:null}::uuid,${'requirement_id' in link.target?link.target.requirement_id:null}::uuid,
        ${'control_version_id' in link.target?link.target.control_version_id:null}::uuid,${'subject_id' in link.target?link.target.subject_id:null}::uuid,
        ${link.context_role},${link.source_locator},${link.provenance_ref},${link.excerpt_hash??null})`.execute(tx);
  }
}
/** Returns a minimized profile for the existing AuditEvent, never appends a parallel audit. */
export async function loadApplicabilityContextProfile(tx: Tx, actor: CoreActor, row: ApplicabilityIdentity) {
  if(row.tenant_id!==actor.tenantId)concealed();
  const time=await sql<{now:string}>`SELECT to_char(transaction_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS now`.execute(tx);
  if(!row.context_knowledge_version_id)return contextualAuditProfile(row,null,time.rows[0]!.now);
  const result=await sql<ContextFacts>`SELECT v.knowledge_version_id,v.knowledge_item_id,v.version_number,v.content_hash,v.tenant_id,v.ownership_class,v.lifecycle_state,
      v.effective_from::text,LEAST(v.effective_to,successor.effective_from)::text AS effective_to,s.subject_id,s.subject_type,
      EXISTS(SELECT 1 FROM ops_audit.audit_events a WHERE a.tenant_id=v.tenant_id AND a.aggregate_type='KnowledgeVersion' AND a.aggregate_id=v.knowledge_version_id
        AND a.outcome='succeeded' AND a.event_code='audit.knowledge.knowledge_version.review.v1' AND a.after_payload->>'artifact_hash'=v.content_hash
        AND a.after_payload->>'to_state'='reviewed' AND a.actor_user_identity_id IS DISTINCT FROM v.created_by_user_identity_id) AS reviewed_exact_hash
    FROM knowledge.knowledge_versions v
    LEFT JOIN knowledge.knowledge_versions successor ON successor.knowledge_version_id=v.superseded_by_id AND successor.knowledge_item_id=v.knowledge_item_id AND successor.tenant_id=v.tenant_id AND successor.ownership_class=v.ownership_class AND successor.lifecycle_state='published'
    JOIN knowledge.knowledge_items i ON i.knowledge_item_id=v.knowledge_item_id AND i.tenant_id=v.tenant_id AND i.ownership_class=v.ownership_class
    JOIN knowledge.knowledge_sources ks ON ks.knowledge_source_id=i.knowledge_source_id AND ks.tenant_id=v.tenant_id AND ks.ownership_class=v.ownership_class
    JOIN knowledge.knowledge_version_context_links l ON l.knowledge_version_id=v.knowledge_version_id AND l.tenant_id=v.tenant_id AND l.context_role='contexto_empresarial'
    JOIN org.subjects s ON s.subject_id=l.subject_id AND s.tenant_id=v.tenant_id
    WHERE v.knowledge_version_id=${row.context_knowledge_version_id}::uuid AND v.tenant_id=${actor.tenantId}::uuid
      AND (v.superseded_by_id IS NULL OR successor.knowledge_version_id IS NOT NULL)
      AND s.lifecycle_state='active' AND s.effective_from<=transaction_timestamp() AND (s.effective_to IS NULL OR s.effective_to>transaction_timestamp())
      AND (${row.scope_subject_id}::uuid IS NULL OR s.subject_id=${row.scope_subject_id}::uuid)
    FOR SHARE OF v,i,ks,l,s`.execute(tx);
  if(result.rows.length!==1)concealed();
  const context=result.rows[0]!;
  return contextualAuditProfile(row,{...context,version_number:Number(context.version_number)},time.rows[0]!.now);
}
