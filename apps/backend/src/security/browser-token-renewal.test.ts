import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { ApplicationTokenService } from "./application-token.js";
import { BrowserTokenRenewal } from "./browser-token-renewal.js";
import { FoundationError } from "../errors.js";
import { newUuidV7 } from "../uuid.js";

afterEach(() => vi.useRealTimers());
const pair = generateKeyPairSync("rsa", { modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
async function fixture() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T15:00:00Z"));
  const tokens = await ApplicationTokenService.create({ issuer: "https://tokens.example.test", audience: "test-api",
    algorithm: "RS256", keyId: "test", privateKey: pair.privateKey, publicKey: pair.publicKey,
    maxLifetimeSeconds: 300, clockToleranceSeconds: 5 });
  const issued = await tokens.issue(newUuidV7(), newUuidV7());
  const renewal = new BrowserTokenRenewal(tokens, { idleSeconds: 1800, maxSeconds: 36000 });
  const refresh = vi.fn(async () => {});
  const audit = vi.fn(async () => {});
  renewal.establish(issued, Date.now(), refresh);
  return { tokens, issued, renewal, refresh, audit };
}

describe("bounded browser session renewal", () => {
  it("renews after short access-token expiry, permits 30 minutes of work and invalidates old tokens", async () => {
    const f = await fixture();
    vi.advanceTimersByTime(29 * 60_000);
    await expect(f.tokens.verifyBearerToken(f.issued.token)).rejects.toMatchObject({ statusCode: 401 });
    const renewed = await f.renewal.renew(f.issued.token, f.audit);
    vi.advanceTimersByTime(2 * 60_000);
    await expect(f.tokens.verifyBearerToken(renewed)).resolves.toMatchObject({ principalId: f.issued.identity.principalId });
    await expect(f.renewal.renew(f.issued.token, f.audit)).rejects.toMatchObject({ statusCode: 401 });
    expect(f.refresh).toHaveBeenCalledTimes(1);
    expect(f.audit).toHaveBeenCalledTimes(1);
  });
  it("keeps one refresh exchange for concurrent requests", async () => {
    const f = await fixture();
    const [a, b] = await Promise.all([f.renewal.renew(f.issued.token, f.audit), f.renewal.renew(f.issued.token, f.audit)]);
    expect(a).toBe(b); expect(f.refresh).toHaveBeenCalledTimes(1);
  });
  it("denies idle expiry, unknown handles and revoked sessions without contacting the provider", async () => {
    const f = await fixture();
    await expect(f.renewal.renew("unknown", f.audit)).rejects.toMatchObject({ statusCode: 401 });
    await f.tokens.revoke(f.issued.identity);
    await expect(f.renewal.renew(f.issued.token, f.audit)).rejects.toMatchObject({ statusCode: 401 });
    expect(f.refresh).not.toHaveBeenCalled();
    const idle = await fixture(); vi.advanceTimersByTime(1800_000);
    await expect(idle.renewal.renew(idle.issued.token, idle.audit)).rejects.toMatchObject({ statusCode: 401 });
    expect(idle.refresh).not.toHaveBeenCalled();
  });
  it("honors provider rejection and principal revocation during a refresh", async () => {
    const f = await fixture();
    f.refresh.mockImplementationOnce(async () => { await f.tokens.revokePrincipal(f.issued.identity.principalId); });
    await expect(f.renewal.renew(f.issued.token, f.audit)).rejects.toMatchObject({ statusCode: 401 });
    const disabled = await fixture();
    disabled.refresh.mockRejectedValueOnce(new FoundationError("TCDX.AUTHENTICATION.INVALID", "Invalid", 401));
    await expect(disabled.renewal.renew(disabled.issued.token, disabled.audit)).rejects.toMatchObject({ statusCode: 401 });
    await expect(disabled.tokens.verifyBearerToken(disabled.issued.token)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("bounds the last access token and renewal by the original absolute maximum", async () => {
    const f = await fixture();
    f.renewal.establish(f.issued, Date.now() - (36000 - 60) * 1000, f.refresh);
    const token = await f.renewal.renew(f.issued.token, f.audit);
    const identity = await f.tokens.verifyBearerToken(token);
    expect(identity.expiresAt.getTime() - Date.now()).toBe(60_000);
    vi.advanceTimersByTime(60_000);
    await expect(f.renewal.renew(token, f.audit)).rejects.toMatchObject({ statusCode: 401 });
    await expect(f.tokens.verifyBearerToken(token)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("revokes an issued successor if logout races the audit write", async () => {
    const f = await fixture();
    let successor = "";
    await expect(f.renewal.renew(f.issued.token, async (issued) => {
      successor = issued.token;
      await f.tokens.revokePrincipal(f.issued.identity.principalId);
    })).rejects.toMatchObject({ statusCode: 401 });
    await expect(f.tokens.verifyBearerToken(successor)).rejects.toMatchObject({ statusCode: 401 });
  });
});
