import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("foundation health", () => {
  it("reports liveness with a UUID correlation id", async () => {
    const app = buildApp(async () => true);
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ state: "up" });
    expect(response.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
    await app.close();
  });

  it("fails readiness closed when PostgreSQL is unavailable", async () => {
    const app = buildApp(async () => false);
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ state: "down", dependencies: { database: "down" } });
    await app.close();
  });

  it("permits only the configured browser origin and handles authenticated API preflight", async () => {
    const app = buildApp(async () => true, undefined, undefined, "https://grc-www.tcdx.int");
    const allowed = await app.inject({
      method: "OPTIONS", url: "/api/v1/access/me",
      headers: { origin: "https://grc-www.tcdx.int", "access-control-request-method": "GET", "access-control-request-headers": "authorization,x-tcdx-tenant-id" }
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://grc-www.tcdx.int");
    expect(allowed.headers["access-control-allow-headers"]).toContain("Authorization");
    const denied = await app.inject({ method: "GET", url: "/health/live", headers: { origin: "https://untrusted.example" } });
    expect(denied.statusCode).toBe(403);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });
});
