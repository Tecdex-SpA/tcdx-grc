import { sql, type Kysely } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { VerifiedIdentity } from "./authentication.js";

export type TenantContext = {
  tenantId: string;
  membershipId: string;
  identity: VerifiedIdentity;
};

export async function resolveTenantContext(database: Kysely<FoundationDatabase>, identity: VerifiedIdentity, candidateTenantId: string | undefined, evaluationTime: "transaction" | "statement" = "transaction"): Promise<TenantContext> {
  if (!candidateTenantId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  if (identity.principalClass !== "HUMAN_INTERACTIVE") throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  if (!validateUuid(candidateTenantId)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "X-TCDX-Tenant-Id" });
  const now=evaluationTime==="statement"?sql`statement_timestamp()`:sql`CURRENT_TIMESTAMP`;
  const result = await sql<{ tenant_membership_id: string }>`
    SELECT tenant_membership_id
      FROM iam.tenant_memberships
     WHERE tenant_id=${candidateTenantId}::uuid
       AND user_identity_id=${identity.principalId}::uuid
       AND membership_state='active'
       AND (ended_at IS NULL OR ended_at > ${now})
  `.execute(database);
  const membershipId = result.rows[0]?.tenant_membership_id;
  if (!membershipId) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  return { tenantId: candidateTenantId, membershipId, identity };
}
