import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserSession, receiveApplicationToken, receiveInvitationApplicationToken } from "./browser-auth.js";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("browser OIDC session", () => {
  it("keeps the application token and tenant context in tab-scoped storage", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    const session = new BrowserSession();
    session.storeAccessToken("tcdx-token");
    session.selectTenant("01900000-0000-7000-8000-000000000001");
    await expect(session.getAccessToken()).resolves.toBe("tcdx-token");
    expect(session.selectedTenant()).toEqual({ tenantId: "01900000-0000-7000-8000-000000000001" });
    await session.clearSession();
    await expect(session.getAccessToken()).resolves.toBeNull();
    expect(session.selectedTenant()).toBeNull();
  });

  it("accepts only the exact API-origin callback message from the login popup", async () => {
    const popup = { closed: false } as Window;
    let listener: ((event: MessageEvent<unknown>) => void) | undefined;
    vi.stubGlobal("window", {
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
      setInterval: vi.fn(() => 2),
      clearInterval: vi.fn(),
      addEventListener: vi.fn((_type: string, callback: (event: MessageEvent<unknown>) => void) => { listener = callback; }),
      removeEventListener: vi.fn()
    });
    const result = receiveApplicationToken("https://api.example", () => popup);
    listener?.({ origin: "https://untrusted.example", source: popup, data: { type: "tcdx.application-token", token: "external-token" } } as MessageEvent);
    listener?.({ origin: "https://api.example", source: popup, data: { type: "tcdx.application-token", token: "tcdx-token" } } as MessageEvent);
    await expect(result).resolves.toBe("tcdx-token");
  });

  it("starts an invitation ceremony without placing the one-time token in a URL", async () => {
    const assign = vi.fn();
    const popup = { closed: false, location: { assign }, close: vi.fn() } as unknown as Window;
    let listener: ((event: MessageEvent<unknown>) => void) | undefined;
    const fetcher = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      expect(String(_input)).toBe("https://api.example/auth/invitations/accept");
      expect(String(_input)).not.toContain("one-time-secret");
      expect(init?.body).toBe(JSON.stringify({ invitation_token: "one-time-secret" }));
      return new Response(JSON.stringify({ authentication_method: "ZOHO", authorization_url: "https://accounts.zoho.example/authorize" }), { status: 202 });
    });
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("window", {
      setTimeout: vi.fn(() => 1), clearTimeout: vi.fn(), setInterval: vi.fn(() => 2), clearInterval: vi.fn(),
      addEventListener: vi.fn((_type: string, callback: (event: MessageEvent<unknown>) => void) => { listener = callback; }),
      removeEventListener: vi.fn()
    });
    const result = receiveInvitationApplicationToken("https://api.example", "one-time-secret", () => popup);
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("https://accounts.zoho.example/authorize"));
    listener?.({ origin: "https://api.example", source: popup, data: { type: "tcdx.application-token", token: "tcdx-token" } } as MessageEvent);
    await expect(result).resolves.toBe("tcdx-token");
  });
});


describe("browser token renewal", () => {
  function setup() {
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
    const session = new BrowserSession("https://api.example");
    const now = Math.floor(Date.now() / 1000);
    const token = `header.${btoa(JSON.stringify({ iat: now - 300, exp: now - 1, session_renewable: true }))}.signature`;
    session.storeAccessToken(token); session.selectTenant("tenant");
    return { session, token };
  }
  it("renews before API use, coalesces concurrent requests and preserves tenant context", async () => {
    const { session, token } = setup();
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${token}`);
      return new Response(JSON.stringify({ token: "renewed" }));
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await Promise.all([session.getAccessToken(), session.getAccessToken()])).toEqual(["renewed", "renewed"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(session.selectedTenant()).toEqual({ tenantId: "tenant" });
  });
  it("clears a rejected session while preserving credentials on a provider outage", async () => {
    const { session, token } = setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    await expect(session.getAccessToken()).rejects.toThrow("SESSION_RENEWAL_UNAVAILABLE");
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${token}`);
      return new Response(null, { status: 401 });
    }));
    await expect(session.getAccessToken()).resolves.toBeNull();
    expect(session.selectedTenant()).toBeNull();
  });
  it("keeps the existing behavior for tokens without renewable-session metadata", async () => {
    const { session } = setup();
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const token = `header.${btoa(JSON.stringify({ iat: 1, exp: 2 }))}.signature`;
    session.storeAccessToken(token);
    await expect(session.getAccessToken()).resolves.toBe(token);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("cannot restore a session cleared during renewal", async () => {
    const { session } = setup();
    vi.stubGlobal("fetch", vi.fn(async () => {
      await session.clearSession(); return new Response(JSON.stringify({ token: "late-token" }));
    }));
    await expect(session.getAccessToken()).resolves.toBeNull();
    await expect(session.getAccessToken()).resolves.toBeNull();
  });
});
