import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";

const providers = ["ZOHO", "MICROSOFT_ENTRA_ID", "GOOGLE_WORKSPACE", "TCDX_MANAGED_IDENTITY"];

describe("MI7A public authentication provider projection", () => {
  it("returns the closed safe set without authentication or secret-bearing configuration", async () => {
    const app = buildApp(async () => true, undefined, {} as never, "https://grc.tecdex.net", {} as never,
      undefined, { zohoConfigured: true, managedConfigured: true });
    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/auth/providers" });
      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      const body = response.json();
      expect(body.providers.map((entry: { provider: string }) => entry.provider)).toEqual(providers);
      expect(body.providers.map((entry: { available: boolean }) => entry.available)).toEqual([true, false, false, true]);
      expect(Object.keys(body)).toEqual(["providers"]);
      expect(JSON.stringify(body)).not.toMatch(/client|secret|issuer|token|192\.168|database|totp|tenant/i);
    } finally { await app.close(); }
  });

  it("derives false from absent configuration or unregistered browser clients", async () => {
    const app = buildApp(async () => true, undefined, undefined, undefined, undefined,
      undefined, { zohoConfigured: true, managedConfigured: true });
    try {
      expect((await app.inject("/api/v1/auth/providers")).json().providers.map((entry: { available: boolean }) => entry.available))
        .toEqual([false, false, false, false]);
    } finally { await app.close(); }
    const bare = buildApp(async () => true);
    try { expect((await bare.inject("/api/v1/auth/providers")).json().providers.every((entry: { available: boolean }) => !entry.available)).toBe(true); }
    finally { await bare.close(); }
  });

  it("rejects tenant selection, query and malformed runtime composition", async () => {
    const app = buildApp(async () => true);
    try {
      expect((await app.inject({ url: "/api/v1/auth/providers", headers: { "x-tcdx-tenant-id": "x" } })).statusCode).toBe(400);
      expect((await app.inject("/api/v1/auth/providers?provider=ZOHO")).statusCode).toBe(400);
    } finally { await app.close(); }
    const invalid = buildApp(async () => true, undefined, undefined, undefined, undefined, undefined,
      { zohoConfigured: "yes" as never, managedConfigured: false });
    try {
      const response = await invalid.inject("/api/v1/auth/providers");
      expect(response.statusCode).toBe(503);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.body).not.toContain("yes");
    } finally { await invalid.close(); }
  });

  it("does not expose a provider configuration mutation route", async () => {
    const app = buildApp(async () => true);
    try { expect((await app.inject({ method: "POST", url: "/api/v1/auth/providers", payload: {} })).statusCode).toBe(404); }
    finally { await app.close(); }
  });
});

describe("MI7A current principal authorization boundary", () => {
  it("requires an application session and rejects incompatible principals", async () => {
    const app = buildApp(async () => true, {
      database: {} as never,
      identityVerifier: { verifyBearerToken: async () => ({ principalClass: "SERVICE" as never,
        principalId: "018f47f2-6170-7bd0-9d43-12f644a2b212", tokenId: "x", expiresAt: new Date(Date.now() + 60_000) }) },
      fileStorage: new UnavailableFileStoragePort()
    });
    try {
      const missing = await app.inject("/api/v1/auth/me/authorization");
      expect(missing.statusCode).toBe(401);
      expect(missing.headers["cache-control"]).toBe("no-store");
      expect(missing.headers.vary).toContain("Authorization");
      const incompatible = await app.inject({ url: "/api/v1/auth/me/authorization", headers: { authorization: "Bearer application-token" } });
      expect(incompatible.statusCode).toBe(403);
      expect((await app.inject({ url: "/api/v1/auth/me/authorization?user_id=someone", headers: { authorization: "Bearer application-token" } })).statusCode).toBe(400);
      expect((await app.inject({ url: "/api/v1/auth/me/authorization", headers: { authorization: "Bearer application-token", "x-tcdx-tenant-id": "invalid" } })).statusCode).toBe(400);
    } finally { await app.close(); }
  });
});
