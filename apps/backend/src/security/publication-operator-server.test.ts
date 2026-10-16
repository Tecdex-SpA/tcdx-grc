import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ApplicationTokenService, type ApplicationJwtConfig } from "./application-token.js";
import { existingQaHumanSessionVerifier } from "./publication-operator-server.js";
import { newUuidV7 } from "../uuid.js";

describe("QA pre-promotion commercial operator preserves live human session validation", () => {
  it("requires both the exact human JWT and the current backend session, including revocation", async () => {
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const config: ApplicationJwtConfig = { issuer: "https://isolated.tcdx.test", audience: "tcdx-grc-api", keyId: "isolated-human",
      privateKey: keys.privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
      publicKey: keys.publicKey.export({ format: "pem", type: "spki" }).toString(), algorithm: "RS256", maxLifetimeSeconds: 300, clockToleranceSeconds: 0 };
    const current = await ApplicationTokenService.create(config);
    const issued = await current.issue(newUuidV7(), newUuidV7());
    const fetcher = (async (_url: unknown, init?: RequestInit) => {
      try {
        const token = new Headers(init?.headers).get("authorization")!.slice(7);
        await current.verifyBearerToken(token);
        return new Response(JSON.stringify({ platform_permissions: [], tenant_permissions: null }), { status: 200 });
      } catch { return new Response(null, { status: 401 }); }
    }) as typeof fetch;
    const verifier = existingQaHumanSessionVerifier(config, "http://127.0.0.1:4000", fetcher);
    await expect(verifier.verifyBearerToken(issued.token)).resolves.toEqual(issued.identity);
    await current.revoke(issued.identity);
    await expect(verifier.verifyBearerToken(issued.token)).rejects.toMatchObject({ statusCode: 401 });
    await expect(verifier.verifyBearerToken("opaque")).rejects.toMatchObject({ statusCode: 401 });
    expect(() => existingQaHumanSessionVerifier(config, "http://foreign-host.test")).toThrow("LOOPBACK_REQUIRED");
  });
});
