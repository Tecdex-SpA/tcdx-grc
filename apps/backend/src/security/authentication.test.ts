import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { BlockedIdentityVerifier } from "./authentication.js";
import { ApplicationTokenService, FailClosedMemorySessionStore, type ApplicationJwtConfig } from "./application-token.js";
import { OidcFlowStore, buildTokenEndpointRequest, canonicalIdentityKey, verifyOidcIdentityProof } from "./oidc-browser.js";

const identityId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const tokenId = "018f47f2-6170-7bd0-9d43-12f644a2b112";

function appConfig(): ApplicationJwtConfig {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    issuer: "https://tokens.tcdx.test",
    audience: "tcdx-grc-api",
    privateKey: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
    publicKey: publicKey.export({ format: "pem", type: "spki" }).toString(),
    keyId: "unit-test-key",
    algorithm: "RS256",
    maxLifetimeSeconds: 300,
    clockToleranceSeconds: 5
  };
}

describe("TCDX application token authentication", () => {
  it("fails closed while runtime security configuration is absent", async () => {
    await expect(new BlockedIdentityVerifier().verifyBearerToken("untrusted-token"))
      .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID", statusCode: 401 });
  });

  it("issues and verifies only a short-lived asymmetric TCDX application JWT", async () => {
    const service = await ApplicationTokenService.create(appConfig());
    const issued = await service.issue(identityId, tokenId);
    expect(issued.token.split(".")).toHaveLength(3);
    await expect(service.verifyBearerToken(issued.token)).resolves.toMatchObject({
      principalClass: "HUMAN_INTERACTIVE", principalId: identityId, tokenId
    });
  });

  it("rejects mismatched application signing and verification keys at startup", async () => {
    const config = appConfig();
    const unrelated = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "pem", type: "spki" }).toString();
    await expect(ApplicationTokenService.create({ ...config, publicKey: unrelated })).rejects.toThrow("do not form a valid pair");
  });

  it("revokes jti state and keeps unknown sessions fail-closed", async () => {
    const service = await ApplicationTokenService.create(appConfig(), new FailClosedMemorySessionStore());
    const issued = await service.issue(identityId, tokenId);
    await service.revoke(issued.identity);
    await expect(service.verifyBearerToken(issued.token)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
  });

  it.each([
    ["opaque external access token", "opaque-provider-token"],
    ["external ID token", "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2lkcC50ZXN0Iiwic3ViIjoic3RhYmxlIn0.signature"]
  ])("rejects %s as an API bearer", async (_label, token) => {
    const service = await ApplicationTokenService.create(appConfig());
    await expect(service.verifyBearerToken(token)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID", statusCode: 401 });
  });

  it("rejects expired application tokens", async () => {
    const service = await ApplicationTokenService.create(appConfig());
    const issued = await service.issue(identityId, tokenId, new Date(Date.now() - 600_000));
    await expect(service.verifyBearerToken(issued.token)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
  });
});

describe("external OIDC identity proof", () => {
  it("consumes state and PKCE flow state exactly once", () => {
    const flows = new OidcFlowStore();
    const created = flows.create();
    expect(flows.consume(created.flowId, created.flow.state)).toMatchObject({ nonce: created.flow.nonce, verifier: created.flow.verifier });
    expect(() => flows.consume(created.flowId, created.flow.state)).toThrow("Authentication failed");
  });

  it("validates issuer, audience, nonce and stable subject while email remains an attribute", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "oidc-test";
    jwk.alg = "RS256";
    const keys = createLocalJWKSet({ keys: [jwk] });
    const config = {
      issuer: "https://idp.example.test",
      clientId: "client-id",
      clientSecret: ["not", "used", "by", "proof", "test"].join("-"),
      redirectUri: "https://api.example.test/auth/callback",
      scopes: ["openid", "profile", "email"],
      allowedAlgorithms: ["RS256"],
      tokenEndpointAuthMethod: "client_secret_post" as const
    };
    const createToken = (email: string, overrides: { issuer?: string; audience?: string; nonce?: string; expiry?: string } = {}) => new SignJWT({ nonce: overrides.nonce ?? "expected", email, name: "Persona" })
      .setProtectedHeader({ alg: "RS256", kid: "oidc-test", typ: "JWT" })
      .setIssuer(overrides.issuer ?? config.issuer).setAudience(overrides.audience ?? config.clientId)
      .setSubject("stable-subject").setIssuedAt().setExpirationTime(overrides.expiry ?? "5m").sign(privateKey);

    const first = await verifyOidcIdentityProof(config, await createToken("before@example.test"), "expected", keys);
    const changed = await verifyOidcIdentityProof(config, await createToken("after@example.test"), "expected", keys);
    expect(first.subject).toBe(changed.subject);
    expect(first.email).not.toBe(changed.email);
    expect(canonicalIdentityKey(first.issuer, first.subject)).toBe(canonicalIdentityKey(changed.issuer, changed.subject));
    await expect(verifyOidcIdentityProof(config, await createToken("x@example.test", { issuer: "https://wrong.example.test" }), "expected", keys)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    await expect(verifyOidcIdentityProof(config, await createToken("x@example.test", { audience: "wrong" }), "expected", keys)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    await expect(verifyOidcIdentityProof(config, await createToken("x@example.test", { nonce: "wrong" }), "expected", keys)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    await expect(verifyOidcIdentityProof(config, await createToken("x@example.test", { expiry: "-1s" }), "expected", keys)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
  });

  it.each(["client_secret_basic", "client_secret_post"] as const)("builds the configured %s token exchange without provider hardcoding", (method) => {
    const config = {
      issuer: "https://idp.example.test",
      clientId: "client-id",
      clientSecret: ["runtime", "secret", "reference"].join("-"),
      redirectUri: "https://api.example.test/auth/callback",
      scopes: ["openid"],
      allowedAlgorithms: ["RS256"],
      tokenEndpointAuthMethod: method
    };
    const request = buildTokenEndpointRequest(config, "authorization-code", "pkce-verifier");
    expect(request.body.get("code_verifier")).toBe("pkce-verifier");
    expect(request.body.get("client_secret") !== null).toBe(method === "client_secret_post");
    expect(request.headers.authorization !== undefined).toBe(method === "client_secret_basic");
  });
});
