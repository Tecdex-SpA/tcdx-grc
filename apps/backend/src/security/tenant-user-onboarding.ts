import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid, version as uuidVersion } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { newUuidV7 } from "../uuid.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import type { VerifiedIdentity } from "./authentication.js";
import { requirePlatformAccess, resolvePlatformActor, type PlatformActor } from "./platform-authority.js";
import { platformRoleFamily } from "./platform-role-family.js";

export const tenantUserOnboardingPermission = "platform.tenant_user.onboard";
const operation = "tenantUserOnboardingCreate";
export type TenantUserOnboardingProgress = {
  tenant_id: string; user_identity_id: string; membership_id: string;
  completed_roles: { role_code: string; membership_role_id: string }[]; pending_role_codes: string[];
};
type Input = { user_identity_id: string; tenant_role_codes: string[]; reason: string };
type Role = { role_id: string; role_code: string };
function fail(code: string, status: number, retryable = false): never {
  throw new FoundationError(code, "Company access could not be completed", status, retryable);
}
function invalid(): never { return fail("TCDX.VALIDATION.FAILED", 400); }
export function onboardingUuid(value: unknown): string {
  if (typeof value !== "string" || !validateUuid(value) || uuidVersion(value) !== 7) invalid();
  return value.toLowerCase();
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) invalid();
  return value.trim();
}
export function tenantUserOnboardingInput(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 3 || Object.keys(row).some(k => !["user_identity_id", "tenant_role_codes", "reason"].includes(k))
    || !Array.isArray(row.tenant_role_codes)) invalid();
  const codes = row.tenant_role_codes.map(code => text(code, 128));
  if (new Set(codes).size !== codes.length) invalid();
  return { user_identity_id: onboardingUuid(row.user_identity_id), tenant_role_codes: codes.sort(), reason: text(row.reason, 2000) };
}
function digest(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function parseProgress(value: string | null): TenantUserOnboardingProgress {
  try {
    const row = JSON.parse(value ?? "null") as TenantUserOnboardingProgress;
    if (Object.keys(row).sort().join() !== ["completed_roles", "membership_id", "pending_role_codes", "tenant_id", "user_identity_id"].join()
      || onboardingUuid(row.tenant_id) !== row.tenant_id || onboardingUuid(row.user_identity_id) !== row.user_identity_id
      || onboardingUuid(row.membership_id) !== row.membership_id || !Array.isArray(row.completed_roles) || !Array.isArray(row.pending_role_codes)
      || row.completed_roles.some(r => Object.keys(r).sort().join() !== "membership_role_id,role_code"
        || onboardingUuid(r.membership_role_id) !== r.membership_role_id || text(r.role_code,128) !== r.role_code)
      || row.pending_role_codes.some(code => text(code,128) !== code)) throw new Error("INVALID_RECEIPT");
    return row;
  } catch { return fail("TCDX.CONFLICT.IDEMPOTENCY", 409); }
}

export class TenantUserOnboarding {
  constructor(private readonly database: Kysely<FoundationDatabase>) {}

  async create(identity: VerifiedIdentity, targetTenant: unknown, tenantHeader: unknown, body: unknown,
    keyInput: unknown, correlationId: string, query: Record<string, unknown> = {}) {
    let progress: TenantUserOnboardingProgress | undefined;
    let authorized = false;
    try {
      await this.authorize(this.database, identity);
      authorized = true;
      if (tenantHeader !== undefined) fail("TCDX.AUTHORIZATION.DENIED",403);
      if (Object.keys(query).length) invalid();
      const tenantId = onboardingUuid(targetTenant), input = tenantUserOnboardingInput(body), key = text(keyInput,255);
      const requestHash = digest({ version: 1, operation, tenant_id: tenantId, ...input });
      const lock = BigInt.asIntN(64,BigInt(`0x${digest({ operation, actor: identity.principalId, key }).slice(0,16)}`)).toString();
      return await this.database.connection().execute(async connection => {
        const held = await sql<{ locked: boolean }>`SELECT pg_try_advisory_lock(${lock}::bigint) AS locked`.execute(connection);
        if (!held.rows[0]?.locked) fail("TCDX.CONFLICT.IDEMPOTENCY_IN_PROGRESS",409,true);
        try {
          const start = await connection.transaction().setIsolationLevel("read committed").execute(async tx => {
            const actor = await this.validate(tx,identity,tenantId,input);
            const claim = await claimIdempotency(tx, { idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
              actor: { userIdentityId: identity.principalId }, correlationId, operationCode: operation, key, requestHash, returnInProgress: true });
            if (claim.state !== "claimed") {
              const previous = parseProgress(claim.resultRef);
              this.assertReceipt(previous,tenantId,input);
              if (claim.state === "replay") {
                if (claim.resultStatusCode !== "completed" || previous.pending_role_codes.length || digest(previous) !== claim.responseHash) fail("TCDX.CONFLICT.IDEMPOTENCY",409);
                return { id: claim.idempotencyRecordId, progress: previous, replayed: true };
              }
              await this.reconcile(tx,previous);
              return { id: claim.idempotencyRecordId, progress: previous, replayed: false };
            }
            const memberships = await sql<{ tenant_membership_id: string; active: boolean }>`SELECT tenant_membership_id,
                (membership_state='active' AND joined_at<=statement_timestamp() AND (ended_at IS NULL OR ended_at>statement_timestamp())) AS active
              FROM iam.tenant_memberships WHERE tenant_id=${tenantId}::uuid AND user_identity_id=${input.user_identity_id}::uuid FOR UPDATE`.execute(tx);
            if (memberships.rows.length > 1) fail("TCDX.CONFLICT.RESOURCE",409);
            if (memberships.rows[0] && !memberships.rows[0].active) fail("TCDX.LIFECYCLE.TRANSITION_DENIED",409);
            const membershipId = memberships.rows[0]?.tenant_membership_id ?? newUuidV7();
            if (!memberships.rows.length) {
              await sql`INSERT INTO iam.tenant_memberships
                (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
                VALUES (${membershipId}::uuid,${tenantId}::uuid,${input.user_identity_id}::uuid,'active',statement_timestamp(),${identity.principalId}::uuid,${identity.principalId}::uuid)`.execute(tx);
              await this.childEvidence(tx,actor,tenantId,membershipId,"TenantMembership","audit.platform.membership.create.v1","iam.membership.created.v1",
                { tenant_membership_id: membershipId, user_identity_id: input.user_identity_id, membership_state: "active" },correlationId);
            }
            const result: TenantUserOnboardingProgress = { tenant_id: tenantId,user_identity_id: input.user_identity_id,membership_id: membershipId,
              completed_roles: [],pending_role_codes: input.tenant_role_codes };
            await this.checkpoint(tx,claim.idempotencyRecordId,requestHash,result);
            return { id: claim.idempotencyRecordId, progress: result, replayed: false };
          });
          progress = start.progress;
          if (start.replayed) return { result: progress, replayed: true };
          for (const code of [...progress.pending_role_codes]) {
            progress = await connection.transaction().setIsolationLevel("read committed").execute(async tx => {
              const actor = await this.validate(tx,identity,tenantId,input);
              const prior = await this.readCheckpoint(tx,start.id,requestHash);
              this.assertReceipt(prior,tenantId,input);
              await this.reconcile(tx,prior);
              if (!prior.pending_role_codes.includes(code)) fail("TCDX.CONFLICT.IDEMPOTENCY",409);
              const role = await this.role(tx,tenantId,code);
              const assignments = await sql<{ membership_role_id: string; active: boolean }>`SELECT membership_role_id,
                  valid_from<=statement_timestamp() AS active FROM iam.membership_roles
                WHERE tenant_id=${tenantId}::uuid AND tenant_membership_id=${prior.membership_id}::uuid AND role_id=${role.role_id}::uuid
                  AND scope_kind='tenant' AND (valid_to IS NULL OR valid_to>statement_timestamp()) FOR UPDATE`.execute(tx);
              if (assignments.rows.length > 1 || assignments.rows[0]?.active === false) fail("TCDX.CONFLICT.RESOURCE",409);
              const assignmentId = assignments.rows[0]?.membership_role_id ?? newUuidV7();
              if (!assignments.rows.length) {
                await sql`INSERT INTO iam.membership_roles
                  (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from,created_by_user_identity_id)
                  VALUES (${assignmentId}::uuid,${tenantId}::uuid,${prior.membership_id}::uuid,${role.role_id}::uuid,'tenant',statement_timestamp(),${identity.principalId}::uuid)`.execute(tx);
                await this.childEvidence(tx,actor,tenantId,assignmentId,"MembershipRole","audit.platform.role.assign.v1","iam.role.assigned.v1",
                  { membership_role_id: assignmentId,tenant_membership_id: prior.membership_id,role_id: role.role_id,role_code: code,scope_kind: "tenant" },correlationId);
              }
              const next = { ...prior,completed_roles: [...prior.completed_roles,{ role_code: code,membership_role_id: assignmentId }],
                pending_role_codes: prior.pending_role_codes.filter(value => value !== code) };
              await this.checkpoint(tx,start.id,requestHash,next);
              return next;
            });
          }
          const result = await connection.transaction().setIsolationLevel("read committed").execute(async tx => {
            const actor = await this.validate(tx,identity,tenantId,input);
            const current = await this.readCheckpoint(tx,start.id,requestHash);
            await this.reconcile(tx,current);
            if (current.pending_role_codes.length) fail("TCDX.CONFLICT.IDEMPOTENCY",409);
            await this.audit(tx,identity,"success",correlationId,current,input.reason);
            await persistAuditEvent(tx,{ auditEventId: newUuidV7(),ownershipClass: "PLATFORM_CONTROL",tenantId: null,
              actor: { userIdentityId: actor.identity.principalId },correlationId,eventCode: "audit.iam.application_token.privileged_use.v1",
              aggregateType: "TenantMembership",aggregateId: current.membership_id,commandCode: operation,outcome: "success",classification: "restricted",
              after: { tenant_id: tenantId,user_identity_id: input.user_identity_id } });
            await completeIdempotency(tx,{ idempotencyRecordId: start.id,requestHash,resultStatusCode: "completed",resultRef: JSON.stringify(current),responseHash: digest(current) });
            return current;
          });
          return { result,replayed: false };
        } finally { await sql`SELECT pg_advisory_unlock(${lock}::bigint)`.execute(connection); }
      });
    } catch (error) {
      const original = error instanceof FoundationError ? error : new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Company access unavailable",503,true);
      if (authorized || original.statusCode === 403) {
        try { await this.database.transaction().execute(tx => this.audit(tx,identity,original.statusCode===403 ? "denied" : "failure",correlationId,
          original.statusCode===403 ? undefined : progress)); }
        catch { throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE","Company access unavailable",503,true,
          progress ? { tenant_user_onboarding_progress: progress } : undefined); }
      }
      throw new FoundationError(original.code,original.message,original.statusCode,original.retryable,
        progress ? { tenant_user_onboarding_progress: progress } : undefined);
    }
  }

  private async authorize(db: Kysely<FoundationDatabase>,identity: VerifiedIdentity) {
    const actor = await resolvePlatformActor(db,identity,"statement");
    requirePlatformAccess(actor,tenantUserOnboardingPermission,actor.roles.includes("PLATFORM_ADMIN"));
    return actor;
  }
  private async validate(tx: Transaction<FoundationDatabase>,identity: VerifiedIdentity,tenantId: string,input: Input) {
    const tenant = await sql<{ lifecycle_state: string }>`SELECT lifecycle_state FROM platform.tenants WHERE tenant_id=${tenantId}::uuid FOR UPDATE`.execute(tx);
    const actor = await this.authorize(tx,identity);
    if (tenant.rows.length !== 1) fail("TCDX.RESOURCE.NOT_FOUND",404);
    if (tenant.rows[0]!.lifecycle_state !== "active") fail("TCDX.LIFECYCLE.TRANSITION_DENIED",409);
    if (identity.principalId === input.user_identity_id) fail("TCDX.AUTHORIZATION.DENIED",403);
    const target = await sql<{ lifecycle_state: string }>`SELECT lifecycle_state FROM iam.user_identities WHERE user_identity_id=${input.user_identity_id}::uuid FOR SHARE`.execute(tx);
    if (target.rows.length !== 1) fail("TCDX.RESOURCE.NOT_FOUND",404);
    if (target.rows[0]!.lifecycle_state !== "active") fail("TCDX.LIFECYCLE.TRANSITION_DENIED",409);
    const entitled = await sql`SELECT 1 FROM platform.subscriptions s
      JOIN platform.entitlements e ON e.plan_version_id=s.plan_version_id AND e.is_enabled
      JOIN platform.capabilities c ON c.capability_id=e.capability_id AND c.lifecycle_state='published'
      WHERE s.tenant_id=${tenantId}::uuid AND s.lifecycle_state='active' AND s.starts_at<=statement_timestamp()
        AND (s.ends_at IS NULL OR s.ends_at>statement_timestamp()) AND c.capability_group='CORE_PLATFORM'`.execute(tx);
    if (!entitled.rows.length) fail("TCDX.AUTHORIZATION.DENIED",403);
    for (const code of input.tenant_role_codes) await this.role(tx,tenantId,code);
    return actor;
  }
  private async role(tx: Transaction<FoundationDatabase>,tenantId: string,code: string): Promise<Role> {
    if (platformRoleFamily.has(code)) fail("TCDX.AUTHORIZATION.DENIED",403);
    const roles = await sql<Role>`SELECT role_id,role_code FROM iam.roles WHERE tenant_id=${tenantId}::uuid
      AND ownership_class='TENANT_OWNED' AND lifecycle_state='published' AND role_code=${code} FOR SHARE`.execute(tx);
    if (!roles.rows.length) fail("TCDX.RESOURCE.NOT_FOUND",404);
    if (roles.rows.length !== 1) fail("TCDX.CONFLICT.RESOURCE",409);
    return roles.rows[0]!;
  }
  private assertReceipt(progress: TenantUserOnboardingProgress,tenantId: string,input: Input) {
    const all = [...progress.completed_roles.map(r=>r.role_code),...progress.pending_role_codes].sort();
    if (progress.tenant_id!==tenantId || progress.user_identity_id!==input.user_identity_id || JSON.stringify(all)!==JSON.stringify(input.tenant_role_codes)) fail("TCDX.CONFLICT.IDEMPOTENCY",409);
  }
  private async reconcile(tx: Transaction<FoundationDatabase>,progress: TenantUserOnboardingProgress) {
    const member = await sql`SELECT 1 FROM iam.tenant_memberships WHERE tenant_membership_id=${progress.membership_id}::uuid
      AND tenant_id=${progress.tenant_id}::uuid AND user_identity_id=${progress.user_identity_id}::uuid
      AND membership_state='active' AND joined_at<=statement_timestamp() AND (ended_at IS NULL OR ended_at>statement_timestamp()) FOR UPDATE`.execute(tx);
    if (member.rows.length!==1) fail("TCDX.CONFLICT.RESOURCE",409);
    for (const role of progress.completed_roles) {
      const assignment = await sql`SELECT 1 FROM iam.membership_roles mr JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id
        WHERE mr.membership_role_id=${role.membership_role_id}::uuid AND mr.tenant_id=${progress.tenant_id}::uuid
          AND mr.tenant_membership_id=${progress.membership_id}::uuid AND mr.scope_kind='tenant' AND r.role_code=${role.role_code}
          AND r.ownership_class='TENANT_OWNED' AND r.lifecycle_state='published' AND mr.valid_from<=statement_timestamp()
          AND (mr.valid_to IS NULL OR mr.valid_to>statement_timestamp()) FOR SHARE OF mr,r`.execute(tx);
      if (assignment.rows.length!==1) fail("TCDX.CONFLICT.RESOURCE",409);
    }
  }
  private async readCheckpoint(tx: Transaction<FoundationDatabase>,id: string,hash: string) {
    const rows = await sql<{ result_ref: string }>`SELECT result_ref FROM ops_audit.idempotency_records
      WHERE idempotency_record_id=${id}::uuid AND request_hash=${hash} AND result_status_code='in_progress' FOR UPDATE`.execute(tx);
    if (rows.rows.length!==1) fail("TCDX.CONFLICT.IDEMPOTENCY",409);
    return parseProgress(rows.rows[0]!.result_ref);
  }
  private async checkpoint(tx: Transaction<FoundationDatabase>,id: string,hash: string,progress: TenantUserOnboardingProgress) {
    const changed = await sql`UPDATE ops_audit.idempotency_records SET result_ref=${JSON.stringify(progress)}
      WHERE idempotency_record_id=${id}::uuid AND request_hash=${hash} AND result_status_code='in_progress'`.execute(tx);
    if (Number(changed.numAffectedRows)!==1) fail("TCDX.CONFLICT.IDEMPOTENCY",409);
  }
  private async childEvidence(tx: Transaction<FoundationDatabase>,actor: PlatformActor,tenantId: string,id: string,aggregate: string,
    event: string,outbox: string,result: Record<string,unknown>,correlationId: string) {
    await persistAuditEvent(tx,{ auditEventId: newUuidV7(),ownershipClass: "TENANT_OWNED",tenantId,
      actor: { userIdentityId: actor.identity.principalId },correlationId,eventCode: event,aggregateType: aggregate,aggregateId: id,
      commandCode: operation,outcome: "success",classification: "confidential",after: result });
    await persistOutboxEvent(tx,{ outboxEventId: newUuidV7(),eventId: newUuidV7(),ownershipClass: "TENANT_OWNED",tenantId,
      actor: { userIdentityId: actor.identity.principalId },correlationId,eventType: outbox,aggregateType: aggregate,aggregateId: id,
      classification: "confidential",payload: result });
  }
  private async audit(tx: Transaction<FoundationDatabase>,identity: VerifiedIdentity,outcome: string,correlationId: string,
    progress?: TenantUserOnboardingProgress,reason?: string) {
    await persistAuditEvent(tx,{ auditEventId: newUuidV7(),ownershipClass: "PLATFORM_CONTROL",tenantId: null,
      actor: { userIdentityId: identity.principalId },correlationId,eventCode: "audit.platform.tenant_user.onboard.v1",
      aggregateType: progress ? "TenantMembership" : "UserIdentity",aggregateId: progress?.membership_id ?? identity.principalId,
      commandCode: operation,outcome,classification: "restricted",after: { authority_context: "platform",...(progress ?? {}),...(reason ? {reason} : {}) } });
  }
}
