import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { FoundationError } from "../errors.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";

const mocks = vi.hoisted(() => ({ resolvePlatformActor: vi.fn() }));
vi.mock("./platform-authority.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./platform-authority.js")>(),
  resolvePlatformActor: mocks.resolvePlatformActor
}));

const target = "018f47f2-6170-7bd0-9d43-12f644a2b211";
const principal = "018f47f2-6170-7bd0-9d43-12f644a2b212";
const metadata = { user_identity_id: target, provider: "tcdx-managed-identity", issuer: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity",
  subject_reference: "018f47f2-6170-7bd0-9d43-12f644a2b213", username: "mi6-fixture@example.test",
  display_name: "Named fixture", identity_lifecycle_state: "active", enabled: true, mfa_enrolled: false };
const identity = { principalClass: "HUMAN_INTERACTIVE" as const, principalId: principal,
  tokenId: "test-token", expiresAt: new Date(Date.now() + 60_000) };

function setup() {
  const service = {
    list: vi.fn().mockResolvedValue({ items: [metadata], page: { has_more: false, next_cursor: null } }),
    read: vi.fn().mockResolvedValue(metadata),
    provision: vi.fn().mockResolvedValue({ identity: metadata, credential_disclosed: true,
      temporary_credential: "test-value-never-persisted", replayed: false }),
    disable: vi.fn().mockResolvedValue({ identity: { ...metadata, enabled: false }, replayed: false }),
    enable: vi.fn().mockResolvedValue({ identity: metadata, replayed: false }),
    passwordReset: vi.fn().mockResolvedValue({ identity: metadata, credential_disclosed: false, replayed: true }),
    mfaReset: vi.fn().mockResolvedValue({ identity: metadata, replayed: false }),
    sessionRevoke: vi.fn().mockResolvedValue({ identity: metadata, replayed: false })
  };
  const database = {} as never;
  const identityVerifier = { verifyBearerToken: async () => identity };
  const app = buildApp(async () => true,
    { database, identityVerifier, fileStorage: new UnavailableFileStoragePort() }, undefined,
    "https://grc.tecdex.net", undefined, service as never);
  return { app, service };
}

const operations = [
  ["GET", "/api/v1/platform/managed-identities", "list"],
  ["GET", `/api/v1/platform/managed-identities/${target}`, "read"],
  ["POST", "/api/v1/platform/managed-identities", "provision"],
  ["POST", `/api/v1/platform/managed-identities/${target}:disable`, "disable"],
  ["POST", `/api/v1/platform/managed-identities/${target}:enable`, "enable"],
  ["POST", `/api/v1/platform/managed-identities/${target}:password-reset`, "passwordReset"],
  ["POST", `/api/v1/platform/managed-identities/${target}:mfa-reset`, "mfaReset"],
  ["POST", `/api/v1/platform/managed-identities/${target}/sessions:revoke`, "sessionRevoke"]
] as const;

function input(method: "GET" | "POST", url: string, extra: Record<string, string> = {}) {
  return { method, url, headers: { authorization: "Bearer route-test", "idempotency-key": "route-test-key", ...extra },
    ...(method === "POST" ? { payload: url.endsWith("/managed-identities")
      ? { display_name: "Named fixture", username: "mi6-fixture@example.test", person_verification_ref: "test-ref" }
      : url.endsWith(":password-reset") ? { reason: "Security recovery", person_verification_ref: "test-ref" }
      : { reason: "Security recovery" } } : {}) };
}

describe("Managed Identity Platform routes", () => {
  beforeEach(() => {
    mocks.resolvePlatformActor.mockReset();
    mocks.resolvePlatformActor.mockResolvedValue({ identity, roles: ["PLATFORM_ADMIN"],
      permissions: new Set(["platform.managed_identity.read", "platform.managed_identity.create", "platform.managed_identity.administer"]) });
  });

  it.each(operations)("routes %s %s to %s", async (method, url, operation) => {
    const { app, service } = setup();
    try {
      const response = await app.inject(input(method, url));
      expect(response.statusCode).toBe(method === "POST" && operation === "provision" ? 201 : 200);
      expect(service[operation]).toHaveBeenCalledOnce();
      if (operation === "provision" || operation === "passwordReset") {
        expect(response.headers["cache-control"]).toBe("no-store");
      }
    } finally { await app.close(); }
  });

  it("rejects tenant header on every operation before reaching the service", async () => {
    const { app, service } = setup();
    try {
      for (const [method, url, operation] of operations) {
        const response = await app.inject(input(method, url, { "x-tcdx-tenant-id": target }));
        expect(response.statusCode).toBe(403);
        expect(service[operation]).not.toHaveBeenCalled();
      }
    } finally { await app.close(); }
  });

  it("has no delete, link, unlink, impersonation or generic proxy route", async () => {
    const { app } = setup();
    try {
      for (const url of [`/api/v1/platform/managed-identities/${target}`, `/api/v1/platform/managed-identities/${target}:link`,
        `/api/v1/platform/managed-identities/${target}:unlink`, `/api/v1/platform/managed-identities/${target}:impersonate`,
        "/api/v1/platform/managed-identities/admin-proxy"]) {
        const response = await app.inject({ method: "DELETE", url, headers: { authorization: "Bearer route-test" } });
        expect(response.statusCode).toBe(404);
      }
      for (const url of [`/api/v1/platform/managed-identities/${target}:link`,
        `/api/v1/platform/managed-identities/${target}:unlink`, `/api/v1/platform/managed-identities/${target}:impersonate`,
        "/api/v1/platform/managed-identities/admin-proxy", "/api/v1/platform/managed-identities/realm-admin",
        "/api/v1/platform/managed-identities/client-admin"]) {
        const response = await app.inject({ method: "POST", url, headers: { authorization: "Bearer route-test" }, payload: {} });
        expect(response.statusCode).toBe(404);
      }
    } finally { await app.close(); }
  });

  it("keeps a recovery error out of HTTP caches", async () => {
    const { app, service } = setup();
    service.provision.mockRejectedValueOnce(new FoundationError("TCDX.CONFLICT.RECOVERY_REQUIRED",
      "Manual recovery required", 409));
    try {
      const response = await app.inject(input("POST", "/api/v1/platform/managed-identities"));
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED", retryable: false });
    } finally { await app.close(); }
  });
});
