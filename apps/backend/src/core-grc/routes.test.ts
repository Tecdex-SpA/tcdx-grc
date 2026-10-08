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
    const routes: Array<["GET" | "POST" | "PUT", string]> = [
      ["GET", "/api/v1/access/me"],
      ["POST", "/api/v1/platform/tenants"],
      ["POST", "/api/v1/platform/subscriptions"],
      ["POST", "/api/v1/platform/membership-invitations"],
      ["POST", "/api/v1/platform/membership-invitations/018f47f2-6170-7bd0-9d43-12f644a2b111/revoke"],
      ["POST", "/api/v1/memberships"],
      ["POST", "/api/v1/memberships/018f47f2-6170-7bd0-9d43-12f644a2b111/role-assignments"],
      ["POST", "/api/v1/role-assignments/018f47f2-6170-7bd0-9d43-12f644a2b111:revoke"],
      ["GET", "/api/v1/requirement-applicabilities"],
      ["GET", "/api/v1/framework-versions/018f47f2-6170-7bd0-9d43-12f644a2b111/normative-units"],
      ["GET", "/api/v1/framework-versions/018f47f2-6170-7bd0-9d43-12f644a2b111/requirements"],
      ["GET", "/api/v1/requirement-applicabilities/018f47f2-6170-7bd0-9d43-12f644a2b111"],
      ["POST", "/api/v1/requirement-applicabilities/018f47f2-6170-7bd0-9d43-12f644a2b111:submit"],
      ["POST", "/api/v1/actions/018f47f2-6170-7bd0-9d43-12f644a2b111:submit-for-review"],
      ["POST", "/api/v1/files:request-upload"],
      ["PUT", "/api/v1/file-upload-intents/018f47f2-6170-7bd0-9d43-12f644a2b111/content"],
      ["GET", "/api/v1/file-objects/018f47f2-6170-7bd0-9d43-12f644a2b111/content"],
      ["POST", "/api/v1/file-upload-intents/018f47f2-6170-7bd0-9d43-12f644a2b111:finalize"],
      ["GET", "/api/v1/retention-policies"],
      ["GET", "/api/v1/retention-policies/018f47f2-6170-7bd0-9d43-12f644a2b111"],
      ["POST", "/api/v1/retention-policies/018f47f2-6170-7bd0-9d43-12f644a2b111:update"],
      ["POST", "/api/v1/evidence-requests/018f47f2-6170-7bd0-9d43-12f644a2b111:fulfill"],
      ["POST", "/api/v1/control-assessments/018f47f2-6170-7bd0-9d43-12f644a2b111:complete"],
      ["GET", "/api/v1/evidence-versions/018f47f2-6170-7bd0-9d43-12f644a2b111"]
    ];
    for (const [method, url] of routes) {
      const response = await app.inject({ method, url, ...(method === "POST" ? { payload: {}, headers: { "idempotency-key": "test" } } : {}), ...(method === "PUT" ? { payload: Buffer.from("test"), headers: { "content-type": "application/octet-stream" } } : {}) });
      expect(response.statusCode, `${method} ${url}`).toBe(401);
    }
    expect(mutations.size).toBe(44);
    await app.close();
  });
});
