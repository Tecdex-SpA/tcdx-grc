import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { FoundationError } from "../errors.js";

const mocks = vi.hoisted(() => ({ resolvePlatformActor: vi.fn(), resolveCoreActor: vi.fn(), revokePack: vi.fn(), listPackAssignments: vi.fn() }));
vi.mock("../security/platform-authority.js", async (original) => ({
  ...await original<typeof import("../security/platform-authority.js")>(), resolvePlatformActor: mocks.resolvePlatformActor
}));
vi.mock("./pack-contract.js", async (original) => ({
  ...await original<typeof import("./pack-contract.js")>(), revokePack: mocks.revokePack, listPackAssignments: mocks.listPackAssignments
}));
vi.mock("../core-grc/security.js", async (original) => ({
  ...await original<typeof import("../core-grc/security.js")>(), resolveCoreActor: mocks.resolveCoreActor
}));

const id = "018f47f2-6170-7bd0-9d43-12f644a2b211";
const actorId = "018f47f2-6170-7bd0-9d43-12f644a2b213";
const identity = { principalClass: "HUMAN_INTERACTIVE" as const, principalId: actorId,
  tokenId: "route-test", expiresAt: new Date(Date.now() + 60_000) };

function appForRoute() {
  return buildApp(async () => true, {
    database: { transaction: () => ({ execute: async (operation: (transaction: unknown) => unknown) => operation({}) }) } as never,
    identityVerifier: { verifyBearerToken: async () => identity },
    fileStorage: new UnavailableFileStoragePort()
  });
}

describe("SubscriptionRegulatoryPack revoke route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePlatformActor.mockResolvedValue({ identity, permissions: new Set(["platform.subscription_regulatory_pack.read", "platform.subscription_regulatory_pack.archive"]), roles: ["PLATFORM_ADMIN"] });
    mocks.revokePack.mockResolvedValue({ result: { subscription_regulatory_pack_id: id, row_version: 2 }, replayed: false });
    mocks.listPackAssignments.mockResolvedValue({ items: [], page: { has_more: false, next_cursor: null } });
    mocks.resolveCoreActor.mockResolvedValue({ tenantId: id, roles: ["TENANT_ADMIN"],
      permissions: new Set(["platform.subscription_regulatory_pack.read"]),
      permissionScopes: new Map([["platform.subscription_regulatory_pack.read", new Set(["tenant"])]]) });
  });
  it("extracts the exact UUID from the literal :revoke route", async () => {
    const app = appForRoute();
    try {
      const response = await app.inject({ method: "POST", url: `/api/v1/subscription-regulatory-packs/${id}:revoke`,
        headers: { authorization: "Bearer test", "if-match": '"1"', "idempotency-key": "revoke-once" }, payload: { reason: "Contrato terminado" } });
      expect(response.statusCode).toBe(202);
      expect(mocks.revokePack).toHaveBeenCalledWith(expect.anything(), expect.anything(),
        expect.objectContaining({ assignmentId: id, expectedVersion: 1 }));
    } finally { await app.close(); }
  });
  it.each([
    ["invalid UUID", `/api/v1/subscription-regulatory-packs/invalid:revoke`, {}, 400],
    ["missing If-Match", `/api/v1/subscription-regulatory-packs/${id}:revoke`, { "if-match": "" }, 400],
    ["tenant header", `/api/v1/subscription-regulatory-packs/${id}:revoke`, { "x-tcdx-tenant-id": id }, 403]
  ])("denies %s before mutation", async (_name, url, headers, status) => {
    const app = appForRoute();
    try {
      const response = await app.inject({ method: "POST", url,
        headers: { authorization: "Bearer test", "if-match": '"1"', "idempotency-key": "revoke-once", ...headers },
        payload: { reason: "Contrato terminado" } });
      expect(response.statusCode).toBe(status);
      expect(mocks.revokePack).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("allows Platform Admin and own Tenant Admin reads, while denying other tenant and absent grants", async () => {
    const app = appForRoute();
    try {
      const url = `/api/v1/subscriptions/${id}/regulatory-packs`;
      expect((await app.inject({ method: "GET", url, headers: { authorization: "Bearer test" } })).statusCode).toBe(200);
      expect(mocks.listPackAssignments).toHaveBeenLastCalledWith(expect.anything(), id, undefined, {});
      expect((await app.inject({ method: "GET", url, headers: { authorization: "Bearer test", "x-tcdx-tenant-id": id } })).statusCode).toBe(200);
      expect(mocks.listPackAssignments).toHaveBeenLastCalledWith(expect.anything(), id, id, {});
      mocks.listPackAssignments.mockRejectedValueOnce(new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404));
      expect((await app.inject({ method: "GET", url, headers: { authorization: "Bearer test", "x-tcdx-tenant-id": id } })).statusCode).toBe(404);
      mocks.resolveCoreActor.mockResolvedValueOnce({ tenantId: id, roles: ["TENANT_ADMIN"], permissions: new Set(), permissionScopes: new Map() });
      expect((await app.inject({ method: "GET", url, headers: { authorization: "Bearer test", "x-tcdx-tenant-id": id } })).statusCode).toBe(403);
      mocks.resolvePlatformActor.mockResolvedValueOnce({ identity, permissions: new Set(), roles: ["PLATFORM_ADMIN"] });
      expect((await app.inject({ method: "GET", url, headers: { authorization: "Bearer test" } })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url,
        headers: { authorization: "Bearer test", "x-tcdx-tenant-id": id, "idempotency-key": "tenant-denied" },
        payload: { regulatory_pack_version_id: id, effective_from: new Date().toISOString() } })).statusCode).toBe(403);
    } finally { await app.close(); }
  });
});
