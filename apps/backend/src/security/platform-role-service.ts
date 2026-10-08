import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { validate as validateUuid, version as uuidVersion } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent } from "../persistence/foundation-records.js";
import { platformRoleFamily } from "./platform-role-family.js";
import { newUuidV7 } from "../uuid.js";
import { recordPrivilegedUse, requirePlatformAccess, resolvePlatformActor, type PlatformActor } from "./platform-authority.js";

export type PlatformRoleAssignmentProjection = {
  platform_role_assignment_id: string;
  user_identity_id: string;
  role_code: string;
  valid_from: string;
  valid_to: string | null;
};
type Operation = "platformRoleAssign" | "platformRoleRevoke";
type AssignmentRow = {
  platform_role_assignment_id: string; user_identity_id: string; role_id: string;
  role_code: string; valid_from: Date; valid_to: Date | null;
};
const permission = "platform.role.administer";
function fail(code: string, status: number): never { throw new FoundationError(code, "Platform role command rejected", status); }
function invalid(): never { return fail("TCDX.VALIDATION.FAILED", 400); }
function uuid(input: unknown): string {
  if (typeof input !== "string" || !validateUuid(input) || uuidVersion(input) !== 7) invalid();
  return input.toLowerCase();
}
function text(input: unknown, max: number): string {
  if (typeof input !== "string" || !input.trim() || input.length > max) invalid();
  return input.trim();
}
function body(input: unknown, operation: Operation): { reason: string; role_code?: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  const record = input as Record<string, unknown>;
  const allowed = operation === "platformRoleAssign" ? ["reason", "role_code"] : ["reason"];
  if (Object.keys(record).some(key => !allowed.includes(key))) invalid();
  return { reason: text(record.reason, 2000), ...(operation === "platformRoleAssign" ? { role_code: text(record.role_code, 128) } : {}) };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
function digest(value: unknown): string { return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex"); }
function project(row: AssignmentRow): PlatformRoleAssignmentProjection {
  return { platform_role_assignment_id: row.platform_role_assignment_id, user_identity_id: row.user_identity_id,
    role_code: row.role_code, valid_from: row.valid_from.toISOString(), valid_to: row.valid_to?.toISOString() ?? null };
}

export class PlatformRoleService {
  constructor(private readonly database: Kysely<FoundationDatabase>) {}

  assign(actor: PlatformActor, userIdentityId: string, input: unknown, key: string, correlationId: string) {
    return this.mutate("platformRoleAssign", actor, userIdentityId, undefined, input, key, correlationId);
  }
  revoke(actor: PlatformActor, userIdentityId: string, assignmentId: string, input: unknown, key: string, correlationId: string) {
    return this.mutate("platformRoleRevoke", actor, userIdentityId, assignmentId, input, key, correlationId);
  }

  private async mutate(operation: Operation, actor: PlatformActor, target: string, assignmentId: string | undefined,
    input: unknown, idempotencyKey: string, correlationId: string): Promise<{ assignment: PlatformRoleAssignmentProjection; replayed: boolean }> {
    if (actor.identity.principalClass !== "HUMAN_INTERACTIVE") fail("TCDX.AUTHORIZATION.DENIED", 403);
    requirePlatformAccess(actor, permission);
    const targetId = uuid(target);
    const id = assignmentId === undefined ? undefined : uuid(assignmentId);
    const request = body(input, operation);
    const key = text(idempotencyKey, 255);
    const canonicalRequest = canonical({ user_identity_id: targetId, ...(id ? { platform_role_assignment_id: id } : {}), ...request });
    const requestHash = createHash("sha256").update(`v1\0${operation}\0${JSON.stringify(canonicalRequest)}`).digest("hex");

    return this.database.transaction().setIsolationLevel("read committed").execute(async transaction => {
      // Shared canonical catalog lock serializes grant/revoke decisions, never calls bootstrap.
      const adminRoles = await sql<{ role_id: string }>`SELECT role_id FROM iam.roles
        WHERE role_code='PLATFORM_ADMIN' AND is_baseline AND ownership_class='PLATFORM_CONTROL'
          AND tenant_id IS NULL AND lifecycle_state='published' FOR UPDATE`.execute(transaction);
      if (adminRoles.rows.length !== 1) fail("TCDX.CONFLICT.RESOURCE", 409);
      const currentActor = await resolvePlatformActor(transaction, actor.identity, "statement");
      requirePlatformAccess(currentActor, permission);
      const claim = await claimIdempotency(transaction, {
        idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
        actor: { userIdentityId: actor.identity.principalId }, correlationId, operationCode: operation,
        key, requestHash, returnInProgress: true
      });
      if (claim.state === "in_progress") throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Operation in progress", 409, true);
      if (claim.state === "replay") {
        if (claim.resultStatusCode !== "completed" || !claim.resultRef) fail("TCDX.CONFLICT.IDEMPOTENCY", 409);
        const assignment = JSON.parse(claim.resultRef) as PlatformRoleAssignmentProjection;
        if (digest(assignment) !== claim.responseHash) fail("TCDX.CONFLICT.IDEMPOTENCY", 409);
        return { assignment, replayed: true };
      }
      const targets = await sql<{ lifecycle_state: string }>`SELECT lifecycle_state FROM iam.user_identities
        WHERE user_identity_id=${targetId}::uuid FOR UPDATE`.execute(transaction);
      if (!targets.rows.length) fail("TCDX.RESOURCE.NOT_FOUND", 404);
      if (targets.rows[0]!.lifecycle_state !== "active") fail("TCDX.LIFECYCLE.TRANSITION_DENIED", 409);
      let before: PlatformRoleAssignmentProjection | undefined;
      let row: AssignmentRow;
      if (operation === "platformRoleAssign") {
        const roles = await sql<{ role_id: string; lifecycle_state: string; is_baseline: boolean }>`SELECT role_id,lifecycle_state,is_baseline
          FROM iam.roles WHERE role_code=${request.role_code!} AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL FOR UPDATE`.execute(transaction);
        if (!roles.rows.length) fail("TCDX.RESOURCE.NOT_FOUND", 404);
        if (!platformRoleFamily.has(request.role_code!)) fail("TCDX.AUTHORIZATION.DENIED", 403);
        if (roles.rows.length !== 1) fail("TCDX.CONFLICT.RESOURCE", 409);
        const role = roles.rows[0]!;
        if (!role.is_baseline || role.lifecycle_state !== "published") fail("TCDX.LIFECYCLE.TRANSITION_DENIED", 409);
        const overlap = await sql`SELECT platform_role_assignment_id FROM iam.platform_role_assignments
          WHERE user_identity_id=${targetId}::uuid AND role_id=${role.role_id}::uuid
            AND (valid_to IS NULL OR valid_to > statement_timestamp())`.execute(transaction);
        if (overlap.rows.length) fail("TCDX.CONFLICT.RESOURCE", 409);
        const inserted = await sql<AssignmentRow>`INSERT INTO iam.platform_role_assignments
          (platform_role_assignment_id,created_by_user_identity_id,ownership_class,user_identity_id,role_id,valid_from)
          VALUES (${newUuidV7()}::uuid,${actor.identity.principalId}::uuid,'PLATFORM_CONTROL',${targetId}::uuid,${role.role_id}::uuid,statement_timestamp())
          RETURNING *,${request.role_code!}::text AS role_code`.execute(transaction);
        row = inserted.rows[0]!;
      } else {
        const assignments = await sql<AssignmentRow & { role_state: string; is_baseline: boolean; active: boolean }>`SELECT pa.*,r.role_code,r.lifecycle_state AS role_state,r.is_baseline,
            (pa.valid_from <= statement_timestamp() AND (pa.valid_to IS NULL OR pa.valid_to > statement_timestamp())) AS active
          FROM iam.platform_role_assignments pa JOIN iam.roles r USING(role_id)
          WHERE pa.platform_role_assignment_id=${id!}::uuid AND pa.user_identity_id=${targetId}::uuid
            AND pa.ownership_class='PLATFORM_CONTROL' AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL FOR UPDATE OF pa,r`.execute(transaction);
        if (!assignments.rows.length) fail("TCDX.RESOURCE.NOT_FOUND", 404);
        const assignment = assignments.rows[0]!;
        if (!platformRoleFamily.has(assignment.role_code)) fail("TCDX.AUTHORIZATION.DENIED", 403);
        if (!assignment.active || !assignment.is_baseline || assignment.role_state !== "published") fail("TCDX.LIFECYCLE.TRANSITION_DENIED", 409);
        if (assignment.role_code === "PLATFORM_ADMIN") {
          const remaining = await sql<{ count: number }>`SELECT count(DISTINCT pa.user_identity_id)::integer AS count
            FROM iam.platform_role_assignments pa JOIN iam.user_identities u USING(user_identity_id)
            WHERE pa.role_id=${adminRoles.rows[0]!.role_id}::uuid AND pa.ownership_class='PLATFORM_CONTROL'
              AND pa.platform_role_assignment_id<>${id!}::uuid AND u.lifecycle_state='active'
              AND pa.valid_from<=statement_timestamp() AND (pa.valid_to IS NULL OR pa.valid_to>statement_timestamp())`.execute(transaction);
          if (!remaining.rows[0]?.count) fail("TCDX.CONFLICT.RESOURCE", 409);
        }
        before = project(assignment);
        const closed = await sql<AssignmentRow>`UPDATE iam.platform_role_assignments SET valid_to=statement_timestamp()
          WHERE platform_role_assignment_id=${id!}::uuid RETURNING *,${assignment.role_code}::text AS role_code`.execute(transaction);
        row = closed.rows[0]!;
      }
      const assignment = project(row);
      await persistAuditEvent(transaction, {
        auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
        actor: { userIdentityId: actor.identity.principalId }, correlationId,
        eventCode: operation === "platformRoleAssign" ? "audit.iam.platform_role_assignment.assign.v1" : "audit.iam.platform_role_assignment.revoke.v1",
        aggregateType: "PlatformRoleAssignment", aggregateId: row.platform_role_assignment_id,
        commandCode: operation, outcome: "success", classification: "restricted",
        ...(before ? { before } : {}), after: { ...assignment, reason: request.reason }
      });
      await recordPrivilegedUse(transaction, { actor: currentActor, correlationId, aggregateType: "PlatformRoleAssignment",
        aggregateId: row.platform_role_assignment_id, commandCode: operation, outcome: "success" });
      await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash,
        resultStatusCode: "completed", resultRef: JSON.stringify(assignment), responseHash: digest(assignment) });
      return { assignment, replayed: false };
    });
  }
}
