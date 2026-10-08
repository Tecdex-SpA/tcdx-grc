import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserSession, receiveApplicationToken, receiveInvitationApplicationToken } from "./browser-auth.js";

afterEach(() => vi.unstubAllGlobals());

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
