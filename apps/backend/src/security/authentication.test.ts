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

  it("revokes every active application token for one identity while preserving other identities", async () => {
    const service = await ApplicationTokenService.create(appConfig(), new FailClosedMemorySessionStore());
    const first = await service.issue(identityId, tokenId);
    const second = await service.issue(identityId, "018f47f2-6170-7bd0-9d43-12f644a2b113");
    const other = await service.issue("018f47f2-6170-7bd0-9d43-12f644a2b114", "018f47f2-6170-7bd0-9d43-12f644a2b115");
    await service.revokePrincipal(identityId);
    await expect(service.verifyBearerToken(first.token)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    await expect(service.verifyBearerToken(second.token)).rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    await expect(service.verifyBearerToken(other.token)).resolves.toMatchObject({ principalId: other.identity.principalId });
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

describe("Managed Identity signed AMR boundary", () => {
  it("accepts both verified factors in either order and rejects every incomplete or unverified proof", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const unrelated = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "managed-key";
    jwk.alg = "RS256";
    const keys = createLocalJWKSet({ keys: [jwk] });
    const config = {
      issuer: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity",
      clientId: "tcdx-grc",
      clientSecret: ["local", "fixture", "only"].join("-"),
      redirectUri: "https://grc.tecdex.net/auth/callback",
      scopes: ["openid"],
      allowedAlgorithms: ["RS256"],
      tokenEndpointAuthMethod: "client_secret_post" as const,
      requiredAmr: ["pwd", "otp"],
      identityResolution: "existing_only" as const
    };
    const now = Math.floor(Date.now() / 1_000);
    const createToken = async (options: {
      amr?: unknown; issuer?: string; audience?: string | string[]; subject?: string | null; kid?: string;
      expiry?: number; issuedAt?: number; authTime?: unknown; sid?: unknown; signingKey?: typeof privateKey;
    } = {}) => {
      const payload: Record<string, unknown> = {
        nonce: "managed-nonce", name: "Managed fixture", email: "same@example.test",
        auth_time: options.authTime ?? now, sid: options.sid ?? "current-session",
        realm_access: { roles: ["admin"] }, resource_access: { "tcdx-grc": { roles: ["PLATFORM_ADMIN"] } },
        groups: ["tenant-admin"]
      };
      if (options.amr !== null) payload.amr = options.amr ?? ["pwd", "otp"];
      const jwt = new SignJWT(payload).setProtectedHeader({ alg: "RS256", kid: options.kid ?? "managed-key" })
        .setIssuer(options.issuer ?? config.issuer).setAudience(options.audience ?? config.clientId)
        .setIssuedAt(options.issuedAt ?? now).setExpirationTime(options.expiry ?? now + 300);
      if (options.subject !== null) jwt.setSubject(options.subject ?? "stable-managed-subject");
      return jwt.sign(options.signingKey ?? privateKey);
    };
    for (const amr of [["pwd", "otp"], ["otp", "pwd"]]) {
      const proof = await verifyOidcIdentityProof(config, await createToken({ amr }), "managed-nonce", keys);
      expect(proof).toEqual({
        issuer: config.issuer, subject: "stable-managed-subject", email: "same@example.test", displayName: "Managed fixture"
      });
      expect(Object.keys(proof).sort()).toEqual(["displayName", "email", "issuer", "subject"]);
    }
    for (const amr of [null, [], ["pwd"], ["otp"], ["pwd", "something"], "pwd otp", { pwd: true, otp: true }, ["pwd", "otp", 1]]) {
      await expect(verifyOidcIdentityProof(config, await createToken({ amr }), "managed-nonce", keys))
        .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    }
    for (const options of [
      { issuer: "https://iam.grc.tecdex.net/realms/master" },
      { issuer: "https://other.example.test/realms/tcdx-managed-identity" },
      { audience: "another-client" },
      { audience: ["tcdx-grc", "another-client"] },
      { subject: null },
      { kid: "unknown-kid" },
      { expiry: now - 1 },
      { issuedAt: now + 60, expiry: now + 360 },
      { authTime: now + 10 },
      { sid: "" },
      { signingKey: unrelated.privateKey }
    ]) {
      await expect(verifyOidcIdentityProof(config, await createToken(options), "managed-nonce", keys))
        .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    }
    const unsignedLooking = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({
      iss: config.issuer, aud: config.clientId, sub: "stable-managed-subject", amr: ["pwd", "otp"]
    })).toString("base64url")}.`;
    await expect(verifyOidcIdentityProof(config, unsignedLooking, "managed-nonce", keys))
      .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID" });
    expect(canonicalIdentityKey(config.issuer, "stable-managed-subject"))
      .not.toBe(canonicalIdentityKey("https://accounts.zoho.com", "stable-managed-subject"));
  });
});
