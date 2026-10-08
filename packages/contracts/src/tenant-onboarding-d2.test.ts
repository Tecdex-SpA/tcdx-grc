import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import source from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import contract from "../../../docs/executable-contracts/25_TENANT_INITIAL_ONBOARDING_AND_IDENTITY_DISCOVERY.md?raw";
import manifest from "../../../database/migrations/manifest.json?raw";
import migration from "../../../database/migrations/20261006000200_user_identity_discovery_permission_publication.sql?raw";
import projectionSource from "../../../apps/backend/src/security/permission-projection-catalog.generated.ts?raw";
const permissionProjectionCatalog = JSON.parse(projectionSource.slice(projectionSource.indexOf(" = ") + 3).trim().slice(0, -1));

const api = parse(source);
const ajv = new Ajv2020({ strict: false });
const installFormats = addFormats as unknown as (instance: Ajv2020) => void;
installFormats(ajv); ajv.addSchema({ $id: "urn:tcdx:d2", components: api.components });
const validate = (name: string) => ajv.compile({ $ref: `urn:tcdx:d2#/components/schemas/${name}` });
const id = "01900000-0000-7000-8000-000000000001";

describe("D2 consumes frozen D1-R contracts; publication is a separate gate", () => {
  it("uses the approved single Permission and existing two scopes without authority inference", () => {
    expect(permissionProjectionCatalog["platform.user_identity.read"]).toEqual({ capabilities: ["CORE_PLATFORM"], scopes: ["platform", "tenant"] });
    const discovery = api.paths["/user-identities"].get;
    expect(discovery.operationId).toBe("userIdentityDiscovery"); expect(discovery["x-tcdx-permission"]).toBe("`platform.user_identity.read`");
    expect(discovery["x-tcdx-input-log-policy"]).toBe("OMIT_RAW_LOOKUP_VALUE");
    expect(discovery["x-tcdx-tenant-exact-policy"]).toEqual({ list: false, pagination: false, prefix: false, fuzzy: false, autocomplete: false, wildcard: false, maximum_results: 1 });
    const onboarding = api.paths["/platform/tenants:initial-onboarding"].post;
    expect(onboarding["x-tcdx-required-permissions"]).toEqual(["platform.tenant.create", "platform.user_identity.read"]);
    expect(Object.keys(api.paths).filter((path) => /bootstrap/i.test(path))).toEqual([]);
    expect(contract).toContain("TENANT_BOOTSTRAP_PUBLIC_ENDPOINT=0");
  });
  it("forbids directory fields and excess results in tenant-safe discovery", () => {
    const tenant = validate("UserIdentityDiscoveryTenantPage");
    const candidate = { user_identity_id: id, display_name: "Person", provider: null, provider_display: null, lifecycle_state: "active" };
    expect(tenant({ items: [candidate], meta: { has_more: false, next_cursor: null } })).toBe(true);
    for (const field of ["email_normalized", "username", "issuer", "subject", "identity_key", "credentials", "mfa_enrolled", "reconciliation_marker"]) {
      expect(tenant({ items: [{ ...candidate, [field]: "forbidden" }], meta: { has_more: false, next_cursor: null } }), field).toBe(false);
    }
    expect(tenant({ items: [candidate, candidate], meta: { has_more: false, next_cursor: null } })).toBe(false);
  });
  it("cannot call a partial or credential-bearing transport receipt completed", () => {
    const result = validate("TenantInitialOnboardingResult");
    const complete = { tenant_id: id, user_identity_id: id, membership_id: id, initial_assignment_id: id,
      completed_steps: ["tenant_create", "tenant_bootstrap"], pending_steps: [] };
    expect(result(complete)).toBe(true);
    expect(result({ ...complete, completed_steps: ["tenant_create"], pending_steps: ["tenant_bootstrap"] })).toBe(false);
    expect(result({ ...complete, temporary_credential: "forbidden" })).toBe(false);
  });
  it("registers the next available local DATA-ONLY candidate and preserves historical bytes", async () => {
    const rows = JSON.parse(manifest).migrations;
    expect(rows).toHaveLength(30);
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(migration))), (byte) => byte.toString(16).padStart(2, "0")).join("");
    expect(rows[27]).toMatchObject({ id: "20261006000200", sha256, transactional: true });
    expect(rows[26]).toMatchObject({ id: "20261006000100", sha256: "2a3c0d14748a9494d6ef60572802782eab2cdf3f4e60bef6026d73c48c1b6399" });
    expect(migration).not.toMatch(/\b(?:CREATE|ALTER|DROP|TRUNCATE)\s+(?:TABLE|SCHEMA|INDEX|TYPE|VIEW|FUNCTION)/i);
    expect(migration).not.toMatch(/INSERT INTO iam\.(?:roles|user_identities|tenant_memberships|membership_roles|platform_role_assignments)\b/i);
    expect(migration).toContain("r.ownership_class,r.tenant_id,r.role_id,p.permission_id");
    expect(migration).toContain("r.is_baseline AND r.lifecycle_state='published'");
  });
});
