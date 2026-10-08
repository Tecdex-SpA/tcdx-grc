import { createHash, randomBytes } from "node:crypto";
import { sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent } from "../persistence/foundation-records.js";
import { newUuidV7 } from "../uuid.js";
import { canonicalIdentityKey } from "./oidc-browser.js";
import type { PlatformActor } from "./platform-authority.js";
import { requirePlatformAccess } from "./platform-authority.js";
import type { ManagedUser, ManagedUserAdminPort } from "./keycloak-managed-user-adapter.js";

const ISSUER = "https://iam.grc.tecdex.net/realms/tcdx-managed-identity";
const PROVIDER = "tcdx-managed-identity";

type IdentityRow = {
  user_identity_id: string;
  identity_key: string;
  display_name: string;
  email_normalized: string | null;
  lifecycle_state: string;
  created_at: Date;
};

export type ManagedIdentityProjection = {
  user_identity_id: string;
  provider: typeof PROVIDER;
  issuer: typeof ISSUER;
  subject_reference: string;
  username: string;
  display_name: string;
  identity_lifecycle_state: string;
  enabled: boolean;
  mfa_enrolled: boolean;
};

type Operation = "managedIdentityProvision" | "managedIdentityDisable" | "managedIdentityEnable"
  | "managedIdentityPasswordReset" | "managedIdentityMfaReset" | "managedIdentitySessionRevoke";

const auditCode: Record<Operation, string> = {
  managedIdentityProvision: "audit.platform.managed_identity.provision.v1",
  managedIdentityDisable: "audit.platform.managed_identity.disable.v1",
  managedIdentityEnable: "audit.platform.managed_identity.enable.v1",
  managedIdentityPasswordReset: "audit.platform.managed_identity.password_reset.v1",
  managedIdentityMfaReset: "audit.platform.managed_identity.mfa_reset.v1",
  managedIdentitySessionRevoke: "audit.platform.managed_identity.session_revoke.v1"
};

function denied(): never { throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); }
function notFound(): never { throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404); }
function invalid(field: string): never { throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field }); }
function recoveryRequired(): never {
  throw new FoundationError("TCDX.CONFLICT.RECOVERY_REQUIRED", "Manual recovery required", 409);
}

function authorize(actor: PlatformActor, permission: string): void {
  if (!actor.roles.includes("PLATFORM_ADMIN")) denied();
  requirePlatformAccess(actor, permission);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, canonical(item)]));
  return value;
}

function requestHash(operation: Operation, body: Record<string, unknown>): string {
  return createHash("sha256").update(`v1\0${operation}\0${JSON.stringify(canonical(body))}`).digest("hex");
}

function safeHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) invalid(field);
  return value.trim();
}

function bodyFields(body: unknown, allowed: readonly string[], required: readonly string[]): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) invalid("body");
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!allowed.includes(key)) invalid(key);
  for (const key of required) if (record[key] === undefined) invalid(key);
  return record;
}

function identityId(value: unknown): string {
  if (typeof value !== "string" || !validateUuid(value)) invalid("user_identity_id");
  return value;
}

function key(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 255) invalid("Idempotency-Key");
  return value;
}

function projection(row: IdentityRow, user: ManagedUser): ManagedIdentityProjection {
  return {
    user_identity_id: row.user_identity_id, provider: PROVIDER, issuer: ISSUER,
    subject_reference: user.id, username: user.username, display_name: row.display_name,
    identity_lifecycle_state: row.lifecycle_state, enabled: user.enabled, mfa_enrolled: user.mfaEnrolled
  };
}

type ProvisionFacts = { username: string; displayName: string; email: string | null; marker: string };

function compatibleProvisionUser(user: ManagedUser, facts: ProvisionFacts): boolean {
  return user.username === facts.username && user.firstName === facts.displayName
    && (user.email ?? null) === facts.email && !!user.id && user.enabled
    && user.requiredActions.includes("UPDATE_PASSWORD") && user.requiredActions.includes("CONFIGURE_TOTP")
    && user.attributes.tcdx_provision_reconciliation_marker?.length === 1
    && user.attributes.tcdx_provision_reconciliation_marker[0] === facts.marker;
}

export async function reconcileProvisionMarker(admin: ManagedUserAdminPort, facts: ProvisionFacts): Promise<ManagedUser | null> {
  const first = await admin.listManagedUsers(0, 2, facts.marker);
  if (first.length > 1) recoveryRequired();
  if (first.length === 0) return null;
  const following = await admin.listManagedUsers(1, 2, facts.marker);
  if (following.length > 0 || !compatibleProvisionUser(first[0]!, facts)) recoveryRequired();
  return first[0]!;
}

function parseCursor(value: unknown): { created_at: string; user_identity_id: string } | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 512) invalid("page[cursor]");
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof cursor.created_at !== "string" || !Number.isFinite(Date.parse(cursor.created_at))
      || typeof cursor.user_identity_id !== "string" || !validateUuid(cursor.user_identity_id)
      || cursor.version !== 1) invalid("page[cursor]");
    return { created_at: cursor.created_at, user_identity_id: cursor.user_identity_id };
  } catch { return invalid("page[cursor]"); }
}

function pageSize(value: unknown): number {
  if (value === undefined) return 25;
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) invalid("page[size]");
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size > 100) invalid("page[size]");
  return size;
}

export class ManagedIdentityService {
  constructor(private readonly database: Kysely<FoundationDatabase>, private readonly admin: ManagedUserAdminPort,
    private readonly revokeApplicationSessions: (userIdentityId: string) => Promise<void>) {}

  private async allProviderUsers(): Promise<Map<string, ManagedUser>> {
    const users = new Map<string, ManagedUser>();
    for (let first = 0; ; first += 100) {
      const page = await this.admin.listManagedUsers(first, 100);
      for (const user of page) {
        const identityKey = canonicalIdentityKey(ISSUER, user.id);
        if (users.has(identityKey)) recoveryRequired();
        users.set(identityKey, user);
      }
      if (page.length < 100) break;
    }
    return users;
  }

  /** Internal safe presentation binding; never grants GRC authority. */
  async discoveryMetadata(): Promise<Map<string, { username: string; provider: string; provider_display: string; eligible: boolean }>> {
    const users = await this.allProviderUsers();
    return new Map([...users].map(([identityKey, user]) => [identityKey, {
      username: user.username, provider: PROVIDER, provider_display: "Tecdex Managed Identity", eligible: user.enabled
    }]));
  }

  private async target(userIdentityId: string): Promise<{ row: IdentityRow; user: ManagedUser }> {
    const row = (await sql<IdentityRow>`SELECT user_identity_id,identity_key,display_name,email_normalized,lifecycle_state,created_at
      FROM iam.user_identities WHERE user_identity_id=${identityId(userIdentityId)}::uuid`.execute(this.database)).rows[0];
    if (!row) notFound();
    const user = (await this.allProviderUsers()).get(row.identity_key);
    if (!user) notFound();
    const full = await this.admin.getManagedUser(user.id);
    if (!full || canonicalIdentityKey(ISSUER, full.id) !== row.identity_key) recoveryRequired();
    return { row, user: full };
  }

  async list(actor: PlatformActor, query: Record<string, unknown>): Promise<{ items: ManagedIdentityProjection[]; page: { has_more: boolean; next_cursor: string | null } }> {
    authorize(actor, "platform.managed_identity.read");
    for (const field of Object.keys(query)) if (!["page[size]", "page[cursor]"].includes(field)) invalid(field);
    const size = pageSize(query["page[size]"]);
    const after = parseCursor(query["page[cursor]"]);
    const users = await this.allProviderUsers();
    const keys = [...users.keys()];
    if (!keys.length) return { items: [], page: { has_more: false, next_cursor: null } };
    const records = await sql<IdentityRow>`
      SELECT user_identity_id,identity_key,display_name,email_normalized,lifecycle_state,created_at
        FROM iam.user_identities
       WHERE identity_key IN (${sql.join(keys)})
         ${after ? sql`AND (created_at,user_identity_id)<(${after.created_at}::timestamptz,${after.user_identity_id}::uuid)` : sql``}
       ORDER BY created_at DESC,user_identity_id DESC LIMIT ${size + 1}
    `.execute(this.database);
    const hasMore = records.rows.length > size;
    const rows = records.rows.slice(0, size);
    const items: ManagedIdentityProjection[] = [];
    for (const row of rows) {
      const user = users.get(row.identity_key);
      if (!user) recoveryRequired();
      const full = await this.admin.getManagedUser(user.id);
      if (!full) recoveryRequired();
      items.push(projection(row, full));
    }
    const last = rows.at(-1);
    return { items, page: { has_more: hasMore,
      next_cursor: hasMore && last ? Buffer.from(JSON.stringify({ version: 1, created_at: last.created_at.toISOString(),
        user_identity_id: last.user_identity_id })).toString("base64url") : null } };
  }

  async read(actor: PlatformActor, userIdentityId: string): Promise<ManagedIdentityProjection> {
    authorize(actor, "platform.managed_identity.read");
    const { row, user } = await this.target(userIdentityId);
    return projection(row, user);
  }

  private async claim(actor: PlatformActor, operation: Operation, idempotencyKey: string,
    body: Record<string, unknown>, correlationId: string, marker?: string) {
    const hash = requestHash(operation, body);
    const result = await this.database.transaction().execute((transaction) => claimIdempotency(transaction, {
      idempotencyRecordId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      actor: { userIdentityId: actor.identity.principalId }, correlationId,
      operationCode: operation, key: key(idempotencyKey), requestHash: hash,
      ...(marker ? { initialResultRef: `marker:${marker}` } : {}), returnInProgress: true
    }));
    return { ...result, hash };
  }

  private async complete(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, input: {
    operation: Operation; idempotencyRecordId: string; hash: string; userIdentityId: string; correlationId: string;
    outcome: "success" | "uncertain"; before?: Record<string, unknown>; after?: Record<string, unknown>;
  }): Promise<void> {
    await persistAuditEvent(transaction, {
      auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      actor: { userIdentityId: actor.identity.principalId }, correlationId: input.correlationId,
      eventCode: auditCode[input.operation], aggregateType: "UserIdentity", aggregateId: input.userIdentityId,
      commandCode: input.operation, outcome: input.outcome, classification: "restricted",
      ...(input.before ? { before: input.before } : {}), ...(input.after ? { after: input.after } : {})
    });
    await completeIdempotency(transaction, {
      idempotencyRecordId: input.idempotencyRecordId, requestHash: input.hash,
      resultStatusCode: input.outcome === "success" ? "completed" : "failed",
      resultRef: `managed-identity:${input.userIdentityId}`,
      responseHash: safeHash({ operation: input.operation, target: input.userIdentityId, outcome: input.outcome })
    });
  }

  private async hasUncertainProvisionAudit(transaction: Transaction<FoundationDatabase>, claimId: string): Promise<boolean> {
    const existing = await sql<{ audit_event_id: string }>`
      SELECT audit_event_id FROM ops_audit.audit_events
       WHERE event_code=${auditCode.managedIdentityProvision}
         AND aggregate_type='IdempotencyRecord' AND aggregate_id=${claimId}::uuid LIMIT 1
    `.execute(transaction);
    return existing.rows.length > 0;
  }

  private async auditUncertainProvision(transaction: Transaction<FoundationDatabase>, actor: PlatformActor,
    claimId: string, correlationId: string): Promise<void> {
    if (await this.hasUncertainProvisionAudit(transaction, claimId)) return;
    // No canonical UserIdentity exists yet; the durable claim is the known audit target.
    await persistAuditEvent(transaction, {
      auditEventId: newUuidV7(), ownershipClass: "PLATFORM_CONTROL", tenantId: null,
      actor: { userIdentityId: actor.identity.principalId }, correlationId,
      eventCode: auditCode.managedIdentityProvision, aggregateType: "IdempotencyRecord", aggregateId: claimId,
      commandCode: "managedIdentityProvision", outcome: "uncertain", classification: "restricted",
      after: { recovery_required: true, idempotency_record_id: claimId }
    });
  }

  private async insertIdentity(transaction: Transaction<FoundationDatabase>, actor: PlatformActor, user: ManagedUser,
    displayName: string, email: string | null): Promise<IdentityRow> {
    const identityKey = canonicalIdentityKey(ISSUER, user.id);
    const id = newUuidV7();
    await sql`INSERT INTO iam.user_identities
      (user_identity_id,created_by_user_identity_id,updated_by_user_identity_id,identity_key,display_name,email_normalized,lifecycle_state)
      VALUES (${id}::uuid,${actor.identity.principalId}::uuid,${actor.identity.principalId}::uuid,
        ${identityKey},${displayName},${email},'active')
      ON CONFLICT (identity_key) DO NOTHING`.execute(transaction);
    const rows = await sql<IdentityRow>`SELECT user_identity_id,identity_key,display_name,email_normalized,lifecycle_state,created_at
      FROM iam.user_identities WHERE identity_key=${identityKey} FOR UPDATE`.execute(transaction);
    if (rows.rows.length !== 1 || rows.rows[0]!.lifecycle_state !== "active"
      || rows.rows[0]!.display_name !== displayName || rows.rows[0]!.email_normalized !== email) recoveryRequired();
    return rows.rows[0]!;
  }

  async provision(actor: PlatformActor, body: unknown, idempotencyKey: string, correlationId: string): Promise<{
    identity: ManagedIdentityProjection; credential_disclosed: boolean; temporary_credential?: string; replayed: boolean
  }> {
    authorize(actor, "platform.managed_identity.create");
    const fields = bodyFields(body, ["display_name", "username", "person_verification_ref", "email"],
      ["display_name", "username", "person_verification_ref"]);
    const displayName = text(fields.display_name, "display_name", 255);
    const username = text(fields.username, "username", 255);
    const personRef = text(fields.person_verification_ref, "person_verification_ref", 255);
    const email = fields.email === undefined ? null : text(fields.email, "email", 255).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid("email");
    const normalized = { display_name: displayName, username, person_verification_ref: personRef,
      ...(email ? { email } : {}) };
    const proposedMarker = randomBytes(24).toString("base64url");
    const claim = await this.claim(actor, "managedIdentityProvision", idempotencyKey, normalized, correlationId, proposedMarker);
    if (claim.state === "replay") {
      if (claim.resultStatusCode === "failed" && claim.resultRef === "error:duplicate-username") {
        throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Identity conflict", 409);
      }
      if (claim.resultStatusCode !== "completed" || !claim.resultRef?.startsWith("managed-identity:")) recoveryRequired();
      const existing = await this.target(claim.resultRef.slice("managed-identity:".length));
      return { identity: projection(existing.row, existing.user), credential_disclosed: false, replayed: true };
    }
    type ProvisionOutcome = { kind: "replay"; id: string } | { kind: "duplicate" } | { kind: "recovery" }
      | { kind: "original"; row: IdentityRow; user: ManagedUser; credential: string };
    const outcome: ProvisionOutcome = await this.database.transaction().execute(async (transaction): Promise<ProvisionOutcome> => {
      // The durable claim was committed before this transaction. Its row lock spans the provider mutation:
      // another same-key request waits for completion or, after a crash, reconciles the same marker.
      const locked = (await sql<{ result_status_code: string; result_ref: string | null }>`
        SELECT result_status_code,result_ref FROM ops_audit.idempotency_records
         WHERE idempotency_record_id=${claim.idempotencyRecordId}::uuid AND request_hash=${claim.hash}
         FOR UPDATE
      `.execute(transaction)).rows[0];
      if (!locked) recoveryRequired();
      if (locked.result_status_code === "completed" && locked.result_ref?.startsWith("managed-identity:"))
        return { kind: "replay", id: locked.result_ref.slice("managed-identity:".length) };
      if (locked.result_status_code === "failed" && locked.result_ref === "error:duplicate-username") return { kind: "duplicate" };
      if (locked.result_status_code !== "in_progress") return { kind: "recovery" };
      const marker = locked.result_ref?.startsWith("marker:") ? locked.result_ref.slice("marker:".length) : null;
      if (!marker || (claim.state === "claimed" && marker !== proposedMarker)) {
        await this.auditUncertainProvision(transaction, actor, claim.idempotencyRecordId, correlationId);
        return { kind: "recovery" };
      }
      const facts = { username, displayName, email, marker };
      if (claim.state === "in_progress") {
        const match = await reconcileProvisionMarker(this.admin, facts).catch(() => null);
        if (!match) {
          await this.auditUncertainProvision(transaction, actor, claim.idempotencyRecordId, correlationId);
          return { kind: "recovery" };
        }
        const row = await this.insertIdentity(transaction, actor, match, displayName, email);
        if (await this.hasUncertainProvisionAudit(transaction, claim.idempotencyRecordId)) {
          await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash: claim.hash,
            resultStatusCode: "failed", resultRef: `managed-identity:${row.user_identity_id}`,
            responseHash: safeHash({ operation: "managedIdentityProvision", target: row.user_identity_id, outcome: "uncertain" }) });
        } else {
          await this.complete(transaction, actor, { operation: "managedIdentityProvision", idempotencyRecordId: claim.idempotencyRecordId,
            hash: claim.hash, userIdentityId: row.user_identity_id, correlationId, outcome: "uncertain",
            after: { recovery_required: true } });
        }
        return { kind: "recovery" };
      }
      const credential = randomBytes(36).toString("base64url");
      let subject: string;
      try {
        subject = await this.admin.createManagedUser({ username, displayName, ...(email ? { email } : {}), marker });
      } catch (error) {
        if (error instanceof FoundationError && error.code === "TCDX.CONFLICT.RESOURCE") {
          await completeIdempotency(transaction, {
            idempotencyRecordId: claim.idempotencyRecordId, requestHash: claim.hash, resultStatusCode: "failed",
            resultRef: "error:duplicate-username", responseHash: safeHash({ code: "TCDX.CONFLICT.RESOURCE" })
          });
          return { kind: "duplicate" };
        }
        await this.auditUncertainProvision(transaction, actor, claim.idempotencyRecordId, correlationId);
        return { kind: "recovery" };
      }
      const user = await this.admin.getManagedUser(subject).catch(() => null);
      if (!user || !compatibleProvisionUser(user, facts)) {
        await this.auditUncertainProvision(transaction, actor, claim.idempotencyRecordId, correlationId);
        return { kind: "recovery" };
      }
      try { await this.admin.setTemporaryPassword(subject, credential); }
      catch {
        await this.auditUncertainProvision(transaction, actor, claim.idempotencyRecordId, correlationId);
        return { kind: "recovery" };
      }
      const row = await this.insertIdentity(transaction, actor, user, displayName, email);
      await this.complete(transaction, actor, { operation: "managedIdentityProvision", idempotencyRecordId: claim.idempotencyRecordId,
        hash: claim.hash, userIdentityId: row.user_identity_id, correlationId, outcome: "success",
        after: { enabled: true, person_verification_ref: personRef } });
      return { kind: "original", row, user, credential };
    }).catch(() => recoveryRequired());
    if (outcome.kind === "duplicate") throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Identity conflict", 409);
    if (outcome.kind === "recovery") recoveryRequired();
    if (outcome.kind === "replay") {
      const existing = await this.target(outcome.id);
      return { identity: projection(existing.row, existing.user), credential_disclosed: false, replayed: true };
    }
    return { identity: projection(outcome.row, outcome.user), credential_disclosed: true,
      temporary_credential: outcome.credential, replayed: false };
  }

  private async mutate(actor: PlatformActor, operation: Exclude<Operation, "managedIdentityProvision">,
    userIdentityId: string, body: unknown, idempotencyKey: string, correlationId: string): Promise<{
      identity: ManagedIdentityProjection; credential_disclosed?: boolean; temporary_credential?: string; replayed: boolean
    }> {
    authorize(actor, "platform.managed_identity.administer");
    const id = identityId(userIdentityId);
    const fields = bodyFields(body, operation === "managedIdentityPasswordReset" ? ["reason", "person_verification_ref"] : ["reason"],
      operation === "managedIdentityPasswordReset" ? ["reason", "person_verification_ref"] : ["reason"]);
    const reason = text(fields.reason, "reason", 2000);
    const personRef = operation === "managedIdentityPasswordReset"
      ? text(fields.person_verification_ref, "person_verification_ref", 255) : null;
    const normalized = { user_identity_id: id, reason, ...(personRef ? { person_verification_ref: personRef } : {}) };
    const target = await this.target(id);
    const claim = await this.claim(actor, operation, idempotencyKey, normalized, correlationId);
    if (claim.state === "in_progress") recoveryRequired();
    if (claim.state === "replay") {
      if (claim.resultStatusCode === "failed" && claim.resultRef === "error:transition") {
        throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Identity state transition denied", 409);
      }
      if (claim.resultStatusCode !== "completed" || claim.resultRef !== `managed-identity:${id}`) recoveryRequired();
      return { identity: projection(target.row, target.user),
        ...(operation === "managedIdentityPasswordReset" ? { credential_disclosed: false } : {}), replayed: true };
    }
    type MutationOutcome = { kind: "transition" | "recovery" }
      | { kind: "done"; row: IdentityRow; user: ManagedUser; credential?: string };
    const outcome: MutationOutcome = await this.database.transaction().execute(async (transaction): Promise<MutationOutcome> => {
      // Serialize different keys targeting one global identity through the provider action and local completion.
      const row = (await sql<IdentityRow>`
        SELECT user_identity_id,identity_key,display_name,email_normalized,lifecycle_state,created_at
          FROM iam.user_identities WHERE user_identity_id=${id}::uuid FOR UPDATE
      `.execute(transaction)).rows[0];
      if (!row || row.identity_key !== target.row.identity_key) return { kind: "recovery" };
      const user = await this.admin.getManagedUser(target.user.id);
      if (!user || canonicalIdentityKey(ISSUER, user.id) !== row.identity_key) return { kind: "recovery" };
      if (!((row.lifecycle_state === "active" && user.enabled)
        || (row.lifecycle_state === "disabled" && !user.enabled))) return { kind: "recovery" };
      if (operation === "managedIdentityDisable" || operation === "managedIdentityEnable") {
        const expectedState = operation === "managedIdentityDisable" ? "active" : "disabled";
        const expectedEnabled = operation === "managedIdentityDisable";
        if (row.lifecycle_state !== expectedState || user.enabled !== expectedEnabled) {
          if ((row.lifecycle_state !== "disabled" || user.enabled)
            && (row.lifecycle_state !== "active" || !user.enabled)) return { kind: "recovery" };
          await completeIdempotency(transaction, {
            idempotencyRecordId: claim.idempotencyRecordId, requestHash: claim.hash, resultStatusCode: "failed",
            resultRef: "error:transition", responseHash: safeHash({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED" })
          });
          return { kind: "transition" };
        }
      }
      let credential: string | undefined;
      try {
        if (operation === "managedIdentityDisable") {
          await this.admin.setManagedUserEnabled(user.id, false);
          await this.admin.revokeManagedUserSessions(user.id);
          await this.revokeApplicationSessions(id);
        } else if (operation === "managedIdentityEnable") {
          await this.admin.setManagedUserEnabled(user.id, true);
        } else if (operation === "managedIdentityPasswordReset") {
          credential = randomBytes(36).toString("base64url");
          await this.admin.setTemporaryPassword(user.id, credential);
          await this.admin.revokeManagedUserSessions(user.id);
          await this.revokeApplicationSessions(id);
        } else if (operation === "managedIdentityMfaReset") {
          await this.admin.removeManagedUserTotpCredential(user.id);
          await this.admin.revokeManagedUserSessions(user.id);
          await this.revokeApplicationSessions(id);
        } else {
          await this.admin.revokeManagedUserSessions(user.id);
          await this.revokeApplicationSessions(id);
        }
      } catch {
        await this.complete(transaction, actor, { operation, idempotencyRecordId: claim.idempotencyRecordId,
          hash: claim.hash, userIdentityId: id, correlationId, outcome: "uncertain",
          before: { enabled: user.enabled, lifecycle_state: row.lifecycle_state },
          after: { recovery_required: true, reason } });
        return { kind: "recovery" };
      }
      const nextState = operation === "managedIdentityDisable" ? "disabled"
        : operation === "managedIdentityEnable" ? "active" : row.lifecycle_state;
      if (nextState !== row.lifecycle_state) {
        const updated = await sql`
          UPDATE iam.user_identities SET lifecycle_state=${nextState},updated_at=transaction_timestamp(),
            updated_by_user_identity_id=${actor.identity.principalId}::uuid,row_version=row_version+1
          WHERE user_identity_id=${id}::uuid AND identity_key=${row.identity_key} AND lifecycle_state=${row.lifecycle_state}
        `.execute(transaction);
        if (Number(updated.numAffectedRows) !== 1) recoveryRequired();
      }
      await this.complete(transaction, actor, { operation, idempotencyRecordId: claim.idempotencyRecordId,
        hash: claim.hash, userIdentityId: id, correlationId, outcome: "success",
        before: { enabled: user.enabled, lifecycle_state: row.lifecycle_state },
        after: { enabled: operation === "managedIdentityDisable" ? false : operation === "managedIdentityEnable" ? true : user.enabled,
          lifecycle_state: nextState, reason, ...(personRef ? { person_verification_ref: personRef } : {}) } });
      return { kind: "done", row: { ...row, lifecycle_state: nextState }, user: { ...user,
        enabled: operation === "managedIdentityDisable" ? false : operation === "managedIdentityEnable" ? true : user.enabled,
        mfaEnrolled: operation === "managedIdentityMfaReset" ? false : user.mfaEnrolled },
      ...(credential ? { credential } : {}) };
    }).catch(() => recoveryRequired());
    if (outcome.kind === "transition") throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Identity state transition denied", 409);
    if (outcome.kind !== "done") recoveryRequired();
    return { identity: projection(outcome.row, outcome.user),
      ...(outcome.credential ? { credential_disclosed: true, temporary_credential: outcome.credential } : {}), replayed: false };
  }

  async disable(actor: PlatformActor, id: string, body: unknown, key: string, correlationId: string) {
    return this.mutate(actor, "managedIdentityDisable", id, body, key, correlationId);
  }
  async enable(actor: PlatformActor, id: string, body: unknown, key: string, correlationId: string) {
    return this.mutate(actor, "managedIdentityEnable", id, body, key, correlationId);
  }
  async passwordReset(actor: PlatformActor, id: string, body: unknown, key: string, correlationId: string) {
    return this.mutate(actor, "managedIdentityPasswordReset", id, body, key, correlationId);
  }
  async mfaReset(actor: PlatformActor, id: string, body: unknown, key: string, correlationId: string) {
    return this.mutate(actor, "managedIdentityMfaReset", id, body, key, correlationId);
  }
  async sessionRevoke(actor: PlatformActor, id: string, body: unknown, key: string, correlationId: string) {
    return this.mutate(actor, "managedIdentitySessionRevoke", id, body, key, correlationId);
  }
}
