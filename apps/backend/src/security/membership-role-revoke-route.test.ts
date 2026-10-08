import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";

const mocks = vi.hoisted(() => ({
  resolvePlatformActor: vi.fn(),
  resolveCoreActor: vi.fn(),
  membershipRoleRevoke: vi.fn()
}));

vi.mock("./platform-authority.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./platform-authority.js")>(),
  resolvePlatformActor: mocks.resolvePlatformActor
}));
vi.mock("../core-grc/security.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../core-grc/security.js")>(),
  resolveCoreActor: mocks.resolveCoreActor
}));
vi.mock("./platform-iam-service.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./platform-iam-service.js")>(),
  membershipRoleRevoke: mocks.membershipRoleRevoke
}));

const assignmentId = "018f47f2-6170-7bd0-9d43-12f644a2b211";
const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b212";
const actorId = "018f47f2-6170-7bd0-9d43-12f644a2b213";
const etag = "a".repeat(64);
const identity = { principalClass: "HUMAN_INTERACTIVE" as const, principalId: actorId,
  tokenId: "route-test", expiresAt: new Date(Date.now() + 60_000) };

function appForRoute() {
  return buildApp(async () => true, {
    database: { transaction: () => ({ execute: async (operation: (transaction: unknown) => unknown) => operation({}) }) } as never,
    identityVerifier: { verifyBearerToken: async (token: string) => {
      if (token !== "authorized-test") throw new Error("Unexpected test credential");
      return identity;
    } },
    fileStorage: new UnavailableFileStoragePort()
  });
}

function request(url: string, headers: Record<string, string> = {}) {
  return { method: "POST" as const, url, headers: {
    authorization: "Bearer authorized-test", "idempotency-key": "route-test-key", "if-match": `"${etag}"`, ...headers
  }, payload: { reason: "Corregir asignación de prueba" } };
}

describe("MembershipRole revoke HTTP route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePlatformActor.mockResolvedValue({ identity, permissions: new Set(["platform.role.assign"]), roles: ["PLATFORM_ADMIN"] });
    mocks.resolveCoreActor.mockResolvedValue({ tenantId, userIdentityId: actorId, roles: ["TENANT_ADMIN"] });
    mocks.membershipRoleRevoke.mockResolvedValue({ result: { membership_role_id: assignmentId, etag }, replayed: false });
  });

  it("passes the exact UUID from request.params.id through validation for an authorized request", async () => {
    const app = appForRoute();
    try {
      const response = await app.inject(request(`/api/v1/role-assignments/${assignmentId}:revoke?tenant_id=${tenantId}`));
      expect(response.statusCode).toBe(202);
      expect(mocks.resolvePlatformActor).toHaveBeenCalledWith(expect.anything(), identity);
      expect(mocks.membershipRoleRevoke).toHaveBeenCalledWith(expect.anything(),
        expect.objectContaining({ kind: "platform", tenantId }),
        expect.objectContaining({ assignmentId, expectedEtag: etag, body: { reason: "Corregir asignación de prueba" } }));
      expect(response.json()).toMatchObject({ operation_id: "membershipRoleRevoke", resource_id: assignmentId });
    } finally { await app.close(); }
  });

  it.each([
    ["invalid assignment UUID", `/api/v1/role-assignments/not-a-uuid:revoke?tenant_id=${tenantId}`, {}, "TCDX.VALIDATION.FAILED"],
    ["missing If-Match", `/api/v1/role-assignments/${assignmentId}:revoke?tenant_id=${tenantId}`, { "if-match": "" }, "TCDX.VALIDATION.FAILED"],
    ["invalid tenant_id", `/api/v1/role-assignments/${assignmentId}:revoke?tenant_id=not-a-uuid`, {}, "TCDX.VALIDATION.FAILED"],
    ["unsupported query", `/api/v1/role-assignments/${assignmentId}:revoke?tenant_id=${tenantId}&extra=1`, {}, "TCDX.VALIDATION.FAILED"],
    ["mixed Platform and tenant authority", `/api/v1/role-assignments/${assignmentId}:revoke?tenant_id=${tenantId}`,
      { "x-tcdx-tenant-id": tenantId }, "TCDX.AUTHORIZATION.DENIED"]
  ])("rejects %s before a mutation", async (_case, url, headers, code) => {
    const app = appForRoute();
    try {
      const response = await app.inject(request(url, headers));
      expect(response.statusCode).toBe(code === "TCDX.AUTHORIZATION.DENIED" ? 403 : 400);
      expect(response.json()).toMatchObject({ code });
      expect(mocks.membershipRoleRevoke).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
