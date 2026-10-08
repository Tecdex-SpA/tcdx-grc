import { sql, type Kysely, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { persistAuditEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import type { VerifiedIdentity } from "./authentication.js";

export type PlatformActor = {
  identity: VerifiedIdentity;
  permissions: ReadonlySet<string>;
  roles: readonly string[];
};

function deny(): never {
  throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
}

export async function resolvePlatformActor(database: Kysely<FoundationDatabase>, identity: VerifiedIdentity,
  evaluationTime: "transaction" | "statement" = "transaction"): Promise<PlatformActor> {
  const now = evaluationTime === "statement" ? sql`statement_timestamp()` : sql`transaction_timestamp()`;
  if (identity.principalClass !== "HUMAN_INTERACTIVE") deny();
  const identityState = await sql<{ lifecycle_state: string }>`
    SELECT lifecycle_state FROM iam.user_identities WHERE user_identity_id=${identity.principalId}::uuid
  `.execute(database);
  if (identityState.rows[0]?.lifecycle_state !== "active") deny();
  const access = await sql<{ permission_code: string; role_code: string }>`
    SELECT DISTINCT p.permission_code,r.role_code
      FROM iam.platform_role_assignments pa
      JOIN iam.roles r ON r.role_id=pa.role_id
        AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.lifecycle_state='published'
      JOIN iam.role_permissions rp ON rp.role_id=r.role_id
        AND rp.ownership_class='PLATFORM_CONTROL' AND rp.tenant_id IS NULL
      JOIN iam.permissions p ON p.permission_id=rp.permission_id AND p.lifecycle_state='published'
     WHERE pa.user_identity_id=${identity.principalId}::uuid
       AND pa.ownership_class='PLATFORM_CONTROL'
       AND pa.valid_from <= ${now}
       AND (pa.valid_to IS NULL OR pa.valid_to > ${now})
  `.execute(database);
  return {
    identity,
    permissions: new Set(access.rows.map((row) => row.permission_code)),
    roles: [...new Set(access.rows.map((row) => row.role_code))].sort()
  };
}

export function requirePlatformAccess(actor: PlatformActor, permission: string, objectAccessible = true, sodAllowed = true): void {
  if (!actor.permissions.has(permission) || !objectAccessible || !sodAllowed) deny();
}

export async function bootstrapFirstPlatformAdmin(database: Kysely<FoundationDatabase>, input: {
  identity: VerifiedIdentity;
  correlationId: string;
  justification: string;
}): Promise<{ platformRoleAssignmentId: string; userIdentityId: string; roleId: string; validFrom: string }> {
  if (Object.keys(input).some((key) => !["identity", "correlationId", "justification"].includes(key))) deny();
  if (Object.keys(input.identity).some((key) => !["principalClass", "principalId", "tokenId", "expiresAt"].includes(key))) deny();
  const justification = input.justification.trim();
  if (input.identity.principalClass !== "HUMAN_INTERACTIVE" || !justification || justification.length > 2_000) deny();
  return database.transaction().setIsolationLevel("read committed").execute(async (transaction) => {
    const roles = await sql<{ role_id: string }>`
      SELECT role_id
        FROM iam.roles
       WHERE role_code='PLATFORM_ADMIN'
         AND ownership_class='PLATFORM_CONTROL'
         AND tenant_id IS NULL
         AND is_baseline=TRUE
         AND lifecycle_state='published'
       FOR UPDATE
    `.execute(transaction);
    if (roles.rows.length !== 1) deny();
    const roleId = roles.rows[0]!.role_id;
    const identity = await sql<{ user_identity_id: string }>`
      SELECT user_identity_id
        FROM iam.user_identities
       WHERE user_identity_id=${input.identity.principalId}::uuid
         AND lifecycle_state='active'
    `.execute(transaction);
    if (identity.rows.length !== 1) deny();
    const assignments = await sql<{ historical: number; active: number }>`
      SELECT count(*)::integer AS historical,
             count(*) FILTER (WHERE valid_from <= transaction_timestamp() AND (valid_to IS NULL OR valid_to > transaction_timestamp()))::integer AS active
        FROM iam.platform_role_assignments
    `.execute(transaction);
    if (assignments.rows[0]?.historical !== 0 || assignments.rows[0]?.active !== 0) deny();
    const platformRoleAssignmentId = newUuidV7();
    const inserted = await sql<{ valid_from: Date }>`
      INSERT INTO iam.platform_role_assignments
        (platform_role_assignment_id,created_by_user_identity_id,ownership_class,user_identity_id,role_id,valid_from)
      VALUES (${platformRoleAssignmentId}::uuid,${input.identity.principalId}::uuid,'PLATFORM_CONTROL',${input.identity.principalId}::uuid,${roleId}::uuid,transaction_timestamp())
      RETURNING valid_from
    `.execute(transaction);
    const validFrom = inserted.rows[0]?.valid_from;
    if (!validFrom) deny();
    await persistAuditEvent(transaction, {
      auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      actor: { userIdentityId: input.identity.principalId }, correlationId: input.correlationId,
      eventCode: "audit.iam.platform_role_assignment.bootstrap.v1", aggregateType: "PlatformRoleAssignment",
      aggregateId: platformRoleAssignmentId, commandCode: "FIRST_PLATFORM_ADMIN_BOOTSTRAP", outcome: "success", classification: "restricted",
      after: {
        user_identity_id: input.identity.principalId,
        role_id: roleId,
        valid_from: validFrom.toISOString(),
        justification
      }
    });
    return { platformRoleAssignmentId, userIdentityId: input.identity.principalId, roleId, validFrom: validFrom.toISOString() };
  });
}

export async function recordPrivilegedUse(transaction: Transaction<FoundationDatabase>, input: {
  actor: PlatformActor;
  correlationId: string;
  aggregateType: string;
  aggregateId: string;
  commandCode: string;
  outcome: "success" | "denied";
}): Promise<void> {
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: input.actor.identity.principalId }, correlationId: input.correlationId,
    eventCode: "audit.iam.application_token.privileged_use.v1", aggregateType: input.aggregateType,
    aggregateId: input.aggregateId, commandCode: input.commandCode, outcome: input.outcome, classification: "restricted",
    after: { roles: input.actor.roles }
  });
}
