import { describe, expect, it } from "vitest";
import { BlockedIdentityVerifier } from "./authentication.js";

describe("authentication foundation", () => {
  it("fails closed while the approved OIDC runtime profile is absent", async () => {
    await expect(new BlockedIdentityVerifier().verifyBearerToken("untrusted-token"))
      .rejects.toMatchObject({ code: "TCDX.AUTHENTICATION.INVALID", statusCode: 401 });
  });
});
