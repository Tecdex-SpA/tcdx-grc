import { describe, expect, it, vi } from "vitest";
import { PostgresQueryCompiler, type Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { buildApp } from "../app.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import type { VerifiedIdentity } from "./authentication.js";
import { resolveTenantContext } from "./tenant-context.js";

function fixture(found = true) {
  const tenantId = newUuidV7();
  const membershipId = newUuidV7();
  const identity: VerifiedIdentity = { principalClass: "HUMAN_INTERACTIVE", principalId: newUuidV7(), tokenId: newUuidV7(), expiresAt: new Date("2099-01-01T00:00:00.000Z") };
  const compiler = new PostgresQueryCompiler();
  const executeQuery = vi.fn((query: { sql: string; parameters: readonly unknown[] }) => {
    if (!query.sql.includes("FROM iam.tenant_memberships")) throw new Error("No permission, catalog or write query expected");
    if (query.parameters[0] !== tenantId) throw new Error("No query authorized for a malformed tenant candidate");
    expect(query.parameters[1]).toBe(identity.principalId);
    expect(query.sql).toContain("membership_state='active'");
    expect(query.sql).toContain("ended_at > CURRENT_TIMESTAMP");
    return { rows: found ? [{ tenant_membership_id: membershipId }] : [] };
  });
  const database = { executeQuery, getExecutor: () => ({ transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId), executeQuery }) } as unknown as Kysely<FoundationDatabase>;
  const identityVerifier = { verifyBearerToken: vi.fn(async () => identity) };
  return { tenantId, membershipId, identity, database, executeQuery, identityVerifier };
}

describe("Contracted tenant UUID context before persistence", () => {
  it.each(["not-a-uuid", "' OR TRUE --", "../tenant", " ", "018f47f2-6170-7bd0-9d43-12f644a2b111,018f47f2-6170-7bd0-9d43-12f644a2b111", "x".repeat(4096)])("rejects malformed tenant candidate %s with 400 before SQL", async candidate => {
    const f = fixture();
    await expect(resolveTenantContext(f.database, f.identity, candidate)).rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400, retryable: false, details: { field: "X-TCDX-Tenant-Id" } });
    expect(f.executeQuery).not.toHaveBeenCalled();
  });
  it.each([undefined, ""])("keeps missing tenant context %s denied with 403", async candidate => {
    const f = fixture();
    await expect(resolveTenantContext(f.database, f.identity, candidate)).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });
    expect(f.executeQuery).not.toHaveBeenCalled();
  });
  it("keeps machine identity denied before tenant syntax or SQL", async () => {
    const f = fixture();
    await expect(resolveTenantContext(f.database, { ...f.identity, principalClass: "MACHINE_TO_MACHINE" }, "invalid"))
      .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });
    expect(f.executeQuery).not.toHaveBeenCalled();
  });
  it("resolves a valid context only from the actor's active persisted membership", async () => {
    const f = fixture();
    await expect(resolveTenantContext(f.database, f.identity, f.tenantId)).resolves.toEqual({ tenantId: f.tenantId, membershipId: f.membershipId, identity: f.identity });
    expect(f.executeQuery).toHaveBeenCalledTimes(1);
  });
  it("conceals a well-formed unavailable membership with the canonical 404", async () => {
    const f = fixture(false);
    await expect(resolveTenantContext(f.database, f.identity, f.tenantId)).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND", statusCode: 404, message: "Resource not found" });
    expect(f.executeQuery).toHaveBeenCalledTimes(1);
  });
});

describe("Tenant context validation through existing HTTP composition", () => {
  it("rejects malformed HTTP tenant context with a sanitized 400 and no SQL", async () => {
    const f = fixture();
    const app = buildApp(async () => false, { database: f.database, identityVerifier: f.identityVerifier, fileStorage: new UnavailableFileStoragePort() });
    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/compliance-methodologies", headers: { authorization: "Bearer memory-only-fixture", "x-tcdx-tenant-id": "private-malformed-candidate" } });
      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain("application/problem+json");
      expect(response.json()).toMatchObject({ code: "TCDX.VALIDATION.FAILED", correlation_id: response.headers["x-correlation-id"], retryable: false, details: { field: "X-TCDX-Tenant-Id" } });
      expect(response.body).not.toContain("private-malformed-candidate");
      expect(f.executeQuery).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
  it.each(["missing-bearer", "missing-tenant", "membership-unavailable"])("preserves %s denial precedence without a catalog read", async reason => {
    const f = fixture(reason !== "membership-unavailable");
    const app = buildApp(async () => false, { database: f.database, identityVerifier: f.identityVerifier, fileStorage: new UnavailableFileStoragePort() });
    try {
      const headers = reason === "missing-bearer" ? { "x-tcdx-tenant-id": "malformed" }
        : reason === "missing-tenant" ? { authorization: "Bearer memory-only-fixture" }
        : { authorization: "Bearer memory-only-fixture", "x-tcdx-tenant-id": f.tenantId };
      const response = await app.inject({ method: "GET", url: "/api/v1/compliance-methodologies", headers });
      expect(response.statusCode).toBe(reason === "missing-bearer" ? 401 : reason === "missing-tenant" ? 403 : 404);
      if (reason === "missing-bearer") expect(response.headers["www-authenticate"]).toBe("Bearer");
      expect(f.executeQuery).toHaveBeenCalledTimes(reason === "membership-unavailable" ? 1 : 0);
    } finally { await app.close(); }
  });
});
