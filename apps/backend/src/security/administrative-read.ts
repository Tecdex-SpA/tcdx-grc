import { createHash } from "node:crypto";
import { CompiledQuery, sql, type Kysely } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FastifyRequest } from "fastify";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { IdentityVerifier } from "./authentication.js";
import { requirePlatformAccess, resolvePlatformActor } from "./platform-authority.js";
import { requireAccess, resolveAuthenticatedIdentity, resolveCoreActor } from "../core-grc/security.js";
import { platformRoleFamilyCodes } from "./platform-role-family.js";
import { membershipRoleEtag } from "./membership-role-etag.js";

type JsonRow = Record<string, unknown>;
type ReadSpec = { select: string; from: string; where: string; values: unknown[]; id: string; createdAt: string; exposeCreatedAt?: boolean };
type ReadContext = { kind: "platform" | "tenant"; tenantId: string | null };
type Page = { items: JsonRow[]; page: { has_more: boolean; next_cursor: string | null } };

function denied(): never { throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); }
function notFound(): never { throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404); }
function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

export function administrativeQuery(query: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!query || typeof query !== "object" || Array.isArray(query)) invalid("query");
  const result = query as Record<string, unknown>;
  for (const key of Object.keys(result)) if (!allowed.includes(key)) invalid(key);
  return result;
}

function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !validateUuid(value)) invalid(field);
  return value as string;
}

async function selectedTenant(database: Kysely<FoundationDatabase>, value: unknown): Promise<string> {
  const tenantId = uuid(value, "tenant_id");
  const target = await sql<{ tenant_id: string }>`SELECT tenant_id FROM platform.tenants WHERE tenant_id=${tenantId}::uuid`.execute(database);
  if (target.rows.length !== 1) notFound();
  return tenantId;
}

async function context(
  database: Kysely<FoundationDatabase>, verifier: IdentityVerifier, request: FastifyRequest,
  permission: string, query: Record<string, unknown>, options: { platformOnly?: boolean; tenantRequired?: boolean } = {}
): Promise<ReadContext> {
  const tenantHeader = request.headers["x-tcdx-tenant-id"];
  if (tenantHeader !== undefined) {
    if (options.platformOnly || query.tenant_id !== undefined) denied();
    const actor = await resolveCoreActor(database, verifier, request);
    if (!actor.roles.includes("TENANT_ADMIN")) denied();
    requireAccess(actor, permission, "CORE_PLATFORM", ["tenant"]);
    return { kind: "tenant", tenantId: actor.tenantId };
  }
  const identity = await resolveAuthenticatedIdentity(verifier, request);
  const actor = await resolvePlatformActor(database, identity);
  requirePlatformAccess(actor, permission, actor.roles.includes("PLATFORM_ADMIN"));
  const tenantId = query.tenant_id === undefined
    ? (options.tenantRequired ? invalid("tenant_id") : null)
    : await selectedTenant(database, query.tenant_id);
  return { kind: "platform", tenantId };
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === "row_version" && typeof item === "string" ? Number(item) : normalize(item)]));
  return value;
}

function withRoleEtag(row: JsonRow): JsonRow {
  const project = (value: unknown): unknown => {
    if (!value || typeof value !== "object") return value;
    const role = value as JsonRow;
    if (typeof role.membership_role_id !== "string" || typeof role.valid_from !== "string") return value;
    return { ...role, etag: membershipRoleEtag({
      membership_role_id: role.membership_role_id,
      valid_from: role.valid_from,
      valid_to: typeof role.valid_to === "string" ? role.valid_to : null
    }) };
  };
  if (Array.isArray(row.roles)) return { ...row, roles: row.roles.map(project) };
  return project(row) as JsonRow;
}

function pageSize(value: unknown): number {
  if (value === undefined) return 25;
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) invalid("page[size]");
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size > 100) invalid("page[size]");
  return size;
}

function cursorHash(spec: ReadSpec): string {
  return createHash("sha256").update(JSON.stringify({ where: spec.where, values: spec.values })).digest("hex");
}

function cursor(value: unknown, expectedHash: string): { created_at: string; id: string } | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 2_048) invalid("page[cursor]");
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { created_at?: unknown; id?: unknown; hash?: unknown };
    if (typeof decoded.created_at !== "string" || Number.isNaN(Date.parse(decoded.created_at))
      || typeof decoded.id !== "string" || !validateUuid(decoded.id) || decoded.hash !== expectedHash) throw new Error("cursor");
    return { created_at: decoded.created_at, id: decoded.id };
  } catch { return invalid("page[cursor]"); }
}

async function list(database: Kysely<FoundationDatabase>, spec: ReadSpec, query: Record<string, unknown>): Promise<Page> {
  const size = pageSize(query["page[size]"]);
  const hash = cursorHash(spec);
  const after = cursor(query["page[cursor]"], hash);
  const values = [...spec.values];
  let where = spec.where;
  if (after) {
    values.push(after.created_at, after.id);
    where += ` AND (${spec.createdAt},${spec.id}) < ($${values.length - 1}::timestamptz,$${values.length}::uuid)`;
  }
  values.push(size + 1);
  const result = await database.executeQuery<JsonRow>(CompiledQuery.raw(
    `SELECT ${spec.select} FROM ${spec.from} WHERE ${where} ORDER BY ${spec.createdAt} DESC,${spec.id} DESC LIMIT $${values.length}::integer`, values
  ));
  const hasMore = result.rows.length > size;
  const rows = result.rows.slice(0, size);
  const last = rows.at(-1);
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({ created_at: normalize(last.created_at), id: last[spec.id.split(".").at(-1)!], hash }), "utf8").toString("base64url")
    : null;
  return { items: rows.map((row) => {
    const projection = { ...row };
    if (!spec.exposeCreatedAt) delete projection.created_at;
    return withRoleEtag(normalize(projection) as JsonRow);
  }), page: { has_more: hasMore, next_cursor: nextCursor } };
}

async function get(database: Kysely<FoundationDatabase>, spec: ReadSpec, id: string): Promise<JsonRow> {
  const values = [...spec.values, uuid(id, "id")];
  const result = await database.executeQuery<JsonRow>(CompiledQuery.raw(
    `SELECT ${spec.select} FROM ${spec.from} WHERE ${spec.where} AND ${spec.id}=$${values.length}::uuid`, values
  ));
  if (result.rows.length !== 1) notFound();
  const row = { ...result.rows[0]! };
  if (!spec.exposeCreatedAt) delete row.created_at;
  return withRoleEtag(normalize(row) as JsonRow);
}

const tenantSpec: ReadSpec = {
  select: `t.tenant_id,t.tenant_code,t.legal_name,t.display_name,t.default_timezone,t.lifecycle_state,t.data_classification,t.created_at,t.updated_at,
    (SELECT jsonb_build_object('subscription_id',s.subscription_id,'subscription_code',s.subscription_code,'lifecycle_state',s.lifecycle_state,
      'plan_code',p.plan_code,'plan_name',p.name,'plan_version_number',pv.version_number)
       FROM platform.subscriptions s JOIN platform.plan_versions pv ON pv.plan_version_id=s.plan_version_id
       JOIN platform.plans p ON p.plan_id=pv.plan_id
      WHERE s.tenant_id=t.tenant_id AND s.lifecycle_state='active' AND s.starts_at<=transaction_timestamp()
        AND (s.ends_at IS NULL OR s.ends_at>transaction_timestamp())
      ORDER BY s.starts_at DESC,s.subscription_id DESC LIMIT 1) AS current_subscription`,
  from: "platform.tenants t", where: "TRUE", values: [], id: "t.tenant_id", createdAt: "t.created_at", exposeCreatedAt: true
};

function membershipSpec(tenantId: string): ReadSpec {
  return {
    select: `m.tenant_membership_id,m.tenant_id,m.user_identity_id,m.membership_state,m.joined_at,m.ended_at,m.created_at,
      jsonb_build_object('display_name',u.display_name,'email_normalized',u.email_normalized,
        'lifecycle_state',u.lifecycle_state,'last_authenticated_at',u.last_authenticated_at) AS user_identity,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('membership_role_id',mr.membership_role_id,'role_id',r.role_id,
        'role_code',r.role_code,'role_name',r.name,'scope_kind',mr.scope_kind,'valid_from',mr.valid_from,'valid_to',mr.valid_to)
        ORDER BY r.name,mr.valid_from) FROM iam.membership_roles mr JOIN iam.roles r ON r.role_id=mr.role_id
        WHERE mr.tenant_id=m.tenant_id AND mr.tenant_membership_id=m.tenant_membership_id
          AND r.ownership_class='TENANT_OWNED' AND r.tenant_id=m.tenant_id),'[]'::jsonb) AS roles`,
    from: "iam.tenant_memberships m JOIN iam.user_identities u ON u.user_identity_id=m.user_identity_id",
    where: "m.tenant_id=$1::uuid", values: [tenantId], id: "m.tenant_membership_id", createdAt: "m.created_at"
  };
}

function invitationSpec(tenantId: string): ReadSpec {
  return {
    select: `i.tenant_membership_invitation_id,i.tenant_id,i.invitee_email,i.lifecycle_state,
      CASE WHEN i.lifecycle_state='pending' AND i.expires_at<=transaction_timestamp() THEN 'expired' ELSE i.lifecycle_state END AS effective_state,
      i.created_at,i.expires_at,i.accepted_at,i.revoked_at,i.tenant_membership_id,i.row_version`,
    from: "iam.tenant_membership_invitations i", where: "i.tenant_id=$1::uuid", values: [tenantId],
    id: "i.tenant_membership_invitation_id", createdAt: "i.created_at", exposeCreatedAt: true
  };
}

function roleSpec(readContext: ReadContext): ReadSpec {
  const base = { select: "r.role_id,r.tenant_id,r.ownership_class,r.role_code,r.name,r.is_baseline,r.lifecycle_state,r.created_at", from: "iam.roles r", id: "r.role_id", createdAt: "r.created_at" };
  if (readContext.kind === "tenant") return { ...base, where: "r.ownership_class='TENANT_OWNED' AND r.tenant_id=$1::uuid", values: [readContext.tenantId] };
  if (readContext.tenantId) return { ...base, where: "(r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL OR r.ownership_class='TENANT_OWNED' AND r.tenant_id=$1::uuid)", values: [readContext.tenantId] };
  return { ...base, where: "r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL", values: [] };
}

function membershipRoleSpec(tenantId: string, membershipId: string): ReadSpec {
  return {
    select: "mr.membership_role_id,mr.role_id,r.role_code,r.name AS role_name,mr.scope_kind,mr.valid_from,mr.valid_to,mr.created_at",
    from: "iam.membership_roles mr JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id AND r.ownership_class='TENANT_OWNED'",
    where: "mr.tenant_id=$1::uuid AND mr.tenant_membership_id=$2::uuid", values: [tenantId, membershipId],
    id: "mr.membership_role_id", createdAt: "mr.created_at"
  };
}

export async function administrativeRead(
  database: Kysely<FoundationDatabase>, verifier: IdentityVerifier, request: FastifyRequest,
  operation: "tenantList" | "tenantGet" | "membershipList" | "membershipGet" | "membershipRoleList" |
    "membershipInvitationList" | "membershipInvitationGet" | "roleList" | "roleGet",
  resourceId?: string
): Promise<Page | JsonRow> {
  const isList = operation.endsWith("List");
  const allowed = isList ? ["page[size]", "page[cursor]"] : [];
  if (!["tenantList", "tenantGet"].includes(operation)) allowed.push("tenant_id");
  if (operation === "roleList") allowed.push("assignable_family");
  const query = administrativeQuery(request.query, allowed);
  if (operation === "roleList" && query.assignable_family !== undefined) {
    if (query.assignable_family !== "platform") invalid("assignable_family");
    if (request.headers["x-tcdx-tenant-id"] !== undefined) denied();
    if (Object.hasOwn(query, "tenant_id") || request.body !== undefined
      || (request.headers["content-length"] !== undefined && request.headers["content-length"] !== "0")
      || request.headers["transfer-encoding"] !== undefined) invalid("tenant_id/body");
    return database.transaction().setIsolationLevel("repeatable read").execute(async transaction => {
      await sql`SET TRANSACTION READ ONLY`.execute(transaction);
      const readContext = await context(transaction, verifier, request, "platform.role.read", query, { platformOnly: true });
      const spec = roleSpec(readContext);
      spec.where += " AND r.is_baseline AND r.lifecycle_state='published' AND r.role_code=ANY($1::text[])";
      spec.values = [[...platformRoleFamilyCodes]];
      const ambiguity = await transaction.executeQuery(CompiledQuery.raw(
        `SELECT r.role_code FROM iam.roles r WHERE ${spec.where} GROUP BY r.role_code HAVING count(*)>1`, spec.values
      ));
      if (ambiguity.rows.length) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Conflicting role catalog", 409);
      return list(transaction, spec, query);
    });
  }
  const permission = operation.startsWith("tenant") ? "platform.tenant.read"
    : operation.startsWith("membershipInvitation") ? "platform.membership_invitation.read"
    : operation.startsWith("membershipRole") || operation.startsWith("membership") ? "platform.membership.read" : "platform.role.read";
  const readContext = await context(database, verifier, request, permission, query, {
    platformOnly: operation.startsWith("tenant") || operation.startsWith("membershipInvitation"),
    tenantRequired: operation.startsWith("membership")
  });
  let spec: ReadSpec;
  if (operation.startsWith("tenant")) spec = tenantSpec;
  else if (operation.startsWith("membershipInvitation")) spec = invitationSpec(readContext.tenantId!);
  else if (operation === "membershipRoleList") {
    const membershipId = uuid(resourceId, "membership_id");
    const parent = await get(database, membershipSpec(readContext.tenantId!), membershipId);
    if (parent.tenant_membership_id !== membershipId) notFound();
    spec = membershipRoleSpec(readContext.tenantId!, membershipId);
  } else if (operation.startsWith("membership")) spec = membershipSpec(readContext.tenantId!);
  else spec = roleSpec(readContext);
  if (isList) return list(database, spec, query);
  return get(database, spec, resourceId!);
}

// Executable26: target identity projection reuses canonical administrative pagination,
// ownership joins and ETag; no provider metadata or new read permission.
export async function userIdentityTenantAccessList(database: Kysely<FoundationDatabase>, identity: import("./authentication.js").VerifiedIdentity,
  target: unknown, tenantHeader: unknown, queryInput: unknown, body: unknown): Promise<Page> {
  if (tenantHeader !== undefined) denied();
  if (body !== undefined) invalid("body");
  const query = administrativeQuery(queryInput,["page[size]","page[cursor]"]);
  const id = uuid(target,"user_identity_id");
  return database.transaction().setIsolationLevel("repeatable read").execute(async tx => {
    await sql`SET TRANSACTION READ ONLY`.execute(tx);
    const actor = await resolvePlatformActor(tx,identity);
    requirePlatformAccess(actor,"platform.membership.read",actor.roles.includes("PLATFORM_ADMIN"));
    const user = await sql`SELECT 1 FROM iam.user_identities WHERE user_identity_id=${id}::uuid`.execute(tx);
    if (user.rows.length !== 1) notFound();
    return list(tx,{
      select: `m.tenant_membership_id,m.tenant_id,m.user_identity_id,m.membership_state,m.joined_at,m.ended_at,m.created_at,
        jsonb_build_object('display_name',t.display_name,'tenant_code',t.tenant_code,'lifecycle_state',t.lifecycle_state) AS tenant,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('membership_role_id',mr.membership_role_id,'role_id',r.role_id,
          'role_code',r.role_code,'role_name',r.name,'scope_kind',mr.scope_kind,'valid_from',mr.valid_from,'valid_to',mr.valid_to)
          ORDER BY r.name,mr.membership_role_id) FROM iam.membership_roles mr JOIN iam.roles r
          ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id AND r.ownership_class='TENANT_OWNED'
          WHERE mr.tenant_id=m.tenant_id AND mr.tenant_membership_id=m.tenant_membership_id AND r.lifecycle_state='published'
            AND r.role_code<>ALL(ARRAY[${platformRoleFamilyCodes.map(code => `'${code}'`).join(',')}])
            AND mr.valid_from<=transaction_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to>transaction_timestamp())),'[]'::jsonb) AS roles`,
      from: "iam.tenant_memberships m JOIN platform.tenants t ON t.tenant_id=m.tenant_id",
      where: "m.user_identity_id=$1::uuid",values: [id],id: "m.tenant_membership_id",createdAt: "m.created_at"
    },query);
  });
}
