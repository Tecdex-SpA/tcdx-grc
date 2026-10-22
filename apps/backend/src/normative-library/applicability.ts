import { validateLibrarySchema } from '@tcdx-grc/contracts/normative-library';
import { invariant } from './authorization.js';

export type ApplicabilityIdentity = { requirement_applicability_id: string; applicability_version: number; row_version: number; tenant_id: string; scope_subject_id: string | null; context_knowledge_version_id: string | null };
export type ContextSnapshot = { knowledge_version_id: string; knowledge_item_id: string; version_number: number; content_hash: string; subject_id: string; ownership_class: 'TENANT_OWNED' };
export type ContextFacts = ContextSnapshot & { tenant_id: string; lifecycle_state: string; reviewed_exact_hash: boolean; subject_type: string; effective_from: string; effective_to: string | null };
export function contextualAuditProfile(row: ApplicabilityIdentity, context: ContextFacts | null, asOf: string) {
  if (![row.row_version,row.applicability_version,...(context ? [context.version_number] : [])].every(n=>Number.isSafeInteger(n)&&n>0)) invariant('Invalid exact persisted version');
  const instant = Date.parse(asOf);
  if (!Number.isFinite(instant)) invariant('Invalid context evaluation time');
  if ((row.context_knowledge_version_id === null) !== (context === null)) invariant('Missing exact context');
  if (context && (context.knowledge_version_id !== row.context_knowledge_version_id || context.tenant_id !== row.tenant_id || context.ownership_class !== 'TENANT_OWNED' || context.lifecycle_state !== 'published' || !context.reviewed_exact_hash || !Number.isFinite(Date.parse(context.effective_from)) || Date.parse(context.effective_from) > instant || (context.effective_to !== null && (!Number.isFinite(Date.parse(context.effective_to)) || instant >= Date.parse(context.effective_to))) || (row.scope_subject_id !== null ? context.subject_id !== row.scope_subject_id : context.subject_type !== 'organization'))) invariant('Ineligible exact business context');
  const snapshot: ContextSnapshot | null = context ? { knowledge_version_id: context.knowledge_version_id, knowledge_item_id: context.knowledge_item_id, version_number: context.version_number, content_hash: context.content_hash, subject_id: context.subject_id, ownership_class: context.ownership_class } : null;
  const profile = { profile: 'APPLICABILITY_CONTEXT_V1', requirement_applicability_id: row.requirement_applicability_id, applicability_version: row.applicability_version, row_version: row.row_version, tenant_id: row.tenant_id, scope_subject_id: row.scope_subject_id, context: snapshot };
  if (!validateLibrarySchema('ApplicabilityContextAudit', profile).valid) invariant('Invalid applicability audit snapshot');
  return profile;
}
/** Historical absence remains unrecorded; never manufacture a snapshot from current Knowledge. */
export function historicalContext(payload: Record<string, unknown> | null): unknown | undefined {
  return payload?.applicability_context_v1;
}
