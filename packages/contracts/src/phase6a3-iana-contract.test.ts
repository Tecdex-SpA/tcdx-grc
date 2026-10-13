import approvedText from "../../../docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/continuity-r6/iana-approved.txt?raw";
import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";
import { contractSchemaValidator } from "./testing/schema-validator.js";
import source from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";

const api = parseDocument(source).toJS();
const validate = contractSchemaValidator(api.components.schemas).compile("CurrentPrincipalTenantPermissions");
const fixture = { tenant_id: "01900000-0000-7000-8000-000000000001", permissions: {}, default_timezone: "Europe/Berlin" };
describe("exact approved STEP6A3 D3 contract", () => {
  it("retains the exact approved UTF8 bytes and adds only the required zone field", async () => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(approvedText));
    expect(Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("")).toBe("6205faaafa3cb0cbd4d0cf34cd9c8343ccca64392e638a833e10fa7db8c73375");
    expect(Object.keys(api.components.schemas.CurrentPrincipalTenantPermissions.properties).sort()).toEqual(["default_timezone", "permissions", "tenant_id"]);
    expect(validate(fixture)).toBe(true);
    expect(validate({ ...fixture, extra: true })).toBe(false);
    const { default_timezone: _zone, ...old } = fixture;
    expect(validate(old)).toBe(false);
  });
  it("prepares one major v2 transport without changing other v1 operations", () => {
    expect(api.paths["/auth/me/authorization"].get.servers).toEqual([{ url: "/api/v2" }]);
    expect(api.paths["/auth/me/authorization"].get.operationId).toBe("currentPrincipalAuthorizationRead");
    expect(api.servers.map((server: { url: string }) => server.url)).toEqual(["/api/v1"]);
    expect(api.paths["/auth/providers"].get.servers).toBeUndefined();
  });
  it.each([null, "", "+02:00", "Invalid/Timezone", "x".repeat(65)])("denies invalid IANA shape %s", zone => {
    expect(validate({ ...fixture, default_timezone: zone })).toBe(false);
  });
});
