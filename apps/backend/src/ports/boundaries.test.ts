import { describe, expect, it } from "vitest";
import { UnavailableAIServicePort } from "./ai-service.js";
import { UnavailableFileStoragePort } from "./file-storage.js";

describe("unconfigured provider boundaries", () => {
  it("keeps AI fixed to ia2 and fails closed without runtime configuration", async () => {
    const port = new UnavailableAIServicePort();
    expect(port.origin).toBe("https://ia2.tcdx.int");
    await expect(port.requestAssistance({
      tenantId: "tenant",
      principalId: "principal",
      principalClass: "HUMAN_INTERACTIVE",
      purposeCode: "approved-purpose",
      permission: "ai.recommendation.create",
      scope: "tenant",
      capabilityEnabled: true,
      objectPolicyAllowed: true,
      purposeApproved: true,
      contentAccessApproved: true,
      contextHash: "a".repeat(64),
      classification: "restricted",
      correlationId: "correlation",
      minimizedContext: {},
      authorityCeiling: "A2_PROPOSE"
    })).rejects.toMatchObject({ code: "TCDX.DEPENDENCY.UNAVAILABLE", statusCode: 503 });
  });

  it("fails file allocation closed without inventing a storage provider", async () => {
    const port = new UnavailableFileStoragePort();
    await expect(port.allocateQuarantineUpload({
      tenantId: "tenant",
      correlationId: "correlation",
      capabilityEnabled: true,
      permissionGranted: true,
      scope: "tenant",
      objectPolicyAllowed: true,
      fileObjectId: "file",
      declaredMime: "application/pdf",
      sizeBytes: 1,
      classification: "restricted"
    })).rejects.toMatchObject({ code: "TCDX.DEPENDENCY.UNAVAILABLE", statusCode: 503 });
  });
});
