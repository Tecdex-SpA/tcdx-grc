import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PostgresQueryCompiler, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { PlatformActor } from "./platform-authority.js";
import { membershipInvitationCreate, membershipInvitationRevoke } from "./platform-iam-service.js";
import { acceptMembershipInvitation } from "./oidc-browser.js";

type Query = { sql: string; parameters: readonly unknown[] };
type QueryResult = { rows: Record<string, unknown>[]; numAffectedRows?: bigint };

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b211";
const membershipId = "018f47f2-6170-7bd0-9d43-12f644a2b212";
const actorId = "018f47f2-6170-7bd0-9d43-12f644a2b213";
const invitationId = "018f47f2-6170-7bd0-9d43-12f644a2b214";
const correlationId = "018f47f2-6170-7bd0-9d43-12f644a2b215";

const actor: PlatformActor = {
  identity: { principalClass: "HUMAN_INTERACTIVE", principalId: actorId, tokenId: membershipId, expiresAt: new Date(Date.now() + 60_000) },
  permissions: new Set(["platform.membership_invitation.create", "platform.membership_invitation.update"]),
  roles: ["PLATFORM_ADMIN"]
};

function executor(handler: (query: Query) => QueryResult | Promise<QueryResult>) {
  const compiler = new PostgresQueryCompiler();
  const queryExecutor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
    executeQuery: handler
  };
  return { executeQuery: handler, getExecutor: () => queryExecutor } as unknown as Transaction<FoundationDatabase>;
}

function projection(state = "pending", version = 1) {
  return {
    tenant_membership_invitation_id: invitationId, tenant_id: tenantId, invitee_email: "reviewer@example.test",
    authentication_method: "ZOHO", lifecycle_state: state, expires_at: new Date(Date.now() + 86_400_000),
    accepted_at: null, tenant_membership_id: null, revoked_at: state === "revoked" ? new Date() : null, row_version: String(version)
  };
}

function code(error: unknown): string | undefined { return error instanceof FoundationError ? error.code : undefined; }

describe("canonical membership invitations", () => {
  it("creates a 256-bit one-time token while persisting only its digest", async () => {
    const queries: Query[] = [];
    const transaction = executor((query) => {
      queries.push(query);
      if (query.sql.includes("FROM platform.tenants")) return { rows: [{ tenant_id: tenantId }] };
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: invitationId }] };
      if (query.sql.includes("SELECT tenant_membership_invitation_id,tenant_id")) return { rows: [projection()] };
      if (query.sql.includes("UPDATE ops_audit.idempotency_records")) return { rows: [], numAffectedRows: 1n };
      return { rows: [] };
    });

    const result = await membershipInvitationCreate(transaction, actor, {
      body: { tenant_id: tenantId, invitee_email: "Reviewer@Example.Test", authentication_method: "ZOHO" },
      key: "invite-key", correlationId
    });

    expect(result.replayed).toBe(false);
    expect(result.invitationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.result.invitee_email).toBe("reviewer@example.test");
    const insert = queries.find(({ sql }) => sql.includes("INSERT INTO iam.tenant_membership_invitations"));
    expect(insert).toBeTruthy();
    expect(insert?.parameters).not.toContain(result.invitationToken);
    expect(insert?.parameters.some((value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value))).toBe(true);
    expect(queries.filter(({ sql }) => sql.includes("INSERT INTO ops_audit.audit_events"))).toHaveLength(2);
    expect(queries.filter(({ sql }) => sql.includes("INSERT INTO ops_audit.outbox_events"))).toHaveLength(1);
  });

  it("rejects unapproved authentication methods and default-denies missing permission", async () => {
    await expect(membershipInvitationCreate({} as never, actor, {
      body: { tenant_id: tenantId, invitee_email: "reviewer@example.test", authentication_method: "LOCAL" }, key: "x", correlationId
    })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");
    await expect(membershipInvitationCreate({} as never, { ...actor, permissions: new Set() }, {
      body: { tenant_id: tenantId, invitee_email: "reviewer@example.test", authentication_method: "ZOHO" }, key: "x", correlationId
    })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHORIZATION.DENIED");
    await expect(membershipInvitationCreate({} as never, { ...actor, roles: [] }, {
      body: { tenant_id: tenantId, invitee_email: "reviewer@example.test", authentication_method: "ZOHO" }, key: "x", correlationId
    })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHORIZATION.DENIED");
  });

  it("replays create without reproducing the one-time clear token or side effects", async () => {
    const statements: string[] = [];
    const body = { tenant_id: tenantId, invitee_email: "reviewer@example.test", authentication_method: "ZOHO" };
    const requestHash = createHash("sha256").update(JSON.stringify(body, Object.keys(body).sort())).digest("hex");
    const transaction = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("FROM platform.tenants")) return { rows: [{ tenant_id: tenantId }] };
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [] };
      if (query.sql.includes("FROM ops_audit.idempotency_records")) return { rows: [{
        idempotency_record_id: invitationId, request_hash: requestHash, result_status_code: "completed",
        result_ref: `membership-invitation:${invitationId}`, response_hash: "b".repeat(64)
      }] };
      if (query.sql.includes("SELECT tenant_membership_invitation_id,tenant_id")) return { rows: [projection()] };
      return { rows: [] };
    });
    const result = await membershipInvitationCreate(transaction, actor, { body, key: "invite-key", correlationId });
    expect(result).toMatchObject({ replayed: true, invitationToken: null });
    expect(statements.some((statement) => statement.includes("INSERT INTO iam.tenant_membership_invitations"))).toBe(false);
    expect(statements.some((statement) => statement.includes("INSERT INTO ops_audit.audit_events"))).toBe(false);
    expect(statements.some((statement) => statement.includes("INSERT INTO ops_audit.outbox_events"))).toBe(false);
  });

  it("revokes only the matching pending row version and emits one material fact", async () => {
    const statements: string[] = [];
    const transaction = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("SELECT tenant_id FROM iam.tenant_membership_invitations")) return { rows: [{ tenant_id: tenantId }] };
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: invitationId }] };
      if (query.sql.includes("SELECT lifecycle_state,(expires_at>transaction_timestamp()) AS unexpired,row_version")) return { rows: [{ lifecycle_state: "pending", unexpired: true, row_version: "1" }] };
      if (query.sql.includes("SELECT tenant_membership_invitation_id,tenant_id")) return { rows: [projection("revoked", 2)] };
      if (query.sql.includes("UPDATE ops_audit.idempotency_records")) return { rows: [], numAffectedRows: 1n };
      return { rows: [], numAffectedRows: 1n };
    });
    const result = await membershipInvitationRevoke(transaction, actor, {
      invitationId, body: { reason: "Dirección incorrecta" }, key: "revoke-key", correlationId, expectedVersion: 1
    });
    expect(result.result).toMatchObject({ lifecycle_state: "revoked", row_version: 2 });
    expect(statements.filter((statement) => statement.includes("UPDATE iam.tenant_membership_invitations"))).toHaveLength(1);
    expect(statements.filter((statement) => statement.includes("INSERT INTO ops_audit.audit_events"))).toHaveLength(2);
    expect(statements.filter((statement) => statement.includes("INSERT INTO ops_audit.outbox_events"))).toHaveLength(1);
  });

  it.each([
    [{ lifecycle_state: "pending", unexpired: false, row_version: "1" }, 1, "TCDX.LIFECYCLE.INVALID_TRANSITION"],
    [{ lifecycle_state: "accepted", unexpired: true, row_version: "1" }, 1, "TCDX.LIFECYCLE.INVALID_TRANSITION"],
    [{ lifecycle_state: "pending", unexpired: true, row_version: "2" }, 1, "TCDX.CONFLICT.CONCURRENCY"]
  ])("rejects expired, consumed and stale revocation without mutation", async (current, expectedVersion, expectedCode) => {
    const statements: string[] = [];
    const transaction = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("SELECT tenant_id FROM iam.tenant_membership_invitations")) return { rows: [{ tenant_id: tenantId }] };
      if (query.sql.includes("INSERT INTO ops_audit.idempotency_records")) return { rows: [{ idempotency_record_id: invitationId }] };
      if (query.sql.includes("SELECT lifecycle_state,(expires_at>transaction_timestamp()) AS unexpired,row_version")) return { rows: [current] };
      return { rows: [] };
    });
    await expect(membershipInvitationRevoke(transaction, actor, {
      invitationId, body: {}, key: `revoke-${current.lifecycle_state}-${current.unexpired}-${current.row_version}`,
      correlationId, expectedVersion
    })).rejects.toSatisfy((error: unknown) => code(error) === expectedCode);
    expect(statements.some((statement) => statement.includes("UPDATE iam.tenant_membership_invitations"))).toBe(false);
    expect(statements.some((statement) => statement.includes("INSERT INTO ops_audit.audit_events"))).toBe(false);
    expect(statements.some((statement) => statement.includes("INSERT INTO ops_audit.outbox_events"))).toBe(false);
  });

  it("accepts under lock, resolves identity independently of email, creates one membership and no role", async () => {
    const statements: string[] = [];
    const transaction = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("FROM iam.tenant_membership_invitations") && query.sql.includes("FOR UPDATE")) return { rows: [{
        tenant_membership_invitation_id: invitationId, tenant_id: tenantId, invitee_email: "reviewer@example.test",
        authentication_method: "ZOHO", lifecycle_state: "pending", unexpired: true
      }] };
      if (query.sql.includes("INSERT INTO iam.tenant_memberships")) return { rows: [{ tenant_membership_id: membershipId }], numAffectedRows: 1n };
      if (query.sql.includes("UPDATE iam.tenant_membership_invitations")) return { rows: [], numAffectedRows: 1n };
      return { rows: [] };
    });
    const identities = { resolveOrCreate: async () => ({ userIdentityId: actorId }) };
    const identity = await acceptMembershipInvitation(transaction, identities, {
      issuer: "https://accounts.zoho.test", subject: "stable-subject", email: "reviewer@example.test", displayName: "Reviewer"
    }, { invitationId, tokenDigest: "a".repeat(64) }, correlationId);
    expect(identity.userIdentityId).toBe(actorId);
    expect(statements.filter((statement) => statement.includes("INSERT INTO iam.tenant_memberships"))).toHaveLength(1);
    expect(statements.some((statement) => statement.includes("INSERT INTO iam.membership_roles"))).toBe(false);
    expect(statements.filter((statement) => statement.includes("INSERT INTO ops_audit.audit_events"))).toHaveLength(1);
    expect(statements.filter((statement) => statement.includes("INSERT INTO ops_audit.outbox_events"))).toHaveLength(2);
  });

  it("fails invitation acceptance before identity materialization when the Zoho email mismatches", async () => {
    let identityCalls = 0;
    const transaction = executor((query) => query.sql.includes("FROM iam.tenant_membership_invitations") ? { rows: [{
      tenant_membership_invitation_id: invitationId, tenant_id: tenantId, invitee_email: "reviewer@example.test",
      authentication_method: "ZOHO", lifecycle_state: "pending", unexpired: true
    }] } : { rows: [] });
    const identities = { resolveOrCreate: async () => { identityCalls += 1; return { userIdentityId: actorId }; } };
    await expect(acceptMembershipInvitation(transaction, identities, {
      issuer: "https://accounts.zoho.test", subject: "stable-subject", email: "other@example.test", displayName: "Reviewer"
    }, { invitationId, tokenDigest: "a".repeat(64) }, correlationId)).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHENTICATION.INVALID");
    expect(identityCalls).toBe(0);
  });

  it("rejects expired and consumed invitation replays before identity materialization", async () => {
    for (const invitation of [
      { lifecycle_state: "pending", unexpired: false },
      { lifecycle_state: "accepted", unexpired: true }
    ]) {
      let identityCalls = 0;
      const transaction = executor((query) => query.sql.includes("FROM iam.tenant_membership_invitations") ? { rows: [{
        tenant_membership_invitation_id: invitationId, tenant_id: tenantId, invitee_email: "reviewer@example.test",
        authentication_method: "ZOHO", ...invitation
      }] } : { rows: [] });
      const identities = { resolveOrCreate: async () => { identityCalls += 1; return { userIdentityId: actorId }; } };
      await expect(acceptMembershipInvitation(transaction, identities, {
        issuer: "https://accounts.zoho.test", subject: "stable-subject", email: "reviewer@example.test", displayName: "Reviewer"
      }, { invitationId, tokenDigest: "a".repeat(64) }, correlationId)).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHENTICATION.INVALID");
      expect(identityCalls).toBe(0);
    }
  });
});
