import { publishedCoverage } from "./testing/published-coverage.js";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import type { AnySchemaObject } from "ajv";
import { contractSchemaValidator } from "./testing/schema-validator.js";
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
const { compilerFor: schemaCompiler, compile: validator } = contractSchemaValidator(api.components.schemas);
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
  it("enforces dialect-specific keywords and rejects malformed schemas in both dialects", () => {
    // Synthetic validator probes only; no published Schema Object is modified.
    const probes = contractSchemaValidator({
      legacy: { $schema: "http://json-schema.org/draft-07/schema#", type: "object", dependencies: { a: ["b"] } },
      modern: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "array", prefixItems: [{ type: "integer" }], items: false },
      malformedLegacy: { $schema: "http://json-schema.org/draft-07/schema#", type: "invalid-type" },
      malformedModern: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "invalid-type" },
      unsupported: { $schema: "urn:unsupported:dialect", type: "object" }
    });
    const legacy = probes.compile("legacy");
    expect(legacy({ a: 1, b: 2 })).toBe(true);
    expect(legacy({ a: 1 })).toBe(false);
    const modern = probes.compile("modern");
    expect(modern([1])).toBe(true);
    expect(modern(["1"])).toBe(false);
    expect(modern([1, 2])).toBe(false);
    for (const name of ["malformedLegacy", "malformedModern"]) {
      expect(probes.compilerFor(name).validateSchema({ type: "invalid-type" })).toBe(false);
      expect(() => probes.compile(name)).toThrow();
    }
    expect(() => probes.compile("unsupported")).toThrow("Unsupported published JSON Schema dialect");
    expect(() => probes.compile("absent")).toThrow("Unknown contract schema");
  });

  it.each([
    ["numeric int64", { configuration_definition: { version_number: 1 } }],
    ["zero version", { configuration_definition: { version_number: "0" } }],
    ["leading zero", { configuration_definition: { version_number: "01" } }],
    ["int64 overflow", { configuration_definition: { version_number: "9223372036854775808" } }],
    ["missing required fields", {}],
    ["unexpected property", { secret_value: "fixture" }],
    ["invalid UUID", { effective_configuration_id: "invalid" }],
    ["invalid timestamp", { effective_at: "invalid" }],
    ["timestamp outside UTC", { effective_at: "2026-10-09T01:00:00+01:00" }],
    ["invalid hash", { input_hash: "invalid" }],
    ["zero ordinal", { layers: [{ ordinal: 0 }] }],
    ["non-boolean selection", { layers: [{ was_selected: 1 }] }]
  ])("rejects invalid published EC data with its declared dialect: %s", (_case, defect) => {
    const validate = validator("EffectiveConfigurationDetailReadResult");
    const fixture = {
      operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: tenantId,
      result: {
        effective_configuration_id: tenantId,
        configuration_definition: { configuration_definition_id: tenantId, configuration_code: "fixture", version_number: "9223372036854775807" },
        resolved_for_subject_id: null, effective_at: "2026-10-09T00:00:00Z", resolved_at: "2026-10-09T00:00:00Z",
        resolution_status: "fixture", input_hash: "a".repeat(64),
        layers: [{ configuration_definition_id: tenantId, configuration_override_id: null, precedence_level: "fixture", ordinal: 1, was_selected: true }]
      }
    };
    expect(validate(fixture)).toBe(true);
    const invalid = structuredClone(fixture);
    if (_case === "missing required fields") {
      delete (invalid.result as Partial<typeof fixture.result>).layers;
    } else if ("configuration_definition" in defect) {
      Object.assign(invalid.result.configuration_definition, defect.configuration_definition);
    } else if ("layers" in defect) {
      Object.assign(invalid.result.layers[0]!, defect.layers[0]);
    } else {
      Object.assign(invalid.result, defect);
    }
    expect(validate(invalid)).toBe(false);
  });

  it("validates complete OpenAPI YAML, local references and every component JSON schema", () => {
    expect(document.errors).toEqual([]);
    expect(api.openapi).toBe("3.1.0");
    expect(api.info.title).toBeTruthy();
    expect(api.info.version).toBeTruthy();
    expect(api.servers.map(({ url }) => url)).toContain("/api/v1");
    visitReferences(api);
    for (const [name, schema] of Object.entries(api.components.schemas)) {
      const compiler = schemaCompiler(name);
      expect(compiler.validateSchema(schema), `${name}: ${compiler.errorsText()}`).toBe(true);
      expect(() => validator(name), name).not.toThrow();
    }
  });

  it("retains exact operation/path/method parity, traceability and mutation counts", () => {
    const operations = Object.entries(api.paths).flatMap(([path, methods]) => Object.entries(methods).filter(([method]) => ["get", "post", "put"].includes(method)).map(([method, operation]) => ({ path, method, operation })));
    const rows = matrix.split("\n").filter((row) => /^\| \w+ \| (GET|POST|PUT) `/.test(row));
    // Frozen C-04W annotations plus the hash-bound INITIAL_SOURCE operation successor.
    expect(operations).toHaveLength(publishedCoverage(matrix).total);
    expect(rows).toHaveLength(operations.length);
    expect(new Set(operations.map(({ operation }) => operation.operationId)).size).toBe(operations.length);
    expect(operations.filter(({ method }) => method === "get")).toHaveLength(62);
    expect(operations.filter(({ method }) => method !== "get")).toHaveLength(publishedCoverage(matrix).mutations);
    expect(api.paths["/platform/plan-versions"]!.get!.operationId).toBe("planVersionSelectableList");
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
    const tenantOnly: CurrentPrincipalAuthorization = { ...authorizationFixture(), tenant_permissions: { tenant_id: tenantId, default_timezone: "Europe/Berlin", permissions: { "controls.control.read": scopes } } };
    expect(authorizationValidator(tenantOnly)).toBe(true);
    expect(tenantOnly.platform_permissions).toEqual([]);
    expect(authorizationValidator({ ...authorizationFixture(), platform_permissions: miPermissions })).toBe(true);
    for (const scope of scopes) expect(scopeValidator(scope)).toBe(true);
  });

  it.each(miPermissions)("rejects platform-only MI permission %s in a tenant projection", (permission) => {
    expect(authorizationValidator({ ...authorizationFixture(), tenant_permissions: { tenant_id: tenantId, default_timezone: "Europe/Berlin", permissions: { [permission]: [{ scope_kind: "tenant" }] } } })).toBe(false);
  });

  it("rejects scope widening, missing/foreign fields, duplicate/empty scopes and role names as permissions", () => {
    expect(scopeValidator({ scope_kind: "platform" })).toBe(false);
    expect(scopeValidator({ scope_kind: "process" })).toBe(false);
    expect(scopeValidator({ scope_kind: "tenant", process_id: tenantId })).toBe(false);
    expect(scopeValidator({ scope_kind: "process", process_id: tenantId, service_id: tenantId })).toBe(false);
    expect(scopeValidator({ scope_kind: "owned_object", object_id: tenantId })).toBe(false);
    expect(scopeValidator({ scope_kind: "service", service_id: "invalid" })).toBe(false);
    for (const permissions of [{ "controls.control.read": [] }, { "controls.control.read": [{ scope_kind: "tenant" }, { scope_kind: "tenant" }] }, { PLATFORM_ADMIN: [{ scope_kind: "tenant" }] }]) {
      expect(authorizationValidator({ ...authorizationFixture(), tenant_permissions: { tenant_id: tenantId, default_timezone: "Europe/Berlin", permissions } })).toBe(false);
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
    expect(seeds.permissionRows + extraRows.reduce((sum, value) => sum + value.permissionRows, 0)).toBe(175);
    const mi = seeds.managedIdentityPermissions as { permissionCodes: string[] };
    expect(mi.permissionCodes).toEqual(miPermissions);
    for (const code of mi.permissionCodes) expect(permissionCatalog).toContain(code);
    expect(permissionCatalog).toContain("`platform` scope");
    expect(permissionCatalog).not.toContain("currentPrincipalAuthorizationRead");
    expect(permissionCatalog).not.toContain("authenticationProviderList");
    const migrations = JSON.parse(migrationSource) as { migrations: Array<{ id: string }> };
    expect(migrations.migrations).toHaveLength(36);
    expect(migrations.migrations[27]?.id).toBe("20261006000200");
    const physical = JSON.parse(schemaSource) as { tableCount: number; tables: Array<{ name: string }> };
    expect(physical.tableCount).toBe(244);
    const own = api.paths["/auth/me/authorization"]!.get!;
    const tables = [...String(own["x-tcdx-physical-entities"]).matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    for (const name of tables) expect(physical.tables.some((table) => table.name === name), name).toBe(true);
  });
});
