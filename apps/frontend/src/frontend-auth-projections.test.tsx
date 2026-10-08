import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { managedIdentityEligibility, parseCurrentAuthorization, parseProviderAvailability } from "./frontend-auth-projections.js";
import { ManagedIdentityWorkspace } from "./managed-identity.js";
import type { ApiClient } from "./api-client.js";

const providers = ["ZOHO", "MICROSOFT_ENTRA_ID", "GOOGLE_WORKSPACE", "TCDX_MANAGED_IDENTITY"] as const;
const availability = { providers: providers.map((provider) => ({ provider, available: provider === "TCDX_MANAGED_IDENTITY" })) };
const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const base = { evaluated_at: "2026-10-05T00:00:00.000Z", platform_permissions: [] as string[], tenant_permissions: null };

describe("MI7 frontend projection boundaries", () => {
  it("accepts only the closed four-provider availability payload", () => {
    expect(parseProviderAvailability(availability)?.providers.filter((provider) => provider.available).map((provider) => provider.provider))
      .toEqual(["TCDX_MANAGED_IDENTITY"]);
    expect(parseProviderAvailability({ providers: availability.providers.map((entry) => ({ ...entry, available: false })) })?.providers.every((entry) => !entry.available)).toBe(true);
    expect(parseProviderAvailability({ providers: [...availability.providers, { provider: "UNKNOWN", available: true }] })).toBeNull();
    expect(parseProviderAvailability({ providers: availability.providers.slice(0, 3) })).toBeNull();
    expect(parseProviderAvailability({ providers: availability.providers.map((entry) => ({ provider: entry.provider, available: "true" })) })).toBeNull();
  });

  it("uses exact Platform permissions, never role names or tenant grants", () => {
    const read = parseCurrentAuthorization({ ...base, platform_permissions: ["platform.managed_identity.read"] }, null);
    expect([...managedIdentityEligibility(read)]).toEqual(["platform.managed_identity.read"]);
    const tenantOnly = parseCurrentAuthorization({ ...base, tenant_permissions: {
      tenant_id: tenantId, permissions: { "platform.role.read": [{ scope_kind: "tenant" }] }
    } }, tenantId);
    expect(managedIdentityEligibility(tenantOnly).size).toBe(0);
    expect(parseCurrentAuthorization({ ...base, effective_platform_role_codes: ["PLATFORM_ADMIN"] }, null)).toBeNull();
    expect(parseCurrentAuthorization({ ...base, tenant_permissions: { tenant_id: tenantId,
      permissions: { "platform.managed_identity.administer": [{ scope_kind: "tenant" }] } } }, tenantId)).toBeNull();
    expect(managedIdentityEligibility(parseCurrentAuthorization({ ...base, platform_permissions: ["platform.managed_identity.create", "platform.managed_identity.administer"] }, null)).size).toBe(2);
    expect(managedIdentityEligibility(null).size).toBe(0);
  });

  it("renders only permission-eligible MI entry and keeps forbidden operations absent", () => {
    const render = (codes: string[]) => renderToStaticMarkup(<ManagedIdentityWorkspace api={{} as ApiClient}
      permissions={new Set(codes)} authorizeFresh={async () => false}/>);
    const read = render(["platform.managed_identity.read"]);
    expect(read).toContain("Listado de identidades");
    expect(read).not.toContain("Provisionar identidad");
    expect(read).not.toContain("Restablecer contraseña");
    const create = render(["platform.managed_identity.create"]);
    expect(create).toContain("Provisionar identidad");
    expect(create).not.toContain("Listado de identidades");
    const denied = render([]);
    expect(denied).not.toContain("Provisionar identidad");
    expect(denied).not.toContain("Listado de identidades");
    for (const forbidden of ["Eliminar", "Vincular", "Desvincular", "Suplantar", "Keycloak Admin"]) expect(denied).not.toContain(forbidden);
  });
});
