import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";

export type PrimaryRetentionContext = {
  tenantId: string;
  applicabilityId: string;
  retentionPolicyId: string;
  classification: string;
  scopeSubjectId: string | null;
  processingActivityId: string | null;
};

// The primary link identifies a published ordinary obligation. Concurrent
// obligations, especially legal holds, remain inputs to the separate purge guard.
export async function assertPrimaryRetentionApplicability(
  tx: Transaction<FoundationDatabase>, context: PrimaryRetentionContext
): Promise<void> {
  const result = await sql<{ retention_policy_applicability_id: string }>`
    SELECT a.retention_policy_applicability_id
      FROM privacy.retention_policy_applicabilities a
      JOIN privacy.retention_policies p
        ON p.tenant_id=a.tenant_id AND p.retention_policy_id=a.retention_policy_id
     WHERE a.tenant_id=${context.tenantId}::uuid
       AND a.retention_policy_applicability_id=${context.applicabilityId}::uuid
       AND a.retention_policy_id=${context.retentionPolicyId}::uuid
       AND a.classification=${context.classification}
       AND a.purpose='evidence_document'
       AND (a.scope_subject_id IS NULL OR a.scope_subject_id=${context.scopeSubjectId}::uuid)
       AND (a.processing_activity_id IS NULL OR a.processing_activity_id=${context.processingActivityId}::uuid)
       AND a.lifecycle_state='published'
       AND a.effective_from<=transaction_timestamp()
       AND (a.effective_to IS NULL OR a.effective_to>transaction_timestamp())
       AND NOT EXISTS (
         SELECT 1 FROM privacy.retention_policy_applicabilities successor
          WHERE successor.tenant_id=a.tenant_id
            AND successor.supersedes_applicability_id=a.retention_policy_applicability_id
            AND successor.lifecycle_state='published'
            AND successor.effective_from<=transaction_timestamp()
       )
       AND p.ownership_class='TENANT_OWNED'
       AND p.lifecycle_state='published'
       AND p.policy_kind<>'legal_hold'
       AND p.effective_from<=transaction_timestamp()
       AND (p.effective_to IS NULL OR p.effective_to>transaction_timestamp())
       AND NOT EXISTS (
         SELECT 1 FROM privacy.retention_policy_applicabilities peer
         JOIN privacy.retention_policies peer_policy
           ON peer_policy.tenant_id=peer.tenant_id
          AND peer_policy.retention_policy_id=peer.retention_policy_id
        WHERE peer.tenant_id=a.tenant_id
          AND peer.retention_policy_applicability_id<>a.retention_policy_applicability_id
          AND peer.classification=a.classification
          AND peer.purpose=a.purpose
          AND (peer.scope_subject_id IS NULL OR peer.scope_subject_id=${context.scopeSubjectId}::uuid)
          AND (peer.processing_activity_id IS NULL OR peer.processing_activity_id=${context.processingActivityId}::uuid)
          AND peer.lifecycle_state='published'
          AND peer.effective_from<=transaction_timestamp()
          AND (peer.effective_to IS NULL OR peer.effective_to>transaction_timestamp())
          AND peer_policy.lifecycle_state='published'
          AND peer_policy.policy_kind<>'legal_hold'
          AND peer_policy.effective_from<=transaction_timestamp()
          AND (peer_policy.effective_to IS NULL OR peer_policy.effective_to>transaction_timestamp())
          AND peer_policy.precedence_rank>=p.precedence_rank
          AND NOT EXISTS (
            SELECT 1 FROM privacy.retention_policy_applicabilities peer_successor
             WHERE peer_successor.tenant_id=peer.tenant_id
               AND peer_successor.supersedes_applicability_id=peer.retention_policy_applicability_id
               AND peer_successor.lifecycle_state='published'
               AND peer_successor.effective_from<=transaction_timestamp()
          )
       )
     FOR SHARE OF a, p
  `.execute(tx);
  if (result.rows.length !== 1) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Retention applicability is not valid for this context", 422);
  }
}
