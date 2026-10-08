import { sql, type Kysely } from "kysely";
import { validate as validateUuid, version as uuidVersion } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { VerifiedIdentity } from "./authentication.js";
import { requirePlatformAccess, resolvePlatformActor } from "./platform-authority.js";
import { platformRoleFamilyCodes } from "./platform-role-family.js";
import type { PlatformRoleAssignmentProjection } from "./platform-role-service.js";

type ReadRow = Omit<PlatformRoleAssignmentProjection, "valid_from" | "valid_to"> & {
  role_name: string; valid_from: Date; valid_to: Date | null;
};

export async function platformRoleAssignmentList(database: Kysely<FoundationDatabase>, identity: VerifiedIdentity,
  target: string): Promise<{ items: (PlatformRoleAssignmentProjection & { role_name: string })[] }> {
  return database.transaction().setIsolationLevel("repeatable read").execute(async transaction => {
    await sql`SET TRANSACTION READ ONLY`.execute(transaction);
    requirePlatformAccess(await resolvePlatformActor(transaction, identity), "platform.role.administer");
    if (!validateUuid(target) || uuidVersion(target) !== 7) {
      throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
    }
    const targets = await sql`SELECT user_identity_id FROM iam.user_identities WHERE user_identity_id=${target}::uuid`.execute(transaction);
    if (!targets.rows.length) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
    const result = await sql<ReadRow>`SELECT pa.platform_role_assignment_id,pa.user_identity_id,r.role_code,r.name AS role_name,pa.valid_from,pa.valid_to
      FROM iam.platform_role_assignments pa JOIN iam.roles r ON r.role_id=pa.role_id
      WHERE pa.user_identity_id=${target}::uuid AND pa.ownership_class='PLATFORM_CONTROL'
        AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL
        AND r.role_code IN (${sql.join(platformRoleFamilyCodes)})
        AND pa.valid_from<=transaction_timestamp() AND (pa.valid_to IS NULL OR pa.valid_to>transaction_timestamp())
      ORDER BY r.role_code ASC,pa.platform_role_assignment_id ASC`.execute(transaction);
    if (new Set(result.rows.map(row => row.role_code)).size !== result.rows.length) {
      throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Conflicting active assignments", 409);
    }
    return { items: result.rows.map(row => ({
      platform_role_assignment_id: row.platform_role_assignment_id, user_identity_id: row.user_identity_id,
      role_code: row.role_code, role_name: row.role_name,
      valid_from: row.valid_from.toISOString(), valid_to: row.valid_to?.toISOString() ?? null
    })) };
  });
}
