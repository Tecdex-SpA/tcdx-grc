import { createHash } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid, version as uuidVersion } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { newUuidV7 } from "../uuid.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent } from "../persistence/foundation-records.js";
import type { VerifiedIdentity } from "./authentication.js";
import { requirePlatformAccess, resolvePlatformActor, type PlatformActor } from "./platform-authority.js";
import { tenantBootstrapInTransaction, tenantCreate } from "./platform-iam-service.js";
import type { IdentityDiscoveryMetadataPort } from "./user-identity-discovery.js";

const OPERATION = "tenantInitialOnboardingCreate";
type Progress = { tenant_id: string; user_identity_id: string; membership_id?: string; initial_assignment_id?: string;
  completed_steps: string[]; pending_steps: string[] };
type Receipt = { version: 1; progress: Progress };

function invalid(): never { throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid initial onboarding request", 400); }
function conflict(): never { throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Initial onboarding result unavailable", 409, true); }
function closed(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== fields.length || Object.keys(row).some((key) => !fields.includes(key))) invalid();
  return row;
}
export function initialOnboardingInput(body: unknown) {
  const row = closed(body, ["tenant", "initial_administrator"]);
  const selection = closed(row.initial_administrator, ["kind", "user_identity_id"]);
  if (selection.kind !== "existing_identity" && selection.kind !== "provisioned_managed_identity") invalid();
  if (typeof selection.user_identity_id !== "string" || !validateUuid(selection.user_identity_id) || uuidVersion(selection.user_identity_id) !== 7) invalid();
  const tenant = closed(row.tenant, ["tenant_code", "legal_name", "display_name", "default_timezone"]);
  // TenantCreate remains the owner of its validations and canonical normalization.
  return { tenant, initial_administrator: { kind: selection.kind, user_identity_id: selection.user_identity_id } };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex"); }
function receipt(value: string | null): Receipt {
  try {
    const parsed = JSON.parse(value ?? "null") as Receipt;
    if (parsed.version !== 1 || !validateUuid(parsed.progress.tenant_id) || !validateUuid(parsed.progress.user_identity_id)
      || Object.keys(parsed).some((key) => !["version", "progress"].includes(key))
      || Object.keys(parsed.progress).some((key) => !["tenant_id", "user_identity_id", "membership_id", "initial_assignment_id", "completed_steps", "pending_steps"].includes(key))
      || !Array.isArray(parsed.progress.completed_steps) || !Array.isArray(parsed.progress.pending_steps)) conflict();
    const pending = JSON.stringify(parsed.progress.completed_steps) === '["tenant_create"]'
      && JSON.stringify(parsed.progress.pending_steps) === '["tenant_bootstrap"]'
      && parsed.progress.membership_id === undefined && parsed.progress.initial_assignment_id === undefined;
    const completed = JSON.stringify(parsed.progress.completed_steps) === '["tenant_create","tenant_bootstrap"]'
      && parsed.progress.pending_steps.length === 0 && typeof parsed.progress.membership_id === "string"
      && validateUuid(parsed.progress.membership_id) && typeof parsed.progress.initial_assignment_id === "string" && validateUuid(parsed.progress.initial_assignment_id);
    if (!pending && !completed) conflict();
    return parsed;
  } catch { conflict(); }
}

export class TenantInitialOnboarding {
  constructor(private readonly database: Kysely<FoundationDatabase>, private readonly metadata?: IdentityDiscoveryMetadataPort) {}

  async create(identity: VerifiedIdentity, tenantHeader: unknown, body: unknown, key: unknown, correlationId: string,
    query: Record<string, unknown> = {}) {
    let progress: Progress | undefined;
    let authorizedActor: PlatformActor | undefined;
    try {
      if (tenantHeader !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
      authorizedActor = await this.authorize(this.database, identity);
      if (Object.keys(query).length) invalid();
      const input = initialOnboardingInput(body);
      if (typeof key !== "string" || !key.trim() || key.length > 255) invalid();
      const requestHash = hash({ version: 1, operation: OPERATION, input });
      const lock = createHash("sha256").update(`${OPERATION}\0${identity.principalId}\0${key}`).digest().readBigInt64BE(0).toString();
      return await this.database.connection().execute(async (connection) => {
        // Session claim lock spans the two truthful step transactions on this pinned connection.
        const acquired = await sql<{ acquired: boolean }>`SELECT pg_try_advisory_lock(${lock}::bigint) AS acquired`.execute(connection);
        if (!acquired.rows[0]?.acquired) conflict();
        try {
          const checkpoint = await connection.transaction().setIsolationLevel("read committed").execute(async (tx) => {
            const actor = await this.authorize(tx, identity);
            const claim = await claimIdempotency(tx, {
              idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
              actor: { userIdentityId: identity.principalId }, correlationId, operationCode: OPERATION, key,
              requestHash, returnInProgress: true
            });
            if (claim.state === "claimed") {
              await this.target(tx, actor, input.initial_administrator);
              const child = await tenantCreate(tx, actor, { body: input.tenant, key, correlationId });
              // A pre-existing independently invoked tenantCreate claim must never be adopted.
              if (child.replayed) conflict();
              const created: Progress = { tenant_id: child.result.tenant_id, user_identity_id: input.initial_administrator.user_identity_id,
                completed_steps: ["tenant_create"], pending_steps: ["tenant_bootstrap"] };
              await sql`UPDATE ops_audit.idempotency_records SET result_ref=${JSON.stringify({ version: 1, progress: created })}
                WHERE idempotency_record_id=${claim.idempotencyRecordId}::uuid AND result_status_code='in_progress'`.execute(tx);
              return { id: claim.idempotencyRecordId, progress: created, replayed: false };
            }
            const stored = receipt(claim.resultRef).progress;
            if (stored.user_identity_id !== input.initial_administrator.user_identity_id) conflict();
            if ((claim.state === "replay" && (claim.resultStatusCode !== "completed" || stored.pending_steps.length !== 0))
              || (claim.state === "in_progress" && stored.pending_steps.length === 0)) conflict();
            await this.reconcileChild(tx, identity, key, stored);
            progress = stored;
            await this.target(tx, actor, input.initial_administrator);
            return { id: claim.idempotencyRecordId, progress: stored, replayed: claim.state === "replay" };
          });
          progress = checkpoint.progress;
          if (checkpoint.replayed) return { result: checkpoint.progress, replayed: true };
          const result = await connection.transaction().setIsolationLevel("read committed").execute(async (tx) => {
            const actor = await this.authorize(tx, identity);
            await this.target(tx, actor, input.initial_administrator);
            const locked = await sql<{ result_ref: string }>`SELECT result_ref FROM ops_audit.idempotency_records
              WHERE idempotency_record_id=${checkpoint.id}::uuid AND request_hash=${requestHash} AND result_status_code='in_progress'
              FOR UPDATE`.execute(tx);
            if (locked.rows.length !== 1) conflict();
            const pending = receipt(locked.rows[0]!.result_ref).progress;
            await this.reconcileChild(tx, identity, key, pending);
            const bootstrap = await tenantBootstrapInTransaction(tx, actor, {
              tenantId: pending.tenant_id, userIdentityId: pending.user_identity_id, correlationId
            });
            const completed: Progress = { tenant_id: bootstrap.tenantId, user_identity_id: bootstrap.userIdentityId,
              membership_id: bootstrap.tenantMembershipId, initial_assignment_id: bootstrap.membershipRoleId,
              completed_steps: ["tenant_create", "tenant_bootstrap"], pending_steps: [] };
            await this.audit(tx, identity, completed, "success", correlationId);
            await completeIdempotency(tx, { idempotencyRecordId: checkpoint.id, requestHash, resultStatusCode: "completed",
              resultRef: JSON.stringify({ version: 1, progress: completed }), responseHash: hash(completed) });
            return completed;
          });
          progress = result;
          return { result, replayed: false };
        } finally {
          await sql`SELECT pg_advisory_unlock(${lock}::bigint)`.execute(connection);
        }
      });
    } catch (error) {
      // Separate failure evidence preserves the completed child transaction without false rollback.
      if (authorizedActor || (error instanceof FoundationError && error.statusCode === 403)) {
        try {
          await this.database.transaction().execute((tx) => this.audit(tx, identity, progress,
            error instanceof FoundationError && error.statusCode === 403 ? "denied" : "failure", correlationId));
        } catch {
          throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Initial onboarding unavailable", 503, true,
            progress ? { onboarding_progress: progress } : undefined);
        }
      }
      const original = error instanceof FoundationError ? error
        : error && typeof error === "object" && "code" in error && error.code === "23505"
          ? new FoundationError("TCDX.CONFLICT.RESOURCE", "Initial onboarding conflicts with existing data", 409)
          : new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Initial onboarding unavailable", 503, true);
      throw new FoundationError(original.code, original.message, original.statusCode, original.retryable,
        progress ? { onboarding_progress: progress } : undefined);
    }
  }

  private async authorize(database: Kysely<FoundationDatabase>, identity: VerifiedIdentity) {
    const actor = await resolvePlatformActor(database, identity, "statement");
    requirePlatformAccess(actor, "platform.tenant.create", actor.roles.includes("PLATFORM_ADMIN"));
    requirePlatformAccess(actor, "platform.user_identity.read");
    return actor;
  }

  private async target(tx: Transaction<FoundationDatabase>, actor: PlatformActor,
    selection: { kind: string; user_identity_id: string }) {
    if (selection.user_identity_id === actor.identity.principalId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const rows = await sql<{ identity_key: string }>`SELECT identity_key FROM iam.user_identities
      WHERE user_identity_id=${selection.user_identity_id}::uuid AND lifecycle_state='active' FOR SHARE`.execute(tx);
    if (rows.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
    if (selection.kind === "provisioned_managed_identity") {
      requirePlatformAccess(actor, "platform.managed_identity.create");
      if (!this.metadata) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Identity provider unavailable", 503, true);
      let provider;
      try { provider = (await this.metadata.discoveryMetadata()).get(rows.rows[0]!.identity_key); }
      catch { throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Identity provider unavailable", 503, true); }
      if (!provider?.eligible || provider.provider !== "tcdx-managed-identity") throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
  }

  private async reconcileChild(tx: Transaction<FoundationDatabase>, identity: VerifiedIdentity, key: string, progress: Progress) {
    const child = await sql`SELECT 1 FROM ops_audit.idempotency_records i JOIN platform.tenants t
      ON i.result_ref='tenant:'||t.tenant_id::text
      WHERE i.ownership_class='PLATFORM_CONTROL' AND i.tenant_id IS NULL
        AND i.actor_user_identity_id=${identity.principalId}::uuid AND i.operation_code='tenantCreate'
        AND i.idempotency_key=${key} AND i.result_status_code='completed' AND t.tenant_id=${progress.tenant_id}::uuid
        AND t.lifecycle_state='active'`.execute(tx);
    if (child.rows.length !== 1) conflict();
    if (progress.membership_id && progress.initial_assignment_id) {
      const materialized = await sql`SELECT 1 FROM iam.tenant_memberships m JOIN iam.membership_roles mr
        ON mr.tenant_membership_id=m.tenant_membership_id AND mr.tenant_id=m.tenant_id
        JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id AND r.ownership_class='TENANT_OWNED'
        WHERE m.tenant_id=${progress.tenant_id}::uuid AND m.user_identity_id=${progress.user_identity_id}::uuid
          AND m.tenant_membership_id=${progress.membership_id}::uuid AND mr.membership_role_id=${progress.initial_assignment_id}::uuid
          AND r.role_code='TENANT_ADMIN' AND mr.scope_kind='tenant'`.execute(tx);
      if (materialized.rows.length !== 1) conflict();
    }
  }

  private async audit(tx: Transaction<FoundationDatabase>, identity: VerifiedIdentity, progress: Progress | undefined, outcome: string, correlationId: string) {
    await persistAuditEvent(tx, { auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      actor: { userIdentityId: identity.principalId }, correlationId, eventCode: "audit.platform.tenant_initial_onboarding.create.v1",
      aggregateType: progress ? "Tenant" : "UserIdentity", aggregateId: progress?.tenant_id ?? identity.principalId,
      commandCode: OPERATION, outcome, classification: "restricted", after: { authority_context: "platform", ...(progress ?? {}) } });
  }
}
