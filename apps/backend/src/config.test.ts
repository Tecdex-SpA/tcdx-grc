import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("foundation runtime configuration", () => {
  it("keeps canonical database and AI identities", () => {
    const config = loadConfig({ DATABASE_USER: "secret-reference" });
    expect(config.database).toMatchObject({ host: "192.168.2.40", name: "tcdx-grc", sslMode: "require" });
    expect(config.aiServiceOrigin).toBe("https://ia2.tcdx.int");
  });

  it("rejects a non-canonical database and keeps incomplete OIDC disabled", () => {
    expect(() => loadConfig({ DATABASE_USER: "secret-reference", DATABASE_NAME: "other" })).toThrow("Database identity must be tcdx-grc");
    const config = loadConfig({ DATABASE_USER: "secret-reference", OIDC_ISSUER: "https://issuer.example" });
    expect(config.oidc.configured).toBe(false);
  });
});
