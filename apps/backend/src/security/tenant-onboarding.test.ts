import { describe, expect, it } from "vitest";
import { discoveryQuery } from "./user-identity-discovery.js";
import { initialOnboardingInput } from "./tenant-initial-onboarding.js";
import { newUuidV7 } from "../uuid.js";

describe("D1-R discovery and bounded onboarding input", () => {
  it.each([
    { mode: "tenant_exact", criterion: "username", value: "" },
    { mode: "tenant_exact", criterion: "username", value: "person*" },
    { mode: "tenant_exact", criterion: "username", value: "person%" },
    { mode: "tenant_exact", criterion: "username", value: "person?" },
    { mode: "tenant_exact", criterion: "display_name", value: "Person" },
    { mode: "tenant_exact", criterion: "email", value: "person" },
    { mode: "tenant_exact", criterion: "email", value: "person@example" },
    { mode: "tenant_exact", criterion: "username", value: "person", "page[size]": "1" },
    { mode: "tenant_exact", criterion: "username", value: "person", "page[cursor]": "cursor" },
    { mode: "tenant_exact", criterion: "username", value: "person", fuzzy: "true" },
    { mode: "tenant_exact", criterion: "username", value: "person", prefix: "true" },
    { mode: "tenant_exact", criterion: "username", value: "person", autocomplete: "true" },
    { mode: "tenant_exact", criterion: "username", value: "person", tenant_id: newUuidV7() },
    { mode: "tenant_exact", criterion: "username", value: ["person"] },
    { mode: "platform_search", criterion: "display_name", value: "Person", "page[size]": "0" },
    { mode: "platform_search", criterion: "display_name", value: "Person", "page[size]": "101" },
    { mode: "platform_search", criterion: "display_name", value: "Person", "page[cursor]": "invalid" },
    { mode: "list", criterion: "username", value: "person" }
  ])("rejects forbidden directory/query semantics %#", (query) => {
    expect(() => discoveryQuery(query)).toThrow("Invalid discovery query");
  });
  it("keeps email and username as exact lookup metadata without fuzzy normalization", () => {
    for (const [criterion, value] of [["email", "Person+tag@example.test"], ["username", "Person.Mixed"]]) {
      expect(discoveryQuery({ mode: "tenant_exact", criterion, value }).value).toBe(value);
    }
  });
  it("supports literal platform names and binds cursors to the submitted mode/filter", () => {
    const filter = discoveryQuery({ mode: "platform_search", criterion: "display_name", value: "100%_Person" });
    const cursor = Buffer.from(JSON.stringify({ version: 1, binding: filter.binding,
      created_at: new Date().toISOString(), user_identity_id: newUuidV7() })).toString("base64url");
    expect(discoveryQuery({ mode: filter.mode, criterion: filter.criterion, value: filter.value, "page[cursor]": cursor }).after).toBeDefined();
    expect(() => discoveryQuery({ mode: filter.mode, criterion: filter.criterion, value: "Other", "page[cursor]": cursor })).toThrow();
  });
  const body = () => ({ tenant: { tenant_code: "D2-UNIT", legal_name: "Isolated Test", display_name: "Isolated Test", default_timezone: "UTC" },
    initial_administrator: { kind: "existing_identity", user_identity_id: newUuidV7() } });
  it.each(["tenant_id", "bootstrap", "role_codes", "email", "issuer", "subject", "actor", "subscription", "credentials"])(
    "rejects wrapper field %s, preventing arbitrary tenant bootstrap and identity authority input", (field) => {
      expect(() => initialOnboardingInput({ ...body(), [field]: "not permitted" })).toThrow();
    });
  it("allows only existing or separately provisioned canonical identity selections", () => {
    for (const kind of ["existing_identity", "provisioned_managed_identity"]) {
      const request = body(); request.initial_administrator.kind = kind;
      expect(initialOnboardingInput(request).initial_administrator.user_identity_id).toBe(request.initial_administrator.user_identity_id);
    }
    const request = body(); request.initial_administrator.kind = "new_managed_identity";
    expect(() => initialOnboardingInput(request)).toThrow();
  });
});
