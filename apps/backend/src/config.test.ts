import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("foundation runtime configuration", () => {
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
});
