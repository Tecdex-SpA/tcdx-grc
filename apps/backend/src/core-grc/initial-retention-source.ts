import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor } from "./model.js";
import { grantedScopes } from "./security.js";
import { assertPrimaryRetentionApplicability, type PrimaryRetentionContext } from "./retention-applicability.js";

type Tx = Transaction<FoundationDatabase>;
const deny = () => { throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); };
const invalid = () => { throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Initial source retention chain is not eligible", 422); };

// All backend applicability writers and source commands take this lock before
// row locks. It also serializes competing policies, whose R2 keys differ.
export async function lockRetentionTenant(tx: Tx, tenantId: string): Promise<void> {
  await sql`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId}::text || ':initial-retention-source',0))`.execute(tx);
}

export async function assertInitialSourceCustody(tx: Tx, actor: CoreActor, c: PrimaryRetentionContext, permission: string): Promise<void> {
  if ((!actor.roles.includes("TENANT_ADMIN") && !actor.roles.includes("EVIDENCE_OWNER"))
      || !actor.userIdentityId || !grantedScopes(actor, permission).has("tenant")) deny();
  const found = await sql<{ retention_policy_applicability_id: string }>`
    SELECT a.retention_policy_applicability_id
      FROM privacy.retention_policy_applicabilities a
      JOIN privacy.retention_policies p ON p.tenant_id=a.tenant_id AND p.retention_policy_id=a.retention_policy_id
     WHERE a.tenant_id=${c.tenantId}::uuid AND a.tenant_id=${actor.tenantId}::uuid
       AND a.retention_policy_applicability_id=${c.applicabilityId}::uuid
       AND a.retention_policy_id=${c.retentionPolicyId}::uuid
       AND a.classification=${c.classification} AND a.purpose='evidence_document'
       AND a.scope_subject_id IS NOT DISTINCT FROM ${c.scopeSubjectId}::uuid
       AND a.processing_activity_id IS NOT DISTINCT FROM ${c.processingActivityId}::uuid
       AND a.lifecycle_state='draft' AND a.source_evidence_version_id IS NULL
       AND a.supersedes_applicability_id IS NULL AND a.version_number=1
       AND p.ownership_class='TENANT_OWNED' AND p.lifecycle_state='published'
       AND p.policy_kind<>'legal_hold' AND p.effective_from<=transaction_timestamp()
       AND (p.effective_to IS NULL OR p.effective_to>transaction_timestamp())
       AND EXISTS (
         SELECT 1 FROM iam.tenant_memberships tm JOIN iam.membership_roles mr
           ON mr.tenant_id=tm.tenant_id AND mr.tenant_membership_id=tm.tenant_membership_id
         JOIN iam.roles r ON r.tenant_id=mr.tenant_id AND r.role_id=mr.role_id
          WHERE tm.tenant_id=a.tenant_id AND tm.user_identity_id=a.created_by_user_identity_id
            AND tm.membership_state='active' AND r.role_code='TENANT_ADMIN' AND r.lifecycle_state='published'
            AND mr.scope_kind='tenant' AND mr.valid_from<=transaction_timestamp()
            AND (mr.valid_to IS NULL OR mr.valid_to>transaction_timestamp())
       )
       AND NOT EXISTS (
         SELECT 1 FROM privacy.retention_policy_applicabilities peer
         JOIN privacy.retention_policies pp ON pp.tenant_id=peer.tenant_id AND pp.retention_policy_id=peer.retention_policy_id
          WHERE peer.tenant_id=a.tenant_id AND peer.classification=a.classification AND peer.purpose=a.purpose
            AND (peer.scope_subject_id IS NULL OR peer.scope_subject_id=${c.scopeSubjectId}::uuid)
            AND (peer.processing_activity_id IS NULL OR peer.processing_activity_id=${c.processingActivityId}::uuid)
            AND peer.lifecycle_state='published' AND peer.effective_from<=transaction_timestamp()
            AND (peer.effective_to IS NULL OR peer.effective_to>transaction_timestamp())
            AND pp.lifecycle_state='published' AND pp.policy_kind<>'legal_hold'
            AND pp.effective_from<=transaction_timestamp() AND (pp.effective_to IS NULL OR pp.effective_to>transaction_timestamp())
            AND NOT EXISTS (SELECT 1 FROM privacy.retention_policy_applicabilities successor
              WHERE successor.tenant_id=peer.tenant_id AND successor.supersedes_applicability_id=peer.retention_policy_applicability_id
                AND successor.lifecycle_state='published' AND successor.effective_from<=transaction_timestamp())
       )
     FOR SHARE OF a,p
  `.execute(tx);
  if (found.rows.length !== 1) invalid();
  // Exact R2 publication key, in addition to the tenant serialization above.
  await sql`SELECT pg_advisory_xact_lock(hashtextextended(${c.tenantId}::text || ${c.retentionPolicyId}::text ||
    COALESCE(${c.scopeSubjectId}::text,'') || COALESCE(${c.processingActivityId}::text,'') || ${c.classification} || 'evidence_document',0))`.execute(tx);
}

// No catch-and-fallback: state selects the published rule or the explicit
// initial-source contract, and each rule fails closed on its own preconditions.
export async function assertUploadRetention(tx: Tx, actor: CoreActor, c: PrimaryRetentionContext, permission: string): Promise<boolean> {
  await lockRetentionTenant(tx, actor.tenantId);
  const result = await sql<{ lifecycle_state: string }>`SELECT lifecycle_state FROM privacy.retention_policy_applicabilities
    WHERE tenant_id=${actor.tenantId}::uuid AND retention_policy_applicability_id=${c.applicabilityId}::uuid`.execute(tx);
  if (result.rows[0]?.lifecycle_state === 'draft') {
    await assertInitialSourceCustody(tx, actor, c, permission);
    return true;
  }
  await assertPrimaryRetentionApplicability(tx, c);
  return false;
}

export async function assertOrdinaryEvidence(tx: Tx, tenantId: string, versionId: string): Promise<void> {
  const result = await sql<{ pending: boolean }>`SELECT EXISTS (
    SELECT 1 FROM evidence.evidence_versions ev
    JOIN privacy.retention_policy_applicabilities a ON a.tenant_id=ev.tenant_id
      AND a.retention_policy_applicability_id=ev.retention_policy_applicability_id
    WHERE ev.tenant_id=${tenantId}::uuid AND ev.evidence_version_id=${versionId}::uuid
      AND a.lifecycle_state<>'published') AS pending`.execute(tx);
  if (result.rows[0]?.pending) invalid();
}

export async function assertLegalSource(tx: Tx, tenantId: string, applicabilityId: string, sourceId: string, from: string, to: string | null, initial: boolean): Promise<void> {
  await sql`SELECT ev.evidence_version_id FROM evidence.evidence_versions ev
    LEFT JOIN evidence.document_versions dv ON dv.tenant_id=ev.tenant_id AND dv.document_version_id=ev.document_version_id
    JOIN evidence.file_objects fo ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=COALESCE(ev.file_object_id,dv.file_object_id)
    WHERE ev.tenant_id=${tenantId}::uuid AND ev.evidence_version_id=${sourceId}::uuid FOR SHARE OF ev,fo`.execute(tx);
  const result = await sql<{ valid: boolean }>`SELECT EXISTS (
    SELECT 1 FROM evidence.evidence_versions ev
    JOIN evidence.evidences e ON e.tenant_id=ev.tenant_id AND e.evidence_id=ev.evidence_id
    LEFT JOIN evidence.document_versions dv ON dv.tenant_id=ev.tenant_id AND dv.document_version_id=ev.document_version_id
    JOIN evidence.file_objects fo ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=COALESCE(ev.file_object_id,dv.file_object_id)
    JOIN privacy.retention_policy_applicabilities a ON a.tenant_id=ev.tenant_id AND a.retention_policy_applicability_id=${applicabilityId}::uuid
    JOIN privacy.retention_policies p ON p.tenant_id=a.tenant_id AND p.retention_policy_id=a.retention_policy_id
    WHERE ev.tenant_id=${tenantId}::uuid AND ev.evidence_version_id=${sourceId}::uuid
      AND ev.lifecycle_state='approved' AND fo.scan_status='passed'
      AND ev.effective_from<=transaction_timestamp() AND ev.effective_from<=${from}::timestamptz
      AND (ev.effective_to IS NULL OR (ev.effective_to>transaction_timestamp() AND ${to}::timestamptz IS NOT NULL AND ev.effective_to>=${to}::timestamptz))
      AND (ev.expires_at IS NULL OR (ev.expires_at>transaction_timestamp() AND ${to}::timestamptz IS NOT NULL AND ev.expires_at>=${to}::timestamptz))
      AND p.lifecycle_state='published' AND p.effective_from<=transaction_timestamp() AND p.effective_from<=${from}::timestamptz
      AND (p.effective_to IS NULL OR (p.effective_to>transaction_timestamp() AND ${to}::timestamptz IS NOT NULL AND p.effective_to>=${to}::timestamptz))
      AND EXISTS (SELECT 1 FROM evidence.evidence_reviews er JOIN iam.tenant_memberships tm
        ON tm.tenant_id=er.tenant_id AND tm.tenant_membership_id=er.reviewer_membership_id
        WHERE er.tenant_id=ev.tenant_id AND er.evidence_version_id=ev.evidence_version_id AND er.decision='approved'
          AND tm.user_identity_id<>ev.created_by_user_identity_id)
      AND (NOT ${initial}::boolean OR (
        ev.retention_policy_applicability_id=a.retention_policy_applicability_id
        AND fo.retention_policy_applicability_id=a.retention_policy_applicability_id
        AND fo.retention_policy_id=a.retention_policy_id AND e.retention_policy_id=a.retention_policy_id
        AND fo.classification=a.classification AND fo.created_by_user_identity_id=ev.created_by_user_identity_id
        AND EXISTS (SELECT 1 FROM evidence.file_upload_intents fi WHERE fi.tenant_id=ev.tenant_id
          AND fi.file_object_id=fo.file_object_id AND fi.retention_policy_applicability_id=a.retention_policy_applicability_id
          AND fi.retention_policy_id=a.retention_policy_id AND fi.lifecycle_state='promoted'
          AND fi.created_by_user_identity_id=ev.created_by_user_identity_id AND fi.classification=a.classification)
      ))
    ) AS valid`.execute(tx);
  if (!result.rows[0]?.valid) invalid();
}
