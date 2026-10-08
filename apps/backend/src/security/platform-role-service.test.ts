import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PostgresQueryCompiler, type Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import type { PlatformActor } from "./platform-authority.js";
import { PlatformRoleService } from "./platform-role-service.js";

const user = newUuidV7(), target = newUuidV7(), role = newUuidV7(), assignmentId = newUuidV7(), correlation = newUuidV7();
const actor: PlatformActor = { identity: { principalClass: "HUMAN_INTERACTIVE", principalId: user, tokenId: newUuidV7(), expiresAt: new Date(Date.now() + 60000) },
  roles: ["PLATFORM_ADMIN"], permissions: new Set(["platform.role.administer"]) };
const request = { role_code: "PLATFORM_SUPPORT", reason: "Approved local role administration" };
const assignment = { platform_role_assignment_id: assignmentId, user_identity_id: target, role_id: role,
  role_code: "PLATFORM_SUPPORT", valid_from: new Date("2026-10-06T00:00:00Z"), valid_to: null };
type Query = { sql: string; parameters: readonly unknown[] };
type Result = { rows: Record<string, unknown>[]; numAffectedRows?: bigint };
function setup(override?: (query: Query) => Result | undefined) {
  const queries: Query[] = [];
  const compiler = new PostgresQueryCompiler();
  const handler = async (query: Query): Promise<Result> => {
    queries.push(query);
    const overridden = override?.(query);
    if (overridden) return overridden;
    if (query.sql.includes("SELECT role_id FROM iam.roles")) return { rows: [{ role_id: role }] };
    if (query.sql.includes("SELECT DISTINCT p.permission_code")) return { rows: [{ permission_code: "platform.role.administer", role_code: "PLATFORM_ADMIN" }] };
    if (query.sql.includes("SELECT lifecycle_state FROM iam.user_identities")) return { rows: [{ lifecycle_state: "active" }] };
    if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: newUuidV7() }] };
    if (query.sql.includes("SELECT role_id,lifecycle_state,is_baseline")) return { rows: [{ role_id: role, lifecycle_state: "published", is_baseline: true }] };
    if (query.sql.includes("SELECT pa.*")) return { rows: [{ ...assignment, is_baseline: true, role_state: "published", active: true }] };
    if (query.sql.includes("INSERT INTO iam.platform_role_assignments")) return { rows: [assignment] };
    if (query.sql.includes("UPDATE iam.platform_role_assignments")) return { rows: [{ ...assignment, valid_to: new Date("2026-10-06T01:00:00Z") }] };
    if (query.sql.includes("UPDATE ops_audit.idempotency_records")) return { rows: [], numAffectedRows: 1n };
    return { rows: [] };
  };
  const transaction = { getExecutor: () => ({ transformQuery: (node: unknown) => node, compileQuery: compiler.compileQuery.bind(compiler), executeQuery: handler }) };
  const database = { transaction: () => ({ setIsolationLevel: () => ({ execute: (fn: (tx: unknown) => unknown) => fn(transaction) }) }) } as unknown as Kysely<FoundationDatabase>;
  return { service: new PlatformRoleService(database), queries };
}

describe("approved canonical platform role administration", () => {
  it("assigns by role code and emits safe reinforced audit without tenant writes or bootstrap", async () => {
    const { service, queries } = setup();
    expect(await service.assign(actor, target, request, "local-key", correlation)).toMatchObject({ replayed: false, assignment: { user_identity_id: target } });
    expect(queries.filter(q => q.sql.includes("INSERT INTO iam.platform_role_assignments"))).toHaveLength(1);
    const audits = queries.filter(q => q.sql.includes("INSERT INTO ops_audit.audit_events"));
    expect(audits).toHaveLength(2);
    expect(JSON.stringify(audits)).toContain("audit.iam.platform_role_assignment.assign.v1");
    expect(JSON.stringify(audits)).not.toMatch(/password|tokenId|cookie|client_secret|TOTP/);
    expect(queries.some(q => /INSERT INTO iam.(tenant_memberships|membership_roles)|FIRST_PLATFORM_ADMIN_BOOTSTRAP/.test(q.sql))).toBe(false);
    expect(queries.find(q => q.sql.includes("SELECT role_id,lifecycle_state,is_baseline"))?.parameters).toContain("PLATFORM_SUPPORT");
    expect(queries[0]!.sql).toContain("FOR UPDATE");
  });
  it("closes revoke validity and emits distinct material audit", async () => {
    const { service, queries } = setup();
    expect((await service.revoke(actor, target, assignmentId, { reason: request.reason }, "local-key", correlation)).assignment.valid_to).not.toBeNull();
    expect(queries.filter(q => q.sql.includes("UPDATE iam.platform_role_assignments"))).toHaveLength(1);
    expect(JSON.stringify(queries)).toContain("audit.iam.platform_role_assignment.revoke.v1");
    expect(queries.some(q => q.sql.includes("DELETE FROM"))).toBe(false);
  });
  it.each([new Set<string>(), new Set(["platform.role.assign"]), new Set(["platform.managed_identity.administer"])])("defaults to DENY without the exact permission", async permissions => {
    const { service, queries } = setup();
    await expect(service.assign({ ...actor, permissions }, target, request, "key", correlation)).rejects.toMatchObject({ statusCode: 403 });
    expect(queries).toHaveLength(0);
  });
  it("rechecks persisted permission after acquiring the serialization lock", async () => {
    const { service, queries } = setup(q => q.sql.includes("SELECT DISTINCT p.permission_code") ? { rows: [] } : undefined);
    await expect(service.assign(actor, target, request, "key", correlation)).rejects.toMatchObject({ statusCode: 403 });
    expect(queries.some(q => q.sql.includes("INSERT INTO"))).toBe(false);
  });
  it.each([{}, { reason: "   ", role_code: "PLATFORM_SUPPORT" }, { ...request, reason: "x".repeat(2001) },
    { ...request, tenant_id: target }, { ...request, role_id: role }])("rejects invalid or caller-authority input", async input => {
    const { service, queries } = setup();
    await expect(service.assign(actor, target, input, "key", correlation)).rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED" });
    expect(queries).toHaveLength(0);
  });
  it.each([undefined, "", " ", "x".repeat(256)])("requires an idempotency key", async key => {
    await expect(setup().service.assign(actor, target, request, key as string, correlation)).rejects.toMatchObject({ statusCode: 400 });
  });
  it.each([
    ["SELECT lifecycle_state FROM iam.user_identities", "FOR UPDATE", [], "TCDX.RESOURCE.NOT_FOUND"],
    ["SELECT lifecycle_state FROM iam.user_identities", "FOR UPDATE", [{ lifecycle_state: "inactive" }], "TCDX.LIFECYCLE.TRANSITION_DENIED"],
    ["SELECT role_id,lifecycle_state,is_baseline", "", [], "TCDX.RESOURCE.NOT_FOUND"],
    ["SELECT role_id,lifecycle_state,is_baseline", "", [{ role_id: role, lifecycle_state: "draft", is_baseline: true }], "TCDX.LIFECYCLE.TRANSITION_DENIED"],
    ["SELECT role_id,lifecycle_state,is_baseline", "", [{ role_id: role, lifecycle_state: "published", is_baseline: false }], "TCDX.LIFECYCLE.TRANSITION_DENIED"],
    ["SELECT platform_role_assignment_id FROM iam.platform_role_assignments", "", [{ platform_role_assignment_id: assignmentId }], "TCDX.CONFLICT.RESOURCE"]
  ] as const)("fails closed for unavailable target/role or duplicate", async (query, qualifier, rows, code) => {
    const { service, queries } = setup(q => q.sql.includes(query) && q.sql.includes(qualifier) ? { rows: [...rows] } : undefined);
    await expect(service.assign(actor, target, request, "key", correlation)).rejects.toMatchObject({ code });
    expect(queries.some(q => q.sql.includes("INSERT INTO iam.platform_role_assignments"))).toBe(false);
  });
  it("rejects a global tenant role template despite PLATFORM_CONTROL ownership", async () => {
    await expect(setup().service.assign(actor, target, { ...request, role_code: "TENANT_ADMIN" }, "key", correlation)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("denies revoking the last distinct active Platform Admin", async () => {
    const { service, queries } = setup(q => q.sql.includes("SELECT pa.*") ? { rows: [{ ...assignment, role_code: "PLATFORM_ADMIN", active: true, role_state: "published", is_baseline: true }] }
      : q.sql.includes("count(DISTINCT") ? { rows: [{ count: 0 }] } : undefined);
    await expect(service.revoke(actor, target, assignmentId, { reason: request.reason }, "key", correlation)).rejects.toMatchObject({ code: "TCDX.CONFLICT.RESOURCE" });
    expect(queries.some(q => q.sql.includes("UPDATE iam.platform_role_assignments"))).toBe(false);
  });
  it("revokes an Admin grant when another distinct active administrator remains", async () => {
    const { service } = setup(q => q.sql.includes('SELECT pa.*') ? { rows: [{ ...assignment, role_code: 'PLATFORM_ADMIN', active: true, role_state: 'published', is_baseline: true }] }
      : q.sql.includes('count(DISTINCT') ? { rows: [{ count: 1 }] } : undefined);
    expect((await service.revoke(actor, target, assignmentId, { reason: request.reason }, 'key', correlation)).assignment.valid_to).not.toBeNull();
  });
  it.each([
    [[], 'TCDX.RESOURCE.NOT_FOUND'],
    [[{ ...assignment, active: false, is_baseline: true, role_state: 'published' }], 'TCDX.LIFECYCLE.TRANSITION_DENIED'],
    [[{ ...assignment, role_code: 'TENANT_ADMIN', active: true, is_baseline: true, role_state: 'published' }], 'TCDX.AUTHORIZATION.DENIED']
  ] as const)('rejects missing, closed or non-platform revoke targets', async (rows, code) => {
    const { service, queries } = setup(q => q.sql.includes('SELECT pa.*') ? { rows: [...rows] } : undefined);
    await expect(service.revoke(actor, target, assignmentId, { reason: request.reason }, 'key', correlation)).rejects.toMatchObject({ code });
    expect(queries.some(q => q.sql.includes('UPDATE iam.platform_role_assignments'))).toBe(false);
  });
  it("replays the original projection without consulting changed target state", async () => {
    const projection = { ...assignment, valid_from: assignment.valid_from.toISOString() };
    const { role_id: _role, ...stored } = projection;
    const sorted = (v: object) => JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))));
    const requestHash = createHash("sha256").update(`v1\0platformRoleAssign\0${sorted({ user_identity_id: target, ...request })}`).digest("hex");
    const { service, queries } = setup(q => q.sql.includes("INSERT INTO ops_audit.idempotency_records") ? { rows: [] }
      : q.sql.includes("FROM ops_audit.idempotency_records") ? { rows: [{ idempotency_record_id: assignmentId, request_hash: requestHash, result_status_code: "completed", result_ref: JSON.stringify(stored), response_hash: createHash("sha256").update(sorted(stored)).digest("hex") }] } : undefined);
    expect(await service.assign(actor, target, request, "key", correlation)).toMatchObject({ replayed: true, assignment: stored });
    expect(queries.some(q => q.sql.includes("FOR UPDATE") && q.sql.includes("user_identity_id="))).toBe(false);
    expect(queries.some(q => q.sql.includes("audit_events"))).toBe(false);
  });
  it("conflicts on the same key with a different canonical payload", async () => {
    const { service } = setup(q => q.sql.includes("INSERT INTO ops_audit.idempotency_records") ? { rows: [] }
      : q.sql.includes("FROM ops_audit.idempotency_records") ? { rows: [{ request_hash: "different" }] } : undefined);
    await expect(service.assign(actor, target, request, "key", correlation)).rejects.toMatchObject({ code: "TCDX.CONFLICT.IDEMPOTENCY" });
  });
});
