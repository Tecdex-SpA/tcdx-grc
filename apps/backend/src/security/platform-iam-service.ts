import { createHash, randomBytes } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import type { CoreActor } from "../core-grc/model.js";
import { requireAccess } from "../core-grc/security.js";
import type { PlatformActor } from "./platform-authority.js";
import { recordPrivilegedUse, requirePlatformAccess } from "./platform-authority.js";
import { membershipRoleEtag } from "./membership-role-etag.js";

type Body = Record<string, unknown>;
type ScopeKind = "tenant" | "organizational_unit" | "process" | "service" | "audit_engagement" | "assigned_object" | "owned_object";

const scopeKinds = new Set<ScopeKind>(["tenant", "organizational_unit", "process", "service", "audit_engagement", "assigned_object", "owned_object"]);
const structuralScopes = {
  organizational_unit: { field: "organizational_unit_id", table: "org.organizational_units", id: "organizational_unit_id" },
  process: { field: "process_id", table: "org.processes", id: "process_id" },
  service: { field: "service_id", table: "org.services", id: "service_id" },
  audit_engagement: { field: "audit_id", table: "audit.audits", id: "audit_id" }
} as const;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value, Object.keys(value as object).sort())).digest("hex");
}

function closedBody(body: Body, allowed: readonly string[], required: readonly string[]): void {
  const unsupported = Object.keys(body).find((key) => !allowed.includes(key));
  if (unsupported) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported request field", 400, false, { field: unsupported });
  const missing = required.find((key) => body[key] === undefined);
  if (missing) throw new FoundationError("TCDX.VALIDATION.FAILED", "Missing required field", 400, false, { field: missing });
}

function text(body: Body, field: string, max = 4_096): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid field", 400, false, { field });
  return value.trim();
}

function uuid(body: Body, field: string): string {
  const value = text(body, field, 64);
  if (!validateUuid(value)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid identifier", 400, false, { field });
  return value;
}

function idempotencyKey(value: string | undefined): string {
  if (!value || value.length > 255) throw new FoundationError("TCDX.VALIDATION.FAILED", "Idempotency-Key is required", 400, false, { field: "Idempotency-Key" });
  return value;
}

function responseHash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

async function tenantProjection(transaction: Transaction<FoundationDatabase>, id: string) {
  const result = await sql<{ tenant_id: string; tenant_code: string; legal_name: string; display_name: string; default_timezone: string; lifecycle_state: string; data_classification: string }>`
    SELECT tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification
      FROM platform.tenants WHERE tenant_id=${id}::uuid
  `.execute(transaction);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  return row;
}

async function subscriptionProjection(transaction: Transaction<FoundationDatabase>, id: string) {
  const result = await sql<{
    subscription_id: string; tenant_id: string; plan_version_id: string; subscription_code: string;
    lifecycle_state: string; starts_at: Date; ends_at: Date | null; cancelled_at: Date | null;
  }>`
    SELECT subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at,ends_at,cancelled_at
      FROM platform.subscriptions
     WHERE subscription_id=${id}::uuid
  `.execute(transaction);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  return {
    ...row,
    starts_at: row.starts_at.toISOString(),
    ends_at: row.ends_at?.toISOString() ?? null,
    cancelled_at: row.cancelled_at?.toISOString() ?? null
  };
}

async function membershipProjection(transaction: Transaction<FoundationDatabase>, tenantId: string, id: string) {
  const result = await sql<{ tenant_membership_id: string; tenant_id: string; user_identity_id: string; membership_state: string; joined_at: Date }>`
    SELECT tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at
      FROM iam.tenant_memberships WHERE tenant_id=${tenantId}::uuid AND tenant_membership_id=${id}::uuid
  `.execute(transaction);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  return { ...row, joined_at: row.joined_at.toISOString() };
}

async function assignmentProjection(transaction: Transaction<FoundationDatabase>, tenantId: string, id: string) {
  const result = await sql<{
    membership_role_id: string; tenant_membership_id: string; role_id: string; scope_kind: ScopeKind;
    organizational_unit_id: string | null; process_id: string | null; service_id: string | null; audit_id: string | null;
    valid_from: Date; valid_to: Date | null;
  }>`
    SELECT membership_role_id,tenant_membership_id,role_id,scope_kind,organizational_unit_id,process_id,service_id,audit_id,valid_from,valid_to
      FROM iam.membership_roles WHERE tenant_id=${tenantId}::uuid AND membership_role_id=${id}::uuid
  `.execute(transaction);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  return { ...row, valid_from: row.valid_from.toISOString(), valid_to: row.valid_to?.toISOString() ?? null,
    etag: membershipRoleEtag(row) };
}

type InvitationProjection = {
  tenant_membership_invitation_id: string;
  tenant_id: string;
  invitee_email: string;
  authentication_method: string;
  lifecycle_state: string;
  expires_at: string;
  accepted_at: string | null;
  tenant_membership_id: string | null;
  revoked_at: string | null;
  row_version: number;
};

async function invitationProjection(transaction: Transaction<FoundationDatabase>, tenantId: string, id: string): Promise<InvitationProjection> {
  const result = await sql<{
    tenant_membership_invitation_id: string; tenant_id: string; invitee_email: string; authentication_method: string;
    lifecycle_state: string; expires_at: Date; accepted_at: Date | null; tenant_membership_id: string | null;
    revoked_at: Date | null; row_version: string;
  }>`
    SELECT tenant_membership_invitation_id,tenant_id,invitee_email,authentication_method,
           CASE WHEN lifecycle_state='pending' AND expires_at<=transaction_timestamp() THEN 'expired' ELSE lifecycle_state END AS lifecycle_state,
           expires_at,accepted_at,tenant_membership_id,revoked_at,row_version
      FROM iam.tenant_membership_invitations
     WHERE tenant_id=${tenantId}::uuid AND tenant_membership_invitation_id=${id}::uuid
  `.execute(transaction);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  return {
    ...row,
    expires_at: row.expires_at.toISOString(),
    accepted_at: row.accepted_at?.toISOString() ?? null,
    revoked_at: row.revoked_at?.toISOString() ?? null,
    row_version: Number(row.row_version)
  };
}

function normalizedInvitationEmail(body: Body): string {
  const value = text(body, "invitee_email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid field", 400, false, { field: "invitee_email" });
  }
  return value;
}

export async function membershipInvitationCreate(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  body: Body; key?: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.membership_invitation.create", actor.roles.includes("PLATFORM_ADMIN"));
  closedBody(input.body, ["tenant_id", "invitee_email", "authentication_method"], ["tenant_id", "invitee_email", "authentication_method"]);
  const tenantId = uuid(input.body, "tenant_id");
  const inviteeEmail = normalizedInvitationEmail(input.body);
  const authenticationMethod = text(input.body, "authentication_method", 32);
  if (authenticationMethod !== "ZOHO") {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported authentication method", 400, false, { field: "authentication_method" });
  }
  const key = idempotencyKey(input.key);
  const targetTenant = await sql<{ tenant_id: string }>`
    SELECT tenant_id FROM platform.tenants
     WHERE tenant_id=${tenantId}::uuid AND lifecycle_state='active'
     FOR SHARE
  `.execute(transaction);
  if (targetTenant.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const requestHash = hash({ tenant_id: tenantId, invitee_email: inviteeEmail, authentication_method: authenticationMethod });
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    operationCode: "membershipInvitationCreate", key, requestHash
  });
  if (claim.state === "replay") {
    const invitationId = claim.resultRef?.split(":")[1];
    if (!invitationId) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Idempotent result unavailable", 409, true);
    return { result: await invitationProjection(transaction, tenantId, invitationId), invitationToken: null, replayed: true };
  }

  const invitationId = newUuidV7();
  const invitationToken = randomBytes(32).toString("base64url");
  const tokenDigest = createHash("sha256").update(invitationToken, "ascii").digest("hex");
  await sql`
    INSERT INTO iam.tenant_membership_invitations
      (tenant_membership_invitation_id,tenant_id,invitee_email,authentication_method,token_digest,lifecycle_state,expires_at,
       created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${invitationId}::uuid,${tenantId}::uuid,${inviteeEmail},${authenticationMethod},${tokenDigest},'pending',
            transaction_timestamp()+interval '24 hours',${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)
  `.execute(transaction);
  const result = await invitationProjection(transaction, tenantId, invitationId);
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventCode: "audit.platform.membership_invitation.create.v1", aggregateType: "TenantMembershipInvitation", aggregateId: invitationId,
    commandCode: "membershipInvitationCreate", outcome: "success", classification: "confidential", after: {
      tenant_membership_invitation_id: invitationId,
      tenant_id: tenantId,
      authentication_method: authenticationMethod,
      lifecycle_state: "pending",
      expires_at: result.expires_at
    }
  });
  await recordPrivilegedUse(transaction, {
    actor, correlationId: input.correlationId, aggregateType: "TenantMembershipInvitation", aggregateId: invitationId,
    commandCode: "membershipInvitationCreate", outcome: "success"
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventType: "iam.membership_invitation.created.v1", aggregateType: "TenantMembershipInvitation", aggregateId: invitationId,
    classification: "confidential", payload: {
      tenant_membership_invitation_id: invitationId,
      authentication_method: authenticationMethod,
      lifecycle_state: "pending",
      expires_at: result.expires_at
    }
  });
  await completeIdempotency(transaction, {
    idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed",
    resultRef: `membership-invitation:${invitationId}`, responseHash: responseHash(result)
  });
  return { result, invitationToken, replayed: false };
}

export async function membershipInvitationRevoke(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  invitationId: string; body: Body; key?: string; correlationId: string; expectedVersion: number;
}) {
  requirePlatformAccess(actor, "platform.membership_invitation.update", actor.roles.includes("PLATFORM_ADMIN"));
  if (!validateUuid(input.invitationId)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid identifier", 400, false, { field: "invitation_id" });
  closedBody(input.body, ["reason"], []);
  const reason = input.body.reason === undefined ? null : text(input.body, "reason", 2_000);
  const key = idempotencyKey(input.key);
  const target = await sql<{ tenant_id: string }>`
    SELECT tenant_id FROM iam.tenant_membership_invitations
     WHERE tenant_membership_invitation_id=${input.invitationId}::uuid
  `.execute(transaction);
  const tenantId = target.rows[0]?.tenant_id;
  if (!tenantId || target.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const requestHash = hash({ tenant_id: tenantId, invitation_id: input.invitationId, expected_version: input.expectedVersion, reason });
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    operationCode: "membershipInvitationRevoke", key, requestHash
  });
  if (claim.state === "replay") return { result: await invitationProjection(transaction, tenantId, input.invitationId), replayed: true };

  const current = await sql<{ lifecycle_state: string; unexpired: boolean; row_version: string }>`
    SELECT lifecycle_state,(expires_at>transaction_timestamp()) AS unexpired,row_version
      FROM iam.tenant_membership_invitations
     WHERE tenant_id=${tenantId}::uuid AND tenant_membership_invitation_id=${input.invitationId}::uuid
     FOR UPDATE
  `.execute(transaction);
  const row = current.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (Number(row.row_version) !== input.expectedVersion) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Version conflict", 409, true);
  if (row.lifecycle_state !== "pending" || !row.unexpired) {
    throw new FoundationError("TCDX.LIFECYCLE.INVALID_TRANSITION", "Invalid lifecycle transition", 409);
  }
  await sql`
    UPDATE iam.tenant_membership_invitations
       SET lifecycle_state='revoked',revoked_at=transaction_timestamp(),revoked_by_user_identity_id=${actor.identity.principalId}::uuid,
           revoke_reason=${reason},updated_at=transaction_timestamp(),updated_by_user_identity_id=${actor.identity.principalId}::uuid,row_version=row_version+1
     WHERE tenant_id=${tenantId}::uuid AND tenant_membership_invitation_id=${input.invitationId}::uuid
       AND lifecycle_state='pending' AND row_version=${input.expectedVersion}
  `.execute(transaction);
  const result = await invitationProjection(transaction, tenantId, input.invitationId);
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventCode: "audit.platform.membership_invitation.revoke.v1", aggregateType: "TenantMembershipInvitation", aggregateId: input.invitationId,
    commandCode: "membershipInvitationRevoke", outcome: "success", classification: "confidential", after: {
      tenant_membership_invitation_id: input.invitationId,
      tenant_id: tenantId,
      authentication_method: result.authentication_method,
      lifecycle_state: "revoked",
      revoked_at: result.revoked_at,
      row_version: result.row_version
    }
  });
  await recordPrivilegedUse(transaction, {
    actor, correlationId: input.correlationId, aggregateType: "TenantMembershipInvitation", aggregateId: input.invitationId,
    commandCode: "membershipInvitationRevoke", outcome: "success"
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventType: "iam.membership_invitation.revoked.v1", aggregateType: "TenantMembershipInvitation", aggregateId: input.invitationId,
    classification: "confidential", payload: { tenant_membership_invitation_id: input.invitationId, lifecycle_state: "revoked" }
  });
  await completeIdempotency(transaction, {
    idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed",
    resultRef: `membership-invitation:${input.invitationId}`, responseHash: responseHash(result)
  });
  return { result, replayed: false };
}

export type TenantBootstrapResult = {
  tenantId: string;
  userIdentityId: string;
  tenantMembershipId: string;
  tenantAdminRoleId: string;
  membershipRoleId: string;
  baselineRoleCount: number;
  baselineGrantCount: number;
  replayed: boolean;
};

function bootstrapInvariant(message: string): FoundationError {
  return new FoundationError("TCDX.INVARIANT.VIOLATION", message, 422);
}

/**
 * Materializes SEED-010 for one canonical tenant and establishes its first
 * tenant administrator. This is an internal command, not a public API route.
 */
export async function tenantBootstrap(database: Kysely<FoundationDatabase>, actor: PlatformActor, input: {
  tenantId: string;
  userIdentityId: string;
  correlationId: string;
}): Promise<TenantBootstrapResult> {
  if (!validateUuid(input.tenantId) || !validateUuid(input.userIdentityId) || !validateUuid(input.correlationId)) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid identifier", 400);
  }
  requirePlatformAccess(actor, "platform.tenant.create");
  if (!actor.roles.includes("PLATFORM_ADMIN")) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }

  return database.transaction().setIsolationLevel("read committed").execute(async (transaction) => {
    const tenant = await sql<{ tenant_id: string }>`
      SELECT tenant_id
        FROM platform.tenants
       WHERE tenant_id=${input.tenantId}::uuid
         AND lifecycle_state='active'
       FOR UPDATE
    `.execute(transaction);
    if (tenant.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);

    const identity = await sql<{ user_identity_id: string }>`
      SELECT user_identity_id
        FROM iam.user_identities
       WHERE user_identity_id=${input.userIdentityId}::uuid
         AND lifecycle_state='active'
    `.execute(transaction);
    if (identity.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);

    const templates = await sql<{ role_id: string; role_code: string; name: string }>`
      SELECT role_id,role_code,name
        FROM iam.roles
       WHERE ownership_class='PLATFORM_CONTROL'
         AND tenant_id IS NULL
         AND is_baseline=TRUE
         AND lifecycle_state='published'
         AND role_code NOT IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT')
       ORDER BY role_code
    `.execute(transaction);
    if (templates.rows.length !== 22 || templates.rows.filter(({ role_code }) => role_code === "TENANT_ADMIN").length !== 1) {
      throw bootstrapInvariant("SEED-010 role catalog is inconsistent");
    }

    const templateCodes = templates.rows.map(({ role_code }) => role_code);
    const templateGrants = await sql<{ role_code: string; permission_id: string }>`
      SELECT r.role_code,rp.permission_id
        FROM iam.roles r
        JOIN iam.role_permissions rp
          ON rp.role_id=r.role_id
         AND rp.ownership_class='PLATFORM_CONTROL'
         AND rp.tenant_id IS NULL
       WHERE r.role_id = ANY(${templates.rows.map(({ role_id }) => role_id)}::uuid[])
       ORDER BY r.role_code,rp.permission_id
    `.execute(transaction);
    if (templateGrants.rows.length === 0) throw bootstrapInvariant("SEED-010 grant catalog is empty");

    const existingRoles = await sql<{ role_id: string; role_code: string; name: string; is_baseline: boolean; lifecycle_state: string }>`
      SELECT role_id,role_code,name,is_baseline,lifecycle_state
        FROM iam.roles
       WHERE ownership_class='TENANT_OWNED'
         AND tenant_id=${input.tenantId}::uuid
         AND role_code = ANY(${templateCodes}::text[])
       FOR UPDATE
    `.execute(transaction);
    const rolesByCode = new Map(existingRoles.rows.map((role) => [role.role_code, role]));
    for (const template of templates.rows) {
      const existing = rolesByCode.get(template.role_code);
      if (existing && (existing.name !== template.name || !existing.is_baseline || existing.lifecycle_state !== "published")) {
        throw bootstrapInvariant(`SEED-010 tenant role is inconsistent: ${template.role_code}`);
      }
    }

    let createdRoleCount = 0;
    for (const template of templates.rows) {
      if (rolesByCode.has(template.role_code)) continue;
      const roleId = newUuidV7();
      await sql`
        INSERT INTO iam.roles
          (role_id,created_by_user_identity_id,updated_by_user_identity_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
        VALUES (${roleId}::uuid,${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid,
                'TENANT_OWNED',${input.tenantId}::uuid,${template.role_code},${template.name},TRUE,'published')
      `.execute(transaction);
      rolesByCode.set(template.role_code, { role_id: roleId, role_code: template.role_code, name: template.name, is_baseline: true, lifecycle_state: "published" });
      createdRoleCount += 1;
    }

    const existingGrants = await sql<{ role_code: string; permission_id: string }>`
      SELECT r.role_code,rp.permission_id
        FROM iam.roles r
        JOIN iam.role_permissions rp
          ON rp.role_id=r.role_id
         AND rp.ownership_class='TENANT_OWNED'
         AND rp.tenant_id=r.tenant_id
       WHERE r.ownership_class='TENANT_OWNED'
         AND r.tenant_id=${input.tenantId}::uuid
         AND r.role_code = ANY(${templateCodes}::text[])
       FOR UPDATE OF rp
    `.execute(transaction);
    const expectedGrants = new Set(templateGrants.rows.map(({ role_code, permission_id }) => `${role_code}:${permission_id}`));
    const actualGrants = new Set(existingGrants.rows.map(({ role_code, permission_id }) => `${role_code}:${permission_id}`));
    if (existingGrants.rows.some(({ role_code, permission_id }) => !expectedGrants.has(`${role_code}:${permission_id}`))) {
      throw bootstrapInvariant("SEED-010 tenant role grants are inconsistent");
    }

    let createdGrantCount = 0;
    for (const grant of templateGrants.rows) {
      const key = `${grant.role_code}:${grant.permission_id}`;
      if (actualGrants.has(key)) continue;
      const role = rolesByCode.get(grant.role_code);
      if (!role) throw bootstrapInvariant(`SEED-010 role is missing: ${grant.role_code}`);
      await sql`
        INSERT INTO iam.role_permissions
          (role_permission_id,created_by_user_identity_id,ownership_class,tenant_id,role_id,permission_id)
        VALUES (${newUuidV7()}::uuid,${actor.identity.principalId}::uuid,'TENANT_OWNED',${input.tenantId}::uuid,
                ${role.role_id}::uuid,${grant.permission_id}::uuid)
      `.execute(transaction);
      actualGrants.add(key);
      createdGrantCount += 1;
    }

    const memberships = await sql<{
      tenant_membership_id: string;
      membership_state: string;
      temporally_active: boolean;
    }>`
      SELECT tenant_membership_id,membership_state,
             (ended_at IS NULL OR ended_at > transaction_timestamp()) AS temporally_active
        FROM iam.tenant_memberships
       WHERE tenant_id=${input.tenantId}::uuid
         AND user_identity_id=${input.userIdentityId}::uuid
       FOR UPDATE
    `.execute(transaction);
    if (memberships.rows.length > 1) throw bootstrapInvariant("Tenant membership catalog is ambiguous");
    if (memberships.rows[0] && (memberships.rows[0].membership_state !== "active" || !memberships.rows[0].temporally_active)) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    let createdMembership = false;
    const tenantMembershipId = memberships.rows[0]?.tenant_membership_id ?? newUuidV7();
    if (memberships.rows.length === 0) {
      await sql`
        INSERT INTO iam.tenant_memberships
          (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
        VALUES (${tenantMembershipId}::uuid,${input.tenantId}::uuid,${input.userIdentityId}::uuid,'active',transaction_timestamp(),
                ${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)
      `.execute(transaction);
      createdMembership = true;
    }

    const tenantAdmin = rolesByCode.get("TENANT_ADMIN");
    if (!tenantAdmin) throw bootstrapInvariant("SEED-010 TENANT_ADMIN role is missing");
    const assignments = await sql<{
      membership_role_id: string;
      scope_kind: string;
      structural_scope_empty: boolean;
      temporally_active: boolean;
    }>`
      SELECT membership_role_id,scope_kind,
             (organizational_unit_id IS NULL AND process_id IS NULL AND service_id IS NULL AND audit_id IS NULL) AS structural_scope_empty,
             (valid_from <= transaction_timestamp() AND (valid_to IS NULL OR valid_to > transaction_timestamp())) AS temporally_active
        FROM iam.membership_roles
       WHERE tenant_id=${input.tenantId}::uuid
         AND tenant_membership_id=${tenantMembershipId}::uuid
         AND role_id=${tenantAdmin.role_id}::uuid
       FOR UPDATE
    `.execute(transaction);
    if (assignments.rows.length > 1) throw bootstrapInvariant("TENANT_ADMIN assignment is ambiguous");
    if (assignments.rows[0] && (assignments.rows[0].scope_kind !== "tenant" || !assignments.rows[0].structural_scope_empty || !assignments.rows[0].temporally_active)) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    let createdAssignment = false;
    const membershipRoleId = assignments.rows[0]?.membership_role_id ?? newUuidV7();
    if (assignments.rows.length === 0) {
      await sql`
        INSERT INTO iam.membership_roles
          (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from,created_by_user_identity_id)
        VALUES (${membershipRoleId}::uuid,${input.tenantId}::uuid,${tenantMembershipId}::uuid,${tenantAdmin.role_id}::uuid,
                'tenant',transaction_timestamp(),${actor.identity.principalId}::uuid)
      `.execute(transaction);
      createdAssignment = true;
    }

    const replayed = createdRoleCount === 0 && createdGrantCount === 0 && !createdMembership && !createdAssignment;
    await persistAuditEvent(transaction, {
      auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
      eventCode: "audit.iam.application_token.privileged_use.v1", aggregateType: "Tenant", aggregateId: input.tenantId,
      commandCode: "TENANT_BOOTSTRAP", outcome: "success", classification: "restricted",
      after: {
        tenant_id: input.tenantId,
        user_identity_id: input.userIdentityId,
        tenant_membership_id: tenantMembershipId,
        tenant_admin_role_id: tenantAdmin.role_id,
        membership_role_id: membershipRoleId,
        baseline_role_count: rolesByCode.size,
        baseline_grant_count: actualGrants.size,
        replayed
      }
    });

    return {
      tenantId: input.tenantId,
      userIdentityId: input.userIdentityId,
      tenantMembershipId,
      tenantAdminRoleId: tenantAdmin.role_id,
      membershipRoleId,
      baselineRoleCount: rolesByCode.size,
      baselineGrantCount: actualGrants.size,
      replayed
    };
  });
}

export async function tenantCreate(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  body: Body; key?: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.tenant.create");
  closedBody(input.body, ["tenant_code", "legal_name", "display_name", "default_timezone"], ["tenant_code", "legal_name", "display_name", "default_timezone"]);
  const tenantCode = text(input.body, "tenant_code", 64);
  const legalName = text(input.body, "legal_name");
  const displayName = text(input.body, "display_name");
  const timezone = text(input.body, "default_timezone", 64);
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid IANA timezone", 400, false, { field: "default_timezone" });
  }
  const key = idempotencyKey(input.key);
  const requestHash = hash({ tenant_code: tenantCode, legal_name: legalName, display_name: displayName, default_timezone: timezone });
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    operationCode: "tenantCreate", key, requestHash
  });
  if (claim.state === "replay") return { result: await tenantProjection(transaction, claim.resultRef!.split(":")[1]!), replayed: true };
  const tenantId = newUuidV7();
  await sql`
    INSERT INTO platform.tenants
      (tenant_id,created_by_user_identity_id,updated_by_user_identity_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
    VALUES (${tenantId}::uuid,${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid,${tenantCode},${legalName},${displayName},${timezone},'active','confidential')
  `.execute(transaction);
  const result = await tenantProjection(transaction, tenantId);
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventCode: "audit.platform.tenant.create.v1", aggregateType: "Tenant", aggregateId: tenantId,
    commandCode: "tenantCreate", outcome: "success", classification: "confidential", after: result
  });
  await recordPrivilegedUse(transaction, { actor, correlationId: input.correlationId, aggregateType: "Tenant", aggregateId: tenantId, commandCode: "tenantCreate", outcome: "success" });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventType: "platform.tenant.provisioned.v1", aggregateType: "Tenant", aggregateId: tenantId,
    classification: "confidential", payload: { tenant_id: tenantId, lifecycle_state: "active" }
  });
  await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed", resultRef: `tenant:${tenantId}`, responseHash: responseHash(result) });
  return { result, replayed: false };
}

export async function subscriptionCreate(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
  body: Body; key?: string; correlationId: string;
}) {
  requirePlatformAccess(actor, "platform.subscription.create", actor.roles.includes("PLATFORM_ADMIN"));
  closedBody(input.body, ["tenant_id", "plan_version_id", "subscription_code"], ["tenant_id", "plan_version_id", "subscription_code"]);
  const tenantId = uuid(input.body, "tenant_id");
  const planVersionId = uuid(input.body, "plan_version_id");
  const subscriptionCode = text(input.body, "subscription_code", 96);
  const key = idempotencyKey(input.key);
  const requestHash = hash({ tenant_id: tenantId, plan_version_id: planVersionId, subscription_code: subscriptionCode });
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    operationCode: "subscriptionCreate", key, requestHash
  });
  if (claim.state === "replay") {
    const replayId = claim.resultRef?.split(":")[1];
    if (!replayId) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Idempotent result unavailable", 409, true);
    return { result: await subscriptionProjection(transaction, replayId), replayed: true };
  }

  const tenant = await sql<{ tenant_id: string }>`
    SELECT tenant_id
      FROM platform.tenants
     WHERE tenant_id=${tenantId}::uuid
       AND lifecycle_state='active'
     FOR UPDATE
  `.execute(transaction);
  if (tenant.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);

  const planVersion = await sql<{ plan_version_id: string; plan_state: string; version_state: string }>`
    SELECT pv.plan_version_id,p.lifecycle_state AS plan_state,pv.lifecycle_state AS version_state
      FROM platform.plan_versions pv
      JOIN platform.plans p ON p.plan_id=pv.plan_id
     WHERE pv.plan_version_id=${planVersionId}::uuid
     FOR SHARE OF p,pv
  `.execute(transaction);
  if (planVersion.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (planVersion.rows[0]?.plan_state !== "published" || planVersion.rows[0]?.version_state !== "published") {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "PlanVersion is not published", 422);
  }

  const active = await sql<{ subscription_id: string }>`
    SELECT subscription_id
      FROM platform.subscriptions
     WHERE tenant_id=${tenantId}::uuid
       AND lifecycle_state='active'
       AND starts_at <= transaction_timestamp()
       AND (ends_at IS NULL OR ends_at > transaction_timestamp())
       AND cancelled_at IS NULL
     FOR UPDATE
  `.execute(transaction);
  if (active.rows.length !== 0) {
    throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Tenant already has an active subscription", 409);
  }

  const subscriptionId = newUuidV7();
  await sql`
    INSERT INTO platform.subscriptions
      (subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at,
       created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${subscriptionId}::uuid,${tenantId}::uuid,${planVersionId}::uuid,${subscriptionCode},'active',transaction_timestamp(),
            ${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid)
  `.execute(transaction);
  const result = await subscriptionProjection(transaction, subscriptionId);
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventCode: "audit.platform.subscription.create.v1", aggregateType: "Subscription", aggregateId: subscriptionId,
    commandCode: "subscriptionCreate", outcome: "success", classification: "confidential", after: result
  });
  await recordPrivilegedUse(transaction, {
    actor, correlationId: input.correlationId, aggregateType: "Subscription", aggregateId: subscriptionId,
    commandCode: "subscriptionCreate", outcome: "success"
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
    actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
    eventType: "platform.subscription.created.v1", aggregateType: "Subscription", aggregateId: subscriptionId,
    classification: "confidential", payload: { subscription_id: subscriptionId, tenant_id: tenantId, plan_version_id: planVersionId, lifecycle_state: "active" }
  });
  await completeIdempotency(transaction, {
    idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed",
    resultRef: `subscription:${subscriptionId}`, responseHash: responseHash(result)
  });
  return { result, replayed: false };
}

export async function membershipCreate(transaction: Transaction<FoundationDatabase>, actor: CoreActor, input: {
  body: Body; key?: string; correlationId: string;
}) {
  requireAccess(actor, "platform.membership.create", "CORE_PLATFORM", ["tenant"]);
  closedBody(input.body, ["user_identity_id"], ["user_identity_id"]);
  const userIdentityId = uuid(input.body, "user_identity_id");
  const identity = await sql`SELECT 1 FROM iam.user_identities WHERE user_identity_id=${userIdentityId}::uuid AND lifecycle_state='active'`.execute(transaction);
  if (identity.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const key = idempotencyKey(input.key);
  const requestHash = hash({ tenant_id: actor.tenantId, user_identity_id: userIdentityId });
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId,
    actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    operationCode: "membershipCreate", key, requestHash
  });
  if (claim.state === "replay") return { result: await membershipProjection(transaction, actor.tenantId, claim.resultRef!.split(":")[1]!), replayed: true };
  const membershipId = newUuidV7();
  await sql`
    INSERT INTO iam.tenant_memberships
      (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
    VALUES (${membershipId}::uuid,${actor.tenantId}::uuid,${userIdentityId}::uuid,'active',transaction_timestamp(),${actor.userIdentityId}::uuid,${actor.userIdentityId}::uuid)
  `.execute(transaction);
  const result = await membershipProjection(transaction, actor.tenantId, membershipId);
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId,
    actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    eventCode: "audit.platform.membership.create.v1", aggregateType: "TenantMembership", aggregateId: membershipId,
    commandCode: "membershipCreate", outcome: "success", classification: "confidential", after: result
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId,
    actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    eventType: "iam.membership.created.v1", aggregateType: "TenantMembership", aggregateId: membershipId,
    classification: "confidential", payload: { tenant_membership_id: membershipId, membership_state: "active" }
  });
  await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed", resultRef: `membership:${membershipId}`, responseHash: responseHash(result) });
  return { result, replayed: false };
}

async function assertStructuralScope(transaction: Transaction<FoundationDatabase>, tenantId: string, scope: ScopeKind, body: Body): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = { organizational_unit_id: null, process_id: null, service_id: null, audit_id: null };
  const structural = structuralScopes[scope as keyof typeof structuralScopes];
  const structuralFields = Object.values(structuralScopes).map(({ field }) => field);
  if (!structural) {
    const supplied = structuralFields.find((field) => body[field] !== undefined);
    if (supplied) throw new FoundationError("TCDX.VALIDATION.FAILED", "Scope target is not allowed", 400, false, { field: supplied });
    return result;
  }
  const targetId = uuid(body, structural.field);
  const foreign = structuralFields.find((field) => field !== structural.field && body[field] !== undefined);
  if (foreign) throw new FoundationError("TCDX.VALIDATION.FAILED", "Scope target is not allowed", 400, false, { field: foreign });
  let exists;
  if (scope === "organizational_unit") exists = await sql`SELECT 1 FROM org.organizational_units WHERE tenant_id=${tenantId}::uuid AND organizational_unit_id=${targetId}::uuid`.execute(transaction);
  else if (scope === "process") exists = await sql`SELECT 1 FROM org.processes WHERE tenant_id=${tenantId}::uuid AND process_id=${targetId}::uuid`.execute(transaction);
  else if (scope === "service") exists = await sql`SELECT 1 FROM org.services WHERE tenant_id=${tenantId}::uuid AND service_id=${targetId}::uuid`.execute(transaction);
  else exists = await sql`SELECT 1 FROM audit.audits WHERE tenant_id=${tenantId}::uuid AND audit_id=${targetId}::uuid`.execute(transaction);
  if (exists.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  result[structural.field] = targetId;
  return result;
}

export async function membershipRoleAssign(transaction: Transaction<FoundationDatabase>, actor: CoreActor, input: {
  membershipId: string; body: Body; key?: string; correlationId: string;
}) {
  requireAccess(actor, "platform.role.assign", "CORE_PLATFORM", ["tenant"]);
  if (!validateUuid(input.membershipId)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid identifier", 400, false, { field: "membership_id" });
  closedBody(input.body, ["role_id", "scope_kind", "organizational_unit_id", "process_id", "service_id", "audit_id", "valid_to"], ["role_id", "scope_kind"]);
  const roleId = uuid(input.body, "role_id");
  const scope = text(input.body, "scope_kind", 32) as ScopeKind;
  if (!scopeKinds.has(scope)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid scope", 400, false, { field: "scope_kind" });
  const membership = await sql`
    SELECT 1 FROM iam.tenant_memberships
     WHERE tenant_id=${actor.tenantId}::uuid AND tenant_membership_id=${input.membershipId}::uuid
       AND membership_state='active' AND (ended_at IS NULL OR ended_at > transaction_timestamp())
  `.execute(transaction);
  if (membership.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const role = await sql`
    SELECT 1 FROM iam.roles
     WHERE role_id=${roleId}::uuid AND tenant_id=${actor.tenantId}::uuid
       AND ownership_class='TENANT_OWNED' AND lifecycle_state='published'
  `.execute(transaction);
  if (role.rows.length !== 1) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  const scopeIds = await assertStructuralScope(transaction, actor.tenantId, scope, input.body);
  const validToValue = input.body.valid_to;
  let validTo: Date | null = null;
  if (validToValue !== undefined) {
    if (typeof validToValue !== "string" || Number.isNaN(Date.parse(validToValue))) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid valid_to", 400, false, { field: "valid_to" });
    validTo = new Date(validToValue);
  }
  const key = idempotencyKey(input.key);
  const requestHash = hash({ tenant_id: actor.tenantId, membership_id: input.membershipId, role_id: roleId, scope_kind: scope, ...scopeIds, valid_to: validTo?.toISOString() ?? null });
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId,
    actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    operationCode: "membershipRoleAssign", key, requestHash
  });
  if (claim.state === "replay") return { result: await assignmentProjection(transaction, actor.tenantId, claim.resultRef!.split(":")[1]!), replayed: true };
  const assignmentId = newUuidV7();
  const inserted = await sql<{ valid_from: Date }>`
    INSERT INTO iam.membership_roles
      (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,organizational_unit_id,process_id,service_id,audit_id,valid_from,valid_to,created_by_user_identity_id)
    SELECT ${assignmentId}::uuid,${actor.tenantId}::uuid,${input.membershipId}::uuid,${roleId}::uuid,${scope},
           ${scopeIds.organizational_unit_id}::uuid,${scopeIds.process_id}::uuid,${scopeIds.service_id}::uuid,${scopeIds.audit_id}::uuid,
           transaction_timestamp(),${validTo}::timestamptz,${actor.userIdentityId}::uuid
     WHERE ${validTo}::timestamptz IS NULL OR ${validTo}::timestamptz > transaction_timestamp()
    RETURNING valid_from
  `.execute(transaction);
  if (inserted.rows.length !== 1) throw new FoundationError("TCDX.VALIDATION.FAILED", "valid_to must be later than valid_from", 400, false, { field: "valid_to" });
  const result = await assignmentProjection(transaction, actor.tenantId, assignmentId);
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId,
    actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    eventCode: "audit.platform.role.assign.v1", aggregateType: "MembershipRole", aggregateId: assignmentId,
    commandCode: "membershipRoleAssign", outcome: "success", classification: "confidential", after: result
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId,
    actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId,
    eventType: "iam.role.assigned.v1", aggregateType: "MembershipRole", aggregateId: assignmentId,
    classification: "confidential", payload: { membership_role_id: assignmentId, tenant_membership_id: input.membershipId, role_id: roleId, scope_kind: scope }
  });
  await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed", resultRef: `assignment:${assignmentId}`, responseHash: responseHash(result) });
  return { result, replayed: false };
}

export async function membershipRoleRevoke(transaction: Transaction<FoundationDatabase>, authority:
  | { kind: "tenant"; actor: CoreActor }
  | { kind: "platform"; actor: PlatformActor; tenantId: string }, input: {
    assignmentId: string; body: Body; expectedEtag: string; key?: string; correlationId: string;
  }) {
  const tenantId = authority.kind === "tenant" ? authority.actor.tenantId : authority.tenantId;
  const actorId = authority.kind === "tenant" ? authority.actor.userIdentityId : authority.actor.identity.principalId;
  if (authority.kind === "tenant") {
    if (!authority.actor.roles.includes("TENANT_ADMIN")) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    requireAccess(authority.actor, "platform.role.assign", "CORE_PLATFORM", ["tenant"]);
  } else requirePlatformAccess(authority.actor, "platform.role.assign", authority.actor.roles.includes("PLATFORM_ADMIN"));
  if (!validateUuid(tenantId) || !validateUuid(input.assignmentId)) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid identifier", 400);
  }
  closedBody(input.body, ["reason"], ["reason"]);
  const reason = text(input.body, "reason", 2_000);
  if (!/^[0-9a-f]{64}$/.test(input.expectedEtag)) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid If-Match", 400, false, { field: "If-Match" });
  }
  const key = idempotencyKey(input.key);
  const requestHash = hash({ tenant_id: tenantId, assignment_id: input.assignmentId, etag: input.expectedEtag, reason });
  const claim = await claimIdempotency(transaction, {
    idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actorId }, correlationId: input.correlationId,
    operationCode: "membershipRoleRevoke", key, requestHash
  });
  if (claim.state === "replay") {
    if (claim.resultRef !== `assignment:${input.assignmentId}`) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Idempotent result unavailable", 409, true);
    return { result: await assignmentProjection(transaction, tenantId, input.assignmentId), replayed: true };
  }
  const current = await sql<{
    membership_role_id: string; tenant_membership_id: string; role_id: string; valid_from: Date; valid_to: Date | null; active: boolean;
  }>`
    SELECT mr.membership_role_id,mr.tenant_membership_id,mr.role_id,mr.valid_from,mr.valid_to,
           (mr.valid_from < transaction_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to > transaction_timestamp())) AS active
      FROM iam.membership_roles mr
      JOIN iam.tenant_memberships m ON m.tenant_membership_id=mr.tenant_membership_id AND m.tenant_id=mr.tenant_id
      JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id AND r.ownership_class='TENANT_OWNED'
     WHERE mr.tenant_id=${tenantId}::uuid AND mr.membership_role_id=${input.assignmentId}::uuid
     FOR UPDATE OF mr
  `.execute(transaction);
  const row = current.rows[0];
  if (current.rows.length !== 1 || !row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (membershipRoleEtag(row) !== input.expectedEtag) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Version conflict", 409, true);
  if (!row.active) {
    throw new FoundationError("TCDX.LIFECYCLE.INVALID_TRANSITION", "Assignment is not active", 409);
  }
  const before = await assignmentProjection(transaction, tenantId, input.assignmentId);
  const changed = await sql<{ membership_role_id: string }>`
    UPDATE iam.membership_roles SET valid_to=transaction_timestamp()
     WHERE tenant_id=${tenantId}::uuid AND membership_role_id=${input.assignmentId}::uuid
       AND valid_from < transaction_timestamp() AND (valid_to IS NULL OR valid_to > transaction_timestamp())
    RETURNING membership_role_id
  `.execute(transaction);
  if (changed.rows.length !== 1) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Version conflict", 409, true);
  const result = await assignmentProjection(transaction, tenantId, input.assignmentId);
  await persistAuditEvent(transaction, {
    auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actorId }, correlationId: input.correlationId,
    eventCode: "audit.platform.role.revoke.v1", aggregateType: "MembershipRole", aggregateId: input.assignmentId,
    commandCode: "membershipRoleRevoke", outcome: "success", classification: "confidential", before,
    after: { ...result, reason }
  });
  if (authority.kind === "platform") await recordPrivilegedUse(transaction, {
    actor: authority.actor, correlationId: input.correlationId, aggregateType: "MembershipRole",
    aggregateId: input.assignmentId, commandCode: "membershipRoleRevoke", outcome: "success"
  });
  await persistOutboxEvent(transaction, {
    outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId,
    actor: { userIdentityId: actorId }, correlationId: input.correlationId,
    eventType: "iam.role.revoked.v1", aggregateType: "MembershipRole", aggregateId: input.assignmentId,
    classification: "confidential", payload: { membership_role_id: input.assignmentId,
      tenant_membership_id: row.tenant_membership_id, role_id: row.role_id, valid_to: result.valid_to }
  });
  await completeIdempotency(transaction, {
    idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed",
    resultRef: `assignment:${input.assignmentId}`, responseHash: responseHash(result)
  });
  return { result, replayed: false };
}
