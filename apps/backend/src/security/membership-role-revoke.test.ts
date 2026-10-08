import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";

const assignmentId = "018f47f2-6170-7bd0-9d43-12f644a2b211";
const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b212";

describe("MembershipRole revoke HTTP default DENY", () => {
  it("requires authentication before validating either authority mode", async () => {
    const app = buildApp(async () => true, {
      database: {} as never,
      identityVerifier: { verifyBearerToken: async () => { throw new Error("Bearer must not be accepted in this test"); } },
      fileStorage: new UnavailableFileStoragePort()
    });
    try {
      for (const request of [
        { url: `/api/v1/role-assignments/${assignmentId}:revoke?tenant_id=${tenantId}`, headers: {} },
        { url: `/api/v1/role-assignments/${assignmentId}:revoke?tenant_id=${tenantId}`,
          headers: { "x-tcdx-tenant-id": tenantId } },
        { url: `/api/v1/role-assignments/${assignmentId}:revoke?unknown=1`, headers: {} }
      ]) {
        const response = await app.inject({ method: "POST", ...request, payload: { reason: "Unauthorized" } });
        expect(response.statusCode).toBe(401);
        expect(response.json()).toMatchObject({ code: "TCDX.AUTHENTICATION.REQUIRED" });
      }
    } finally { await app.close(); }
  });
});
