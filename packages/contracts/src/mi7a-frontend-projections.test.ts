import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import { Ajv2020, type AnySchemaObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import openApiSource from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import permissionCatalog from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import projectionContract from "../../../docs/executable-contracts/23_FRONTEND_AUTHENTICATION_AUTHORIZATION_PROJECTIONS.md?raw";
import schemaSource from "../../../database/expected-schema.json?raw";
import seedSource from "../../../database/seed-manifest.json?raw";
import migrationSource from "../../../database/migrations/manifest.json?raw";
import type { AuthenticationProvider, AuthenticationProviderAvailability, CurrentPrincipalAuthorization, TenantPermissionScope } from "./index.js";

type Operation = {
  operationId: string;
  security: Array<Record<string, string[]>>;
  responses: Record<string, { $ref: string }>;
  parameters?: Array<{ $ref: string }>;
  [key: string]: unknown;
};
type Api = {
  openapi: string;
  info: { title: string; version: string };
  servers: Array<{ url: string }>;
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, AnySchemaObject>; [key: string]: unknown };
};

const document = parseDocument(openApiSource, { uniqueKeys: true });
const api = document.toJS() as Api;
const ajv = new Ajv2020({ strict: false, allErrors: true });
// Formats come from the existing locked validator package, not custom approximations.
const installFormats = addFormats as unknown as (instance: Ajv2020) => void;
installFormats(ajv);
ajv.addSchema({ $id: "urn:tcdx:mi7a:openapi", components: api.components });
const validator = (name: string) => ajv.compile({ $ref: `urn:tcdx:mi7a:openapi#/components/schemas/${name}` });
const providerValidator = validator("AuthenticationProviderAvailability");
const authorizationValidator = validator("CurrentPrincipalAuthorization");
const scopeValidator = validator("TenantPermissionScope");
const providers: AuthenticationProvider[] = ["ZOHO", "MICROSOFT_ENTRA_ID", "GOOGLE_WORKSPACE", "TCDX_MANAGED_IDENTITY"];
const miPermissions = ["platform.managed_identity.read", "platform.managed_identity.create", "platform.managed_identity.update", "platform.managed_identity.administer"];
// Synthetic shape fixtures only: these do not describe current runtime availability/grants.
const providerFixture = (available: boolean): AuthenticationProviderAvailability => ({ providers: providers.map((provider) => ({ provider, available })) });
const tenantId = "01900000-0000-7000-8000-000000000001";
const authorizationFixture = (): CurrentPrincipalAuthorization => ({ evaluated_at: "2026-10-05T12:00:00Z", platform_permissions: [], tenant_permissions: null });

function resolveLocalRef(reference: string): unknown {
  expect(reference.startsWith("#/"), reference).toBe(true);
  return reference.slice(2).split("/").reduce<unknown>((value, segment) =>
    value && typeof value === "object" ? (value as Record<string, unknown>)[segment.replaceAll("~1", "/").replaceAll("~0", "~")] : undefined, api);
}

function visitReferences(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "$ref") expect(resolveLocalRef(String(nested)), String(nested)).toBeDefined();
    else visitReferences(nested);
  }
}

describe("MI7A schema-first frontend projections (no runtime implementation)", () => {
  it("validates complete OpenAPI YAML, local references and every component JSON schema", () => {
    expect(document.errors).toEqual([]);
    expect(api.openapi).toBe("3.1.0");
    expect(api.info.title).toBeTruthy();
    expect(api.info.version).toBeTruthy();
    expect(api.servers.map(({ url }) => url)).toContain("/api/v1");
    visitReferences(api);
    for (const [name, schema] of Object.entries(api.components.schemas)) {
      expect(ajv.validateSchema(schema), `${name}: ${ajv.errorsText()}`).toBe(true);
      expect(() => validator(name), name).not.toThrow();
    }
  });

  it("retains exact operation/path/method parity, traceability and mutation counts", () => {
    const operations = Object.entries(api.paths).flatMap(([path, methods]) => Object.entries(methods).filter(([method]) => ["get", "post", "put"].includes(method)).map(([method, operation]) => ({ path, method, operation })));
    const rows = matrix.split("\n").filter((row) => /^\| \w+ \| (GET|POST|PUT) `/.test(row));
    expect(operations).toHaveLength(161);
    expect(rows).toHaveLength(operations.length);
    expect(new Set(operations.map(({ operation }) => operation.operationId)).size).toBe(operations.length);
    expect(operations.filter(({ method }) => method === "get")).toHaveLength(56);
    expect(operations.filter(({ method }) => method !== "get")).toHaveLength(105);
    for (const { method, path, operation } of operations) {
      expect(rows.filter((row) => row.startsWith(`| ${operation.operationId} | ${method.toUpperCase()} \`${path}\``))).toHaveLength(1);
      for (const field of ["capability", "permission", "scope", "audit-event", "domain-events", "idempotency-class", "transaction-boundary", "physical-entities", "rector-source"]) {
        expect(operation[`x-tcdx-${field}`], `${operation.operationId}: ${field}`).toBeTruthy();
      }
      expect(Object.keys(operation.responses).some((status) => /^2\d\d$/.test(status)), operation.operationId).toBe(true);
    }
    expect(operations.filter(({ operation }) => operation.operationId.startsWith("managedIdentity"))).toHaveLength(8);
  });

  it("uses public and self context authorities without inventing Permissions or tenant grants", () => {
    const provider = api.paths["/auth/providers"]!.get!;
    const own = api.paths["/auth/me/authorization"]!.get!;
    expect(provider.security).toEqual([]);
    expect(provider["x-tcdx-permission"]).toBe("public authentication context");
    expect(provider.parameters).toEqual([{ $ref: "#/components/parameters/CorrelationId" }]);
    expect(own.security).toEqual([{ bearerAuth: [] }]);
    expect(own["x-tcdx-permission"]).toBe("authenticated context");
    const tenantParameter = resolveLocalRef("#/components/parameters/AuthorizationProjectionTenantId") as Record<string, unknown>;
    expect(tenantParameter).toMatchObject({ name: "X-TCDX-Tenant-Id", in: "header", required: false });
    for (const operation of [provider, own]) {
      expect(operation.requestBody).toBeUndefined();
      expect(operation["x-tcdx-audit-event"]).toBe("NONE");
      expect(operation["x-tcdx-domain-events"]).toBe("NONE");
      expect(operation["x-tcdx-transaction-boundary"]).toBe("RO");
      expect(operation["x-tcdx-idempotency-class"]).toBe("NATURALLY_IDEMPOTENT");
      expect(operation["x-tcdx-response-cache-control"]).toBe("no-store (all statuses)");
    }
    expect(own["x-tcdx-response-vary"]).toBe("Authorization, X-TCDX-Tenant-Id (all statuses)");
    expect(own.responses).toHaveProperty("401");
    expect(own.responses).toHaveProperty("403");
    expect(own.responses).toHaveProperty("404");
    expect(provider.responses).toHaveProperty("429");
    expect(provider.responses).toHaveProperty("503");
    const access = api.components.schemas.EffectiveAccess!;
    expect(Object.keys(access.properties as object)).toEqual(["available_tenant_contexts", "effective_platform_role_codes"]);
  });

  it("accepts synthetic availability states and order without asserting runtime health or configuration", () => {
    expect(providerValidator(providerFixture(false))).toBe(true);
    expect(providerValidator(providerFixture(true))).toBe(true);
    const mixed = providerFixture(false);
    mixed.providers[1]!.available = true;
    mixed.providers.reverse();
    expect(providerValidator(mixed)).toBe(true);
  });

  it("rejects missing, extra, duplicate and unknown providers including differing duplicate booleans", () => {
    const valid = providerFixture(false);
    expect(providerValidator({ providers: valid.providers.slice(1) })).toBe(false);
    expect(providerValidator({ providers: [...valid.providers, valid.providers[0]] })).toBe(false);
    expect(providerValidator({ providers: [valid.providers[0], { provider: "ZOHO", available: true }, ...valid.providers.slice(2)] })).toBe(false);
    expect(providerValidator({ providers: [{ provider: "GITHUB", available: false }, ...valid.providers.slice(1)] })).toBe(false);
    expect(providerValidator({ providers: [{ provider: "ZOHO", available: "true" }, ...valid.providers.slice(1)] })).toBe(false);
    expect(providerValidator({})).toBe(false);
  });

  it.each(["issuer", "client_id", "client_secret", "realm", "admin_url", "internal_host", "database", "token", "totp", "tenant_id", "failure_details"])("rejects public configuration disclosure field %s", (field) => {
    const valid = providerFixture(false);
    expect(providerValidator({ ...valid, [field]: "synthetic" })).toBe(false);
    expect(providerValidator({ providers: [{ ...valid.providers[0], [field]: "synthetic" }, ...valid.providers.slice(1)] })).toBe(false);
  });

  it("keeps denied platform access separate from tenant permission grants and preserves scope references", () => {
    expect(authorizationValidator(authorizationFixture())).toBe(true);
    const scopes: TenantPermissionScope[] = [{ scope_kind: "tenant" }, { scope_kind: "organizational_unit", organizational_unit_id: tenantId }, { scope_kind: "process", process_id: tenantId }, { scope_kind: "service", service_id: tenantId }, { scope_kind: "audit_engagement", audit_id: tenantId }, { scope_kind: "assigned_object" }, { scope_kind: "owned_object" }];
    const tenantOnly: CurrentPrincipalAuthorization = { ...authorizationFixture(), tenant_permissions: { tenant_id: tenantId, permissions: { "controls.control.read": scopes } } };
    expect(authorizationValidator(tenantOnly)).toBe(true);
    expect(tenantOnly.platform_permissions).toEqual([]);
    expect(authorizationValidator({ ...authorizationFixture(), platform_permissions: miPermissions })).toBe(true);
    for (const scope of scopes) expect(scopeValidator(scope)).toBe(true);
  });

  it.each(miPermissions)("rejects platform-only MI permission %s in a tenant projection", (permission) => {
    expect(authorizationValidator({ ...authorizationFixture(), tenant_permissions: { tenant_id: tenantId, permissions: { [permission]: [{ scope_kind: "tenant" }] } } })).toBe(false);
  });

  it("rejects scope widening, missing/foreign fields, duplicate/empty scopes and role names as permissions", () => {
    expect(scopeValidator({ scope_kind: "platform" })).toBe(false);
    expect(scopeValidator({ scope_kind: "process" })).toBe(false);
    expect(scopeValidator({ scope_kind: "tenant", process_id: tenantId })).toBe(false);
    expect(scopeValidator({ scope_kind: "process", process_id: tenantId, service_id: tenantId })).toBe(false);
    expect(scopeValidator({ scope_kind: "owned_object", object_id: tenantId })).toBe(false);
    expect(scopeValidator({ scope_kind: "service", service_id: "invalid" })).toBe(false);
    for (const permissions of [{ "controls.control.read": [] }, { "controls.control.read": [{ scope_kind: "tenant" }, { scope_kind: "tenant" }] }, { PLATFORM_ADMIN: [{ scope_kind: "tenant" }] }]) {
      expect(authorizationValidator({ ...authorizationFixture(), tenant_permissions: { tenant_id: tenantId, permissions } })).toBe(false);
    }
    expect(authorizationValidator({ ...authorizationFixture(), platform_permissions: [miPermissions[0], miPermissions[0]] })).toBe(false);
    expect(authorizationValidator({ ...authorizationFixture(), platform_permissions: ["PLATFORM_ADMIN"] })).toBe(false);
    expect(authorizationValidator({ ...authorizationFixture(), allowed: true })).toBe(false);
    expect(authorizationValidator({ ...authorizationFixture(), roles: ["TENANT_ADMIN"] })).toBe(false);
    expect(authorizationValidator({ ...authorizationFixture(), evaluated_at: "invalid" })).toBe(false);
  });

  it("retains canonical configuration, scoped grant, entitlement, freshness and backend enforcement semantics", () => {
    for (const expected of ["oidc.configured", "managedIdentityOidc.configured", "configured/enabled", "not **live/healthy**", "No synchronous", "No frontend booleans", "iam.platform_role_assignments", "TenantMembership", "RolePermission", "entitlement", "Never combine a permission", "exclusive end", "consistent PostgreSQL snapshot", "Object\npolicy and SoD", "Every endpoint independently revalidates", "late replies", "hidden tab", "no new self-read Permission"]) {
      expect(projectionContract.toLowerCase().replaceAll("\n", " ")).toContain(expected.toLowerCase().replaceAll("\n", " "));
    }
    expect(projectionContract).toContain("MULTI_PROCESS_GRC_SESSION_REVOCATION_RUNTIME_VALIDATION=PENDING_PHASE5_RUNTIME");
  });

  it("preserves MI permission scopes and follows approved P2A local publication continuity", () => {
    const seeds = JSON.parse(seedSource) as { permissionRows: number; [key: string]: unknown };
    const extraRows = Object.values(seeds).filter((value): value is { permissionRows: number } => !!value && typeof value === "object" && "permissionRows" in value);
    expect(seeds.permissionRows + extraRows.reduce((sum, value) => sum + value.permissionRows, 0)).toBe(172);
    const mi = seeds.managedIdentityPermissions as { permissionCodes: string[] };
    expect(mi.permissionCodes).toEqual(miPermissions);
    for (const code of mi.permissionCodes) expect(permissionCatalog).toContain(code);
    expect(permissionCatalog).toContain("`platform` scope");
    expect(permissionCatalog).not.toContain("currentPrincipalAuthorizationRead");
    expect(permissionCatalog).not.toContain("authenticationProviderList");
    const migrations = JSON.parse(migrationSource) as { migrations: Array<{ id: string }> };
    expect(migrations.migrations).toHaveLength(30);
    expect(migrations.migrations[27]?.id).toBe("20261006000200");
    const physical = JSON.parse(schemaSource) as { tableCount: number; tables: Array<{ name: string }> };
    expect(physical.tableCount).toBe(237);
    const own = api.paths["/auth/me/authorization"]!.get!;
    const tables = [...String(own["x-tcdx-physical-entities"]).matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    for (const name of tables) expect(physical.tables.some((table) => table.name === name), name).toBe(true);
  });
});
