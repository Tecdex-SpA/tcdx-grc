import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerOidcBrowserRoutes, type OidcBrowserClient } from "./oidc-browser.js";

describe("provider-neutral browser OIDC routes", () => {
  it("routes Managed Identity through the existing login and exact callback without changing Zoho", async () => {
    const zoho = {
      frontendOrigin: "https://grc.tecdex.net",
      authorizationRequest: vi.fn(async () => ({ url: "https://accounts.zoho.com/oauth/v2/auth", flowId: "zoho-flow" })),
      complete: vi.fn(async () => "zoho-application-token"),
      logout: vi.fn(async () => undefined)
    };
    const managed = {
      frontendOrigin: "https://grc.tecdex.net",
      authorizationRequest: vi.fn(async () => ({ url: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity/protocol/openid-connect/auth", flowId: "managed-flow" })),
      complete: vi.fn(async () => "managed-application-token"),
      logout: vi.fn(async () => undefined)
    };
    const app = Fastify();
    registerOidcBrowserRoutes(app, zoho as unknown as OidcBrowserClient, managed as unknown as OidcBrowserClient);
    try {
      const existing = await app.inject({ method: "GET", url: "/auth/login" });
      expect(existing.statusCode).toBe(302);
      expect(existing.headers.location).toBe("https://accounts.zoho.com/oauth/v2/auth");
      const managedLogin = await app.inject({ method: "GET", url: "/auth/login?provider=tcdx-managed-identity" });
      expect(managedLogin.statusCode).toBe(302);
      expect(managedLogin.headers.location).toContain("https://iam.grc.tecdex.net/realms/tcdx-managed-identity/");
      const cookie = String(managedLogin.headers["set-cookie"]).split(";")[0]!;
      expect(cookie).toContain("managed.managed-flow");
      const callback = await app.inject({ method: "GET", url: "/auth/callback?code=code&state=state", headers: { cookie } });
      expect(callback.statusCode).toBe(200);
      expect(managed.complete).toHaveBeenCalledWith("code", "state", "managed-flow", "undefined");
      expect(zoho.complete).not.toHaveBeenCalled();
      expect(callback.body).toContain("managed-application-token");
      const unknown = await app.inject({ method: "GET", url: "/auth/login?provider=unknown" });
      expect(unknown.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
