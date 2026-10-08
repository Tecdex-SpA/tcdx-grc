import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("foundation runtime configuration", () => {
  it.each(["OIDC", "ADMIN"] as const)("fails closed for absent, empty, unprotected or inline %s secrets", (provider) => {
    const directory = mkdtempSync(join(tmpdir(), "tcdx-mi8a-config-"));
    const file = join(directory, "protected-secret");
    const key = `MANAGED_IDENTITY_${provider}_CLIENT_SECRET`;
    const environment = {
      DATABASE_USER: "isolated-test-user",
      APP_JWT_PRIVATE_KEY: ["isolated", "private", "fixture"].join("-"),
      APP_JWT_PUBLIC_KEY: "isolated-public-fixture",
      ...(provider === "OIDC" ? {
        MANAGED_IDENTITY_OIDC_ISSUER: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity",
        MANAGED_IDENTITY_OIDC_CLIENT_ID: "tcdx-grc",
        MANAGED_IDENTITY_OIDC_REDIRECT_URI: "https://grc.tecdex.net/auth/callback"
      } : {
        MANAGED_IDENTITY_ADMIN_BASE_URL: "http://192.168.2.46:8180",
        MANAGED_IDENTITY_ADMIN_CLIENT_ID: "tcdx-grc-managed-identity-provisioner"
      }),
      [`${key}_FILE`]: file
    };
    try {
      expect(() => loadConfig(environment)).toThrow("protected secret-backed configuration");
      writeFileSync(file, " \n", { mode: 0o600 });
      expect(() => loadConfig(environment)).toThrow("protected secret-backed configuration");
      writeFileSync(file, ["isolated", "test", "fixture"].join("-"));
      chmodSync(file, 0o644);
      expect(() => loadConfig(environment)).toThrow("protected secret-backed configuration");
      chmodSync(file, 0o600);
      const valid = loadConfig(environment);
      expect(provider === "OIDC" ? valid.managedIdentityOidc.configured : valid.managedIdentityAdmin.configured).toBe(true);
      expect(() => loadConfig({ ...environment, [key]: "inline-fixture" })).toThrow("must use");
      expect(() => loadConfig({ ...environment, [`${key}_FILE`]: directory })).toThrow("protected secret-backed configuration");
      expect(() => loadConfig({ ...environment, [`${key}_FILE`]: undefined })).toThrow("Incomplete Managed Identity");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it("keeps canonical database and AI identities", () => {
    const config = loadConfig({ DATABASE_USER: "secret-reference" });
    expect(config.database).toMatchObject({ host: "192.168.2.40", name: "tcdx-grc", sslMode: "require" });
    expect(config.aiServiceOrigin).toBe("https://ia2.tcdx.int");
  });

  it("rejects a non-canonical database and incomplete security configuration", () => {
    expect(() => loadConfig({ DATABASE_USER: "secret-reference", DATABASE_NAME: "other" })).toThrow("Database identity must be tcdx-grc");
    expect(() => loadConfig({ DATABASE_USER: "secret-reference", OIDC_ISSUER: "https://issuer.example" })).toThrow("Incomplete OIDC configuration");
  });

  it("requires OIDC and application JWT as one complete fail-closed boundary", () => {
    expect(() => loadConfig({
      DATABASE_USER: "secret-reference",
      OIDC_ISSUER: "https://issuer.example",
      OIDC_CLIENT_ID: "client",
      OIDC_CLIENT_SECRET: "secret",
      OIDC_REDIRECT_URI: "https://api.example/auth/callback",
      OIDC_SCOPES: "openid profile email",
      OIDC_ALLOWED_ALGORITHMS: "RS256",
      OIDC_TOKEN_ENDPOINT_AUTH_METHOD: "client_secret_post"
    })).toThrow("OIDC requires a complete TCDX application JWT configuration");
  });

  it("derives the approved OIDC and application-token runtime defaults", () => {
    const config = loadConfig({
      DATABASE_USER: "secret-reference",
      OIDC_ISSUER: "https://issuer.example",
      OIDC_CLIENT_ID: "client",
      OIDC_CLIENT_SECRET: "secret",
      OIDC_REDIRECT_URI: "https://api.example/auth/callback",
      APP_JWT_PRIVATE_KEY: ["private", "key", "material"].join("-"),
      APP_JWT_PUBLIC_KEY: "public-key-material"
    });
    expect(config.oidc).toMatchObject({
      scopes: ["openid", "profile", "email"],
      allowedAlgorithms: ["RS256"],
      tokenEndpointAuthMethod: "client_secret_post"
    });
    expect(config.applicationJwt).toMatchObject({
      issuer: "https://grc-bk.tcdx.int",
      audience: "tcdx-grc-api",
      algorithm: "RS256",
      maxLifetimeSeconds: 300,
      clockToleranceSeconds: 5
    });
    expect(config.applicationJwt.keyId).toMatch(/^tcdx-[0-9a-f]{16}$/);
  });

  it("rejects an unapproved OIDC token-endpoint client authentication method", () => {
    expect(() => loadConfig({
      DATABASE_USER: "secret-reference",
      OIDC_ISSUER: "https://issuer.example",
      OIDC_CLIENT_ID: "client",
      OIDC_CLIENT_SECRET: "secret",
      OIDC_REDIRECT_URI: "https://api.example/auth/callback",
      OIDC_SCOPES: "openid profile email",
      OIDC_ALLOWED_ALGORITHMS: "RS256",
      OIDC_TOKEN_ENDPOINT_AUTH_METHOD: "none",
      APP_JWT_ISSUER: "https://tokens.example",
      APP_JWT_AUDIENCE: "tcdx-grc-api",
      APP_JWT_PRIVATE_KEY: ["test", "private", "reference"].join("-"),
      APP_JWT_PUBLIC_KEY: ["test", "public", "reference"].join("-"),
      APP_JWT_KEY_ID: "test-key",
      APP_JWT_ALGORITHM: "RS256",
      APP_JWT_MAX_LIFETIME_SECONDS: "300",
      APP_JWT_CLOCK_TOLERANCE_SECONDS: "5"
    })).toThrow("OIDC_TOKEN_ENDPOINT_AUTH_METHOD is unauthorized");
  });

  it("requires the OIDC scope that produces an identity proof", () => {
    expect(() => loadConfig({
      DATABASE_USER: "secret-reference",
      OIDC_ISSUER: "https://issuer.example",
      OIDC_CLIENT_ID: "client",
      OIDC_CLIENT_SECRET: "secret",
      OIDC_REDIRECT_URI: "https://api.example/auth/callback",
      OIDC_SCOPES: "profile email",
      OIDC_ALLOWED_ALGORITHMS: "RS256",
      OIDC_TOKEN_ENDPOINT_AUTH_METHOD: "client_secret_post",
      APP_JWT_ISSUER: "https://tokens.example",
      APP_JWT_AUDIENCE: "tcdx-grc-api",
      APP_JWT_PRIVATE_KEY: ["test", "private", "reference"].join("-"),
      APP_JWT_PUBLIC_KEY: ["test", "public", "reference"].join("-"),
      APP_JWT_KEY_ID: "test-key",
      APP_JWT_ALGORITHM: "RS256",
      APP_JWT_MAX_LIFETIME_SECONDS: "300",
      APP_JWT_CLOCK_TOLERANCE_SECONDS: "5"
    })).toThrow("OIDC_SCOPES must include openid");
  });

  it("requires the exact Managed Identity issuer, client, callback and protected secret file", () => {
    const directory = mkdtempSync(join(tmpdir(), "tcdx-mi5-config-"));
    const secretFile = join(directory, "client-secret");
    const fixture = ["isolated", "test", "fixture"].join("-");
    writeFileSync(secretFile, fixture, { mode: 0o600 });
    const environment = {
      DATABASE_USER: "isolated-test-user",
      APP_JWT_PRIVATE_KEY: ["isolated", "test", "private-key"].join("-"),
      APP_JWT_PUBLIC_KEY: "isolated-test-public-key",
      MANAGED_IDENTITY_OIDC_ISSUER: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity",
      MANAGED_IDENTITY_OIDC_CLIENT_ID: "tcdx-grc",
      MANAGED_IDENTITY_OIDC_REDIRECT_URI: "https://grc.tecdex.net/auth/callback",
      MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE: secretFile
    };
    try {
      const config = loadConfig(environment).managedIdentityOidc;
      expect(config).toMatchObject({
        configured: true,
        issuer: environment.MANAGED_IDENTITY_OIDC_ISSUER,
        clientId: "tcdx-grc",
        redirectUri: environment.MANAGED_IDENTITY_OIDC_REDIRECT_URI,
        scopes: ["openid"], allowedAlgorithms: ["RS256"],
        requiredAmr: ["pwd", "otp"], identityResolution: "existing_only"
      });
      expect(config.clientSecret).toBe(fixture);
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_OIDC_ISSUER: "https://iam.grc.tecdex.net/realms/master" }))
        .toThrow("canonical issuer");
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_OIDC_CLIENT_ID: "other" })).toThrow("canonical issuer");
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_OIDC_REDIRECT_URI: "https://grc.tecdex.net/other" }))
        .toThrow("canonical issuer");
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_OIDC_CLIENT_SECRET: "inline-value" }))
        .toThrow("must use MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE");
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE: "" }))
        .toThrow("Incomplete Managed Identity OIDC configuration");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("limits Managed Identity Admin credentials to the approved internal endpoint and protected file", () => {
    const directory = mkdtempSync(join(tmpdir(), "tcdx-mi6-admin-config-"));
    const secretFile = join(directory, "client-secret");
    writeFileSync(secretFile, "test-only-secret", { mode: 0o600 });
    const environment = { DATABASE_USER: "isolated-test-user",
      MANAGED_IDENTITY_ADMIN_BASE_URL: "http://192.168.2.46:8180",
      MANAGED_IDENTITY_ADMIN_CLIENT_ID: "tcdx-grc-managed-identity-provisioner",
      MANAGED_IDENTITY_ADMIN_CLIENT_SECRET_FILE: secretFile };
    try {
      expect(loadConfig(environment).managedIdentityAdmin).toMatchObject({ configured: true,
        clientId: environment.MANAGED_IDENTITY_ADMIN_CLIENT_ID });
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_ADMIN_BASE_URL: "http://192.168.2.47:8180" }))
        .toThrow("approved internal service");
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_ADMIN_BASE_URL: "https://iam.grc.tecdex.net" }))
        .toThrow("approved internal service");
      expect(() => loadConfig({ ...environment, MANAGED_IDENTITY_ADMIN_CLIENT_SECRET: "inline-secret" }))
        .toThrow("must use MANAGED_IDENTITY_ADMIN_CLIENT_SECRET_FILE");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
