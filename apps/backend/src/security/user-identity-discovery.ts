import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { newUuidV7 } from "../uuid.js";
import { persistAuditEvent } from "../persistence/foundation-records.js";
import { requireAccess, resolveTenantActor } from "../core-grc/security.js";
import { requirePlatformAccess, resolvePlatformActor } from "./platform-authority.js";
import type { VerifiedIdentity } from "./authentication.js";

export interface IdentityDiscoveryMetadataPort {
  discoveryMetadata(): Promise<Map<string, { username: string; provider: string; provider_display: string; eligible: boolean }>>;
}

type Query = Record<string, unknown>;
type Mode = "platform_search" | "tenant_exact";
type Criterion = "display_name" | "email" | "username";
type Row = { user_identity_id: string; identity_key: string; display_name: string | null;
  email_normalized: string | null; lifecycle_state: string; created_at: Date };
type Candidate = { user_identity_id: string; display_name: string | null; provider: string | null;
  provider_display: string | null; lifecycle_state: "active"; username?: string; email_normalized?: string | null; existing_membership_id?: string };

function invalid(): never { throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid discovery query", 400); }
function deny(): never { throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); }
function unavailable(): never { throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Identity discovery unavailable", 503, true); }

export function discoveryQuery(query: Query) {
  if (Object.keys(query).some((key) => !["mode", "criterion", "value", "page[size]", "page[cursor]"].includes(key))) invalid();
  const { mode, criterion, value } = query;
  if (mode !== "platform_search" && mode !== "tenant_exact") invalid();
  if (criterion !== "display_name" && criterion !== "email" && criterion !== "username") invalid();
  if (typeof value !== "string" || !value.trim() || value.length > 255 || /[\u0000-\u001f]/.test(value)) invalid();
  if (criterion === "email" && !/^[^\s@*%?]+@[^\s@*%?]+\.[^\s@*%?]+$/.test(value)) invalid();
  if (mode === "tenant_exact" && (criterion === "display_name" || /[*%?]/.test(value)
    || query["page[size]"] !== undefined || query["page[cursor]"] !== undefined)) invalid();
  const size = query["page[size]"] === undefined ? 25 : Number(query["page[size]"]);
  if (!Number.isInteger(size) || size < 1 || size > 100 || (query["page[size]"] !== undefined && !/^\d+$/.test(String(query["page[size]"])))) invalid();
  // This binds pagination only; it is not a lookup-value audit or authority key.
  const binding = createHash("sha256").update(JSON.stringify([mode, criterion, value])).digest("hex");
  let after: { created_at: string; user_identity_id: string } | undefined;
  if (query["page[cursor]"] !== undefined) {
    if (typeof query["page[cursor]"] !== "string" || query["page[cursor]"].length > 2048) invalid();
    try {
      const cursor = JSON.parse(Buffer.from(query["page[cursor]"], "base64url").toString("utf8"));
      if (cursor.version !== 1 || cursor.binding !== binding || !validateUuid(cursor.user_identity_id)
        || typeof cursor.created_at !== "string" || !Number.isFinite(Date.parse(cursor.created_at))
        || Object.keys(cursor).some((key) => !["version", "binding", "created_at", "user_identity_id"].includes(key))) invalid();
      after = { created_at: cursor.created_at, user_identity_id: cursor.user_identity_id };
    } catch { invalid(); }
  }
  return { mode: mode as Mode, criterion: criterion as Criterion, value, size, binding, after };
}

export class UserIdentityDiscovery {
  constructor(private readonly database: Kysely<FoundationDatabase>, private readonly metadata?: IdentityDiscoveryMetadataPort) {}

  async discover(identity: VerifiedIdentity, tenantHeader: unknown, query: Query, correlationId: string, body?: unknown) {
    const mode = query.mode;
    let tenantId: string | null = null;
    try {
      if (mode === "platform_search") {
        if (tenantHeader !== undefined) deny();
        const actor = await resolvePlatformActor(this.database, identity);
        requirePlatformAccess(actor, "platform.user_identity.read", actor.roles.includes("PLATFORM_ADMIN"));
      } else if (mode === "tenant_exact") {
        if (typeof tenantHeader !== "string" || !validateUuid(tenantHeader)) deny();
        try {
          const actor = await resolveTenantActor(this.database, identity, tenantHeader);
          requireAccess(actor, "platform.user_identity.read", "CORE_PLATFORM", ["tenant"]);
          if (!actor.roles.includes("TENANT_ADMIN")) deny();
          const active = await sql`SELECT 1 FROM platform.tenants t JOIN iam.user_identities u
            ON u.user_identity_id=${identity.principalId}::uuid
            WHERE t.tenant_id=${tenantHeader}::uuid AND t.lifecycle_state='active' AND u.lifecycle_state='active'`.execute(this.database);
          if (active.rows.length !== 1) deny();
        } catch (error) {
          if (error instanceof FoundationError && [403, 404].includes(error.statusCode)) deny();
          throw error;
        }
        tenantId = tenantHeader;
      } else invalid();
      if (body !== undefined && body !== null) invalid();
      const filter = discoveryQuery(query);
      if (!this.metadata) unavailable();
      let metadata: Awaited<ReturnType<IdentityDiscoveryMetadataPort["discoveryMetadata"]>>;
      try { metadata = await this.metadata.discoveryMetadata(); } catch { unavailable(); }
      const usernameKeys = [...metadata].filter(([, item]) => item.username === filter.value).map(([key]) => key);
      const predicate = filter.criterion === "username"
        ? (usernameKeys.length ? sql`identity_key = ANY(${usernameKeys}::text[])` : sql`FALSE`)
        : filter.criterion === "email" ? sql`email_normalized=${filter.value}` : sql`strpos(display_name,${filter.value})>0`;
      const rows = await sql<Row>`SELECT user_identity_id,identity_key,display_name,email_normalized,lifecycle_state,created_at
        FROM iam.user_identities WHERE ${predicate}
        ${filter.mode === "platform_search" ? sql`AND lifecycle_state='active'` : sql``}
        ${filter.after ? sql`AND (created_at,user_identity_id)<(${filter.after.created_at}::timestamptz,${filter.after.user_identity_id}::uuid)` : sql``}
        ORDER BY created_at DESC,user_identity_id DESC LIMIT ${filter.mode === "tenant_exact" ? 2 : filter.size + 1}`.execute(this.database);
      let classification = rows.rows.length ? "unique" : "none";
      let candidates = rows.rows;
      let existingMembershipId: string | undefined;
      if (filter.mode === "tenant_exact") {
        if (candidates.length > 1) { classification = "ambiguous"; candidates = []; }
        if (candidates[0] && (candidates[0].lifecycle_state !== "active" || metadata.get(candidates[0].identity_key)?.eligible === false)) {
          classification = "ineligible"; candidates = [];
        }
        if (candidates[0]) {
          const memberships = await sql<{ tenant_membership_id: string; active: boolean }>`
            SELECT tenant_membership_id,(membership_state='active' AND (ended_at IS NULL OR ended_at>statement_timestamp())) AS active
              FROM iam.tenant_memberships WHERE tenant_id=${tenantId}::uuid AND user_identity_id=${candidates[0].user_identity_id}::uuid`.execute(this.database);
          if (memberships.rows.length > 1 || memberships.rows.some((row) => !row.active)) {
            classification = "ineligible"; candidates = [];
          } else if (memberships.rows[0]) { classification = "already_member"; existingMembershipId = memberships.rows[0].tenant_membership_id; }
        }
      }
      const items: Candidate[] = candidates.slice(0, filter.size).map((row) => {
        const presentation = metadata.get(row.identity_key);
        return { user_identity_id: row.user_identity_id, display_name: row.display_name,
          provider: presentation?.provider ?? null, provider_display: presentation?.provider_display ?? null, lifecycle_state: "active",
          ...(filter.mode === "platform_search" ? { ...(presentation ? { username: presentation.username } : {}), email_normalized: row.email_normalized }
            : existingMembershipId ? { existing_membership_id: existingMembershipId } : {}) };
      });
      const hasMore = filter.mode === "platform_search" && candidates.length > filter.size;
      const last = candidates.slice(0, filter.size).at(-1);
      const result = { items, meta: { has_more: hasMore, next_cursor: hasMore && last
        ? Buffer.from(JSON.stringify({ version: 1, binding: filter.binding, created_at: last.created_at.toISOString(), user_identity_id: last.user_identity_id })).toString("base64url") : null } };
      await this.audit(identity, tenantId, mode, filter.criterion, classification, "success", correlationId);
      return result;
    } catch (error) {
      try { await this.audit(identity, tenantId, mode, query.criterion, "none", error instanceof FoundationError && error.statusCode === 403 ? "denied" : "failure", correlationId); }
      catch { unavailable(); }
      if (error instanceof FoundationError) throw error;
      unavailable();
    }
  }

  private async audit(identity: VerifiedIdentity, tenantId: string | null, mode: unknown, criterion: unknown,
    classification: string, outcome: string, correlationId: string) {
    await this.database.transaction().execute((tx) => persistAuditEvent(tx, {
      auditEventId: newUuidV7(), ownershipClass: tenantId ? "TENANT_OWNED" : "PLATFORM_CONTROL", tenantId,
      actor: { userIdentityId: identity.principalId }, correlationId, eventCode: "audit.platform.user_identity.discover.v1",
      aggregateType: "UserIdentity", aggregateId: identity.principalId, commandCode: "userIdentityDiscovery", outcome, classification: "restricted",
      after: { authority_context: tenantId ? "tenant" : "platform", mode: mode === "tenant_exact" || mode === "platform_search" ? mode : "invalid",
        criterion_type: typeof criterion === "string" && ["display_name", "email", "username"].includes(criterion) ? criterion : "invalid", result_classification: classification }
    }));
  }
}
