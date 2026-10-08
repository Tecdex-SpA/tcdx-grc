import type { AuthenticationProvider, AuthenticationProviderAvailability, CurrentPrincipalAuthorization } from "@tcdx-grc/contracts";
import { brandNames } from "./branding.js";

export const providerLabels: Readonly<Record<AuthenticationProvider, string>> = {
  ZOHO: "Zoho",
  MICROSOFT_ENTRA_ID: "Microsoft Entra ID",
  GOOGLE_WORKSPACE: "Google Workspace",
  TCDX_MANAGED_IDENTITY: brandNames.managedIdentity
};

const providers = Object.keys(providerLabels) as AuthenticationProvider[];
const managedCodes = new Set([
  "platform.managed_identity.read", "platform.managed_identity.create",
  "platform.managed_identity.update", "platform.managed_identity.administer"
]);

export function parseProviderAvailability(value: unknown): AuthenticationProviderAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Array.isArray(record.providers) || record.providers.length !== providers.length) return null;
  const entries = record.providers as unknown[];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).length !== 2 || typeof item.provider !== "string"
      || !providers.includes(item.provider as AuthenticationProvider) || typeof item.available !== "boolean"
      || seen.has(item.provider)) return null;
    seen.add(item.provider);
  }
  return value as AuthenticationProviderAvailability;
}

export function parseCurrentAuthorization(value: unknown, expectedTenant: string | null): CurrentPrincipalAuthorization | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "evaluated_at,platform_permissions,tenant_permissions"
    || typeof record.evaluated_at !== "string" || !Number.isFinite(Date.parse(record.evaluated_at))
    || !Array.isArray(record.platform_permissions)
    || !record.platform_permissions.every((code) => typeof code === "string" && /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2}$/.test(code))
    || new Set(record.platform_permissions).size !== record.platform_permissions.length) return null;
  const tenant = record.tenant_permissions;
  if (expectedTenant === null) {
    if (tenant !== null) return null;
  } else {
    if (!tenant || typeof tenant !== "object" || Array.isArray(tenant)) return null;
    const projection = tenant as Record<string, unknown>;
    if (Object.keys(projection).sort().join(",") !== "permissions,tenant_id" || projection.tenant_id !== expectedTenant
      || !projection.permissions || typeof projection.permissions !== "object" || Array.isArray(projection.permissions)) return null;
    if (Object.keys(projection.permissions).some((code) => managedCodes.has(code))) return null;
  }
  return value as CurrentPrincipalAuthorization;
}

export function managedIdentityEligibility(value: CurrentPrincipalAuthorization | null): ReadonlySet<string> {
  return new Set(value?.platform_permissions.filter((code) => managedCodes.has(code)) ?? []);
}
