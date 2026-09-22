import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { BlockedIdentityVerifier } from "../security/authentication.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { mutations } from "./service.js";

describe("Phase 5 Core GRC route surface", () => {
  it("registers the implemented contract operations and fails protected access closed", async () => {
    const app = buildApp(async () => true, {
      database: {} as never,
      identityVerifier: new BlockedIdentityVerifier(),
      fileStorage: new UnavailableFileStoragePort()
    });
    const routes: Array<["GET" | "POST", string]> = [
      ["GET", "/api/v1/access/me"],
      ["GET", "/api/v1/requirement-applicabilities"],
      ["GET", "/api/v1/requirement-applicabilities/018f47f2-6170-7bd0-9d43-12f644a2b111"],
      ["POST", "/api/v1/requirement-applicabilities/018f47f2-6170-7bd0-9d43-12f644a2b111:submit"],
      ["POST", "/api/v1/actions/018f47f2-6170-7bd0-9d43-12f644a2b111:submit-for-review"],
      ["GET", "/api/v1/evidence-versions/018f47f2-6170-7bd0-9d43-12f644a2b111"]
    ];
    for (const [method, url] of routes) {
      const response = await app.inject({ method, url, ...(method === "POST" ? { payload: {}, headers: { "idempotency-key": "test" } } : {}) });
      expect(response.statusCode, `${method} ${url}`).toBe(401);
    }
    expect(mutations.size).toBe(35);
    await app.close();
  });
});
