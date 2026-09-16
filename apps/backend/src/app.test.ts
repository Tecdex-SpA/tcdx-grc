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
});
