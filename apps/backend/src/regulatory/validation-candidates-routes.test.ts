import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { FoundationError } from "../errors.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { parseValidationAccessCandidateQuery } from "./validation-candidates.js";

const mocks = vi.hoisted(() => ({ resolvePlatformActor: vi.fn(), listCandidates: vi.fn() }));
vi.mock("../security/platform-authority.js", async (original) => ({
  ...await original<typeof import("../security/platform-authority.js")>(),
  resolvePlatformActor: mocks.resolvePlatformActor
}));
vi.mock("./validation-candidates.js", async (original) => ({
  ...await original<typeof import("./validation-candidates.js")>(),
  listValidationAccessCandidates: mocks.listCandidates
}));

const id = "018f47f2-6170-7bd0-9d43-12f644a2b213";
const versionId = "018f47f2-6170-7bd0-9d43-12f644a2b214";
const provenanceId = "018f47f2-6170-7bd0-9d43-12f644a2b215";
const identity = { principalClass: "HUMAN_INTERACTIVE" as const, principalId: id,
  tokenId: "candidate-route-test", expiresAt: new Date(Date.now() + 60_000) };
const candidate = {
  regulatory_pack_version_id: versionId, regulatory_pack_validation_provenance_id: provenanceId,
  pack_code: "ISO_9001_2026", name: "ISO 9001", edition: "2026",
  license_classification: "NOT_YET_LICENSED", version_state: "draft", pack_state: "draft",
  authority_class: "NON_AUTHORITATIVE_TEST_PACK", source_role: "provisional_supporting_reference",
  provenance_ref: "catalog-provenance", version_effective_from: null, version_effective_to: null
};

function appForRoute(runtimeEnvironment: "qa" | "production" = "qa", verified = true) {
  return buildApp(async () => true, {
    database: {} as never,
    identityVerifier: { verifyBearerToken: async () => verified ? identity : null as never },
    fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment
  });
}

const url = "/api/v1/platform/regulatory-pack-validation-candidates";
const headers = { authorization: "Bearer test" };

describe("validationAccessCandidateList HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePlatformActor.mockResolvedValue({ identity, roles: ["PLATFORM_ADMIN"],
      permissions: new Set(["platform.regulatory_pack_validation_access.read"]) });
    mocks.listCandidates.mockImplementation(async (_db, query, environment) => {
      if (environment === "production") throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
      parseValidationAccessCandidateQuery(query);
      return { items: [candidate], page: { has_more: false, next_cursor: null } };
    });
  });

  it("returns the exact metadata-only candidate page for Platform Admin in QA", async () => {
    const app = appForRoute();
    try {
      const response = await app.inject({ method: "GET", url, headers });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ items: [candidate], page: { has_more: false, next_cursor: null } });
      expect(Object.keys(response.json().items[0]).sort()).toEqual(Object.keys(candidate).sort());
      expect(mocks.listCandidates).toHaveBeenCalledWith(expect.anything(), {}, "qa");
    } finally { await app.close(); }
  });

  it("fails closed for unauthenticated, non-platform, Tenant Admin, absent permission and tenant context", async () => {
    const app = appForRoute();
    try {
      expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
      mocks.resolvePlatformActor.mockRejectedValueOnce(new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403));
      expect((await app.inject({ method: "GET", url, headers })).statusCode).toBe(403);
      mocks.resolvePlatformActor.mockResolvedValueOnce({ identity, roles: ["TENANT_ADMIN"],
        permissions: new Set(["platform.regulatory_pack_validation_access.read"]) });
      expect((await app.inject({ method: "GET", url, headers })).statusCode).toBe(403);
      mocks.resolvePlatformActor.mockResolvedValueOnce({ identity, roles: ["PLATFORM_ADMIN"], permissions: new Set() });
      expect((await app.inject({ method: "GET", url, headers })).statusCode).toBe(403);
      expect((await app.inject({ method: "GET", url, headers: { ...headers, "x-tcdx-tenant-id": id } })).statusCode).toBe(403);
      expect(mocks.listCandidates).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it("denies production even for a Platform Admin", async () => {
    const app = appForRoute("production");
    try {
      expect((await app.inject({ method: "GET", url, headers })).statusCode).toBe(403);
      expect(mocks.listCandidates).toHaveBeenCalledWith(expect.anything(), {}, "production");
    } finally { await app.close(); }
  });

  it.each([
    ["unknown query", "?filter[tenant_id]=foreign"],
    ["malformed instant", "?filter[effective_from]=2026-09-30"],
    ["invalid cursor", "?page[cursor]=invalid"],
    ["zero size", "?page[size]=0"],
    ["oversized page", "?page[size]=101"]
  ])("returns 400 for %s", async (_label, suffix) => {
    const app = appForRoute();
    try { expect((await app.inject({ method: "GET", url: url + suffix, headers })).statusCode).toBe(400); }
    finally { await app.close(); }
  });
});
