import { describe, expect, it } from "vitest";
import { authorize } from "./authorization.js";

const base = {
  authenticated: true,
  tenantMembershipActive: true,
  capabilityEnabled: true,
  permissions: new Set(["evidence.evidence.read"]),
  scopes: new Set(["tenant" as const]),
  objectAccessible: true,
  sodAllowed: true
};

describe("authorization", () => {
  it("allows only when every authority dimension passes", () => {
    expect(() => authorize(base, { permission: "evidence.evidence.read", allowedScopes: new Set(["tenant"]) })).not.toThrow();
  });

  it.each(["authenticated", "tenantMembershipActive", "capabilityEnabled", "objectAccessible", "sodAllowed"] as const)("denies when %s fails", (key) => {
    expect(() => authorize({ ...base, [key]: false }, { permission: "evidence.evidence.read", allowedScopes: new Set(["tenant"]) })).toThrow("Access denied");
  });

  it("denies missing permission or scope", () => {
    expect(() => authorize({ ...base, permissions: new Set() }, { permission: "evidence.evidence.read", allowedScopes: new Set(["tenant"]) })).toThrow();
    expect(() => authorize(base, { permission: "evidence.evidence.read", allowedScopes: new Set(["owned_object"]) })).toThrow();
  });
});
