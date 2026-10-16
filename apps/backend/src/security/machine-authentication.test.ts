import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { ApplicationTokenService, type MachineJwtProfile } from "./application-token.js";
import { newUuidV7 } from "../uuid.js";

const profile = JSON.parse(readFileSync("iam/config/step6a3-m2m-qa-profile.json", "utf8")) as MachineJwtProfile;
describe("approved QA M2M authentication on the existing application-token service", () => {
  let service: ApplicationTokenService;
  let machineKeys: Awaited<ReturnType<typeof generateKeyPair>>;
  let resolverAvailable = true;
  const principal = newUuidV7();
  const subject = newUuidV7();
  async function signed(overrides: Record<string, unknown> = {}, unrelated = false) {
    const now = Math.floor(Date.now() / 1000);
    const keys = unrelated ? await generateKeyPair("RS256") : machineKeys;
    return new SignJWT({ iss: profile.issuer, aud: profile.audience, sub: subject, jti: newUuidV7(), iat: now, exp: now + 120,
      typ: "Bearer", azp: profile.client_id, principal_class: "MACHINE_TO_MACHINE", ...overrides })
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "isolated-machine-key" }).sign(keys.privateKey);
  }
  beforeAll(async () => {
    const humanKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    service = await ApplicationTokenService.create({ issuer: "https://isolated.tcdx.test", audience: profile.audience,
      privateKey: humanKeys.privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
      publicKey: humanKeys.publicKey.export({ format: "pem", type: "spki" }).toString(), keyId: "isolated-human-key",
      algorithm: "RS256", maxLifetimeSeconds: 300, clockToleranceSeconds: 0 });
    machineKeys = await generateKeyPair("RS256");
    const jwk = await exportJWK(machineKeys.publicKey);
    service.configureMachineProfile({ profile, keySet: createLocalJWKSet({ keys: [{ ...jwk, kid: "isolated-machine-key", alg: "RS256" }] }),
      resolvePrincipal: async () => { if (!resolverAvailable) throw Error("canonical principal inactive"); return principal; } }, "qa");
  });
  it("accepts signed dedicated service-account tokens through an active canonical binding", async () => {
    await expect(service.verifyBearerToken(await signed())).resolves.toMatchObject({ principalClass: "MACHINE_TO_MACHINE", principalId: principal });
  });
  it("preserves human issuance, session persistence and revocation", async () => {
    const human = await service.issue(newUuidV7(), newUuidV7());
    await expect(service.verifyBearerToken(human.token)).resolves.toEqual(human.identity);
    await service.revoke(human.identity);
    await expect(service.verifyBearerToken(human.token)).rejects.toMatchObject({ statusCode: 401 });
  });
  it.each([
    { iss: "https://other-issuer.test" }, { aud: "other-api" }, { azp: "other-client" },
    { client_id: "other-client" }, { principal_class: "HUMAN_INTERACTIVE" }, { typ: "ID" },
    { sub: "" }, { jti: "" }, { iat: Math.floor(Date.now() / 1000) + 120 },
    { exp: Math.floor(Date.now() / 1000) - 120 }, { exp: Math.floor(Date.now() / 1000) + 600 },
    { nbf: Math.floor(Date.now() / 1000) + 120 },
    { resource_access: { "realm-management": { roles: ["manage-clients"] } } }, { realm_access: { roles: ["admin"] } }
  ])("rejects incompatible signed claim %j", async overrides => {
    await expect(service.verifyBearerToken(await signed(overrides))).rejects.toMatchObject({ statusCode: 401 });
  });
  it("rejects an unrelated signing key", async () => {
    await expect(service.verifyBearerToken(await signed({}, true))).rejects.toMatchObject({ statusCode: 401 });
  });
  it("fails closed when canonical binding is inactive or unavailable", async () => {
    resolverAvailable = false;
    try { await expect(service.verifyBearerToken(await signed())).rejects.toMatchObject({ statusCode: 401 }); }
    finally { resolverAvailable = true; }
  });
  it("forbids enabling the machine profile in production", () => {
    expect(() => service.configureMachineProfile({ profile, resolvePrincipal: async () => principal }, "production"))
      .toThrow("INVALID_QA_MACHINE_PROFILE");
  });
});
