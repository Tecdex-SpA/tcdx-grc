import { describe, expect, it, vi } from "vitest";
import { PostgresQueryCompiler, type Kysely } from "kysely";
import { buildApp } from "../app.js";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import type { VerifiedIdentity } from "../security/authentication.js";

type Options = {
  permission?: string; scope?: string; capability?: boolean; membership?: boolean;
  found?: boolean; foreignLayer?: boolean; failRead?: boolean;
  principalClass?: VerifiedIdentity["principalClass"]; concealedReference?: boolean; rowPatch?: Record<string, unknown>; layerPatches?: Array<Record<string, unknown>>;
  resolutionStatus?: string; versionNumber?: string; emptyLayers?: boolean; duplicateKey?: boolean; duplicateSelected?: boolean;
};
function fixture(options: Options = {}) {
  const tenantId = newUuidV7();
  const configurationId = newUuidV7();
  const definitionId = newUuidV7();
  const identity: VerifiedIdentity = {
    principalClass: options.principalClass ?? "HUMAN_INTERACTIVE", principalId: newUuidV7(),
    tokenId: newUuidV7(), expiresAt: new Date("2099-01-01T00:00:00.000Z")
  };
  const compiler = new PostgresQueryCompiler();
  const executeQuery = vi.fn((query: { sql: string; parameters: readonly unknown[] }) => {
    if (query.sql.includes("FROM iam.tenant_memberships")) {
      expect(query.parameters).toEqual([tenantId, identity.principalId]);
      return { rows: options.membership === false ? [] : [{ tenant_membership_id: newUuidV7() }] };
    }
    if (query.sql.includes("FROM iam.membership_roles")) return { rows: [
      { permission_code: options.permission ?? "configuration.effective_configuration.read", scope_kind: options.scope ?? "tenant", role_code: "DATA_ADMIN" },
      { permission_code: "controls.control.read", scope_kind: "tenant", role_code: "DATA_ADMIN" }
    ] };
    if (query.sql.includes("FROM platform.subscriptions")) return { rows: options.capability === false ? [] : [{ capability_group: "CORE_PLATFORM" }] };
    if (query.sql.includes("FROM config.effective_configurations")) {
      expect(query.parameters).toEqual([configurationId, tenantId]);
      expect(query.sql).toContain("ec.tenant_id=$2::uuid");
      expect(query.sql).toContain("layer.tenant_id <> ec.tenant_id");
      expect(query.sql).toContain("ld.configuration_definition_id IS NULL");
      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL");
      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL");
      expect(query.sql).not.toMatch(/l\.tenant_id\s*=\s*ec\.tenant_id/);
      if (options.failRead) throw new Error("private database hostname and secret must not escape");
      const root = {
        effective_configuration_id: configurationId, configuration_definition_id: definitionId,
        configuration_code: "FIXTURE_ONLY", version_number: options.versionNumber ?? "1", resolved_for_subject_id: null,
        effective_at: new Date(0), resolved_at: new Date(0),
        resolution_status: options.resolutionStatus ?? "stored_fixture_status", input_hash: "a".repeat(64),
        effective_text_value: "must not expose stored values", created_by_user_identity_id: identity.principalId
      };
      expect(query.sql).toContain("cd.version_number::text");
      expect(query.sql).toContain('l.precedence_level COLLATE "C"');
      expect(query.sql).toContain("lo.tenant_id <> ec.tenant_id");
      expect(query.sql).toContain("ld.tenant_id <> ec.tenant_id");
      const rows = options.emptyLayers ? [{ ...root, layer_id: null, layer_definition_id: null, configuration_override_id: null, precedence_level: null, ordinal: null, was_selected: null }]
        : [1, 2].map(ordinal => ({ ...root, layer_id: newUuidV7(), layer_definition_id: definitionId,
          configuration_override_id: null, precedence_level: "stored_fixture_level", ordinal: options.duplicateKey ? 1 : ordinal,
          was_selected: options.duplicateSelected || ordinal === 2 }));
      return { rows: options.found === false || options.foreignLayer || options.concealedReference ? [] : rows.map((row,index) => ({ ...row, ...options.rowPatch, ...options.layerPatches?.[index] })) };
    }
    throw new Error("Unexpected query; writes and transactions not available");
  });
  const database = {
    executeQuery, getExecutor: () => ({ transformQuery: (node: unknown) => node,
      compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId), executeQuery })
  } as unknown as Kysely<FoundationDatabase>;
  const verifyBearerToken = vi.fn(async (token: string) => {
    if (token !== "local-fixture") throw new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);
    return identity;
  });
  const app = buildApp(async () => false, { database, identityVerifier: { verifyBearerToken }, fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: "test" });
  const url = `/api/v1/effective-configurations/${configurationId}`;
  const headers = { authorization: "Bearer local-fixture", "x-tcdx-tenant-id": tenantId };
  return { app, url, headers, executeQuery, verifyBearerToken, tenantId, configurationId };
}
function configReads(f: ReturnType<typeof fixture>) {
  return f.executeQuery.mock.calls.filter(([q]) => q.sql.includes("FROM config.effective_configur"));
}
async function request(options: Options, expected: number, headers?: Record<string, string>, suffix = "") {
  const f = fixture(options);
  try {
    const response = await f.app.inject({ method: "GET", url: f.url + suffix, headers: headers ?? f.headers });
    expect(response.statusCode).toBe(expected);
    if (expected >= 400) {
      expect(response.headers["content-type"]).toContain("application/problem+json");
      expect(response.json()).toMatchObject({ retryable: false, correlation_id: response.headers["x-correlation-id"] });
    }
    return { response, reads: configReads(f).length, calls: f.executeQuery.mock.calls.length };
  } finally { await f.app.close(); }
}

describe("EC detail v1 authorized HTTP integration — memory query executor, not PostgreSQL/RLS", () => {
  it("returns 200 for the existing tenant permission and CORE_PLATFORM entitlement", async () => {
    const { response } = await request({}, 200);
    expect(response.json()).toMatchObject({ operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: response.headers["x-correlation-id"] });
  });
  it("minimizes attributes and returns the complete stored lineage without JSON values or actors", async () => {
    const { response } = await request({}, 200); const result = response.json().result;
    expect(Object.keys(result).sort()).toEqual(["effective_configuration_id", "configuration_definition", "resolved_for_subject_id", "effective_at", "resolved_at", "resolution_status", "input_hash", "layers"].sort());
    expect(result.layers).toHaveLength(2); expect(result.layers[0]).not.toHaveProperty("tenant_id");
    expect(result.configuration_definition.version_number).toBe("1");
    expect(result.effective_at).toBe("1970-01-01T00:00:00.000Z");
    expect(response.body).not.toContain("must not expose"); expect(response.body).not.toContain("created_by");
  });
  it("rejects a missing bearer with 401 before any database query", async () => {
    expect((await request({}, 401, {})).calls).toBe(0);
  });
  it("rejects an invalid bearer with 401 before any database query", async () => {
    expect((await request({}, 401, { authorization: "Bearer invalid" })).calls).toBe(0);
  });
  it("rejects missing tenant context with 403 before any database query", async () => {
    expect((await request({}, 403, { authorization: "Bearer local-fixture" })).calls).toBe(0);
  });
  it("conceals a missing active membership with 404 before a configuration read", async () => {
    expect((await request({ membership: false }, 404)).reads).toBe(0);
  });
  it("does not infer EC permission from a different permission", async () => {
    expect((await request({ permission: "controls.control.read" }, 403)).reads).toBe(0);
  });
  it("denies permission without entitlement", async () => {
    expect((await request({ capability: false }, 403)).reads).toBe(0);
  });
  it.each(["platform", "assigned_object", "owned_object", "organizational_unit", "process", "service"])("does not elevate unbound %s scope from another permission's tenant grant", async scope => {
    expect((await request({ scope }, 403)).reads).toBe(0);
  });
  it("conceals an inaccessible EC with 404 and never loads layers", async () => {
    expect((await request({ found: false }, 404)).reads).toBe(1);
  });
  it("fails closed when the root query excludes cross-tenant lineage", async () => {
    expect((await request({ foreignLayer: true }, 404)).reads).toBe(1);
  });
  it("binds another legitimate selected tenant rather than reusing a prior response", async () => {
    const first = fixture(); const second = fixture({ found: false });
    try {
      const good = await first.app.inject({ method: "GET", url: first.url, headers: first.headers }); expect(good.statusCode).toBe(200);
      const concealed = await second.app.inject({ method: "GET", url: second.url, headers: second.headers }); expect(concealed.statusCode).toBe(404);
      expect(first.tenantId).not.toBe(second.tenantId); expect(concealed.body).not.toContain(first.configurationId);
    } finally { await first.app.close(); await second.app.close(); }
  });
  it("rejects malformed path UUID without reading EC", async () => {
    const f = fixture();
    try { const r = await f.app.inject({ method: "GET", url: "/api/v1/effective-configurations/not-a-uuid", headers: f.headers }); expect(r.statusCode).toBe(400); expect(configReads(f)).toHaveLength(0); expect(f.executeQuery).not.toHaveBeenCalled(); }
    finally { await f.app.close(); }
  });
  it("rejects contextual query parameters absent from the existing detail operation", async () => {
    const result = await request({}, 400, undefined, "?methodology_version_ref=not-published"); expect(result.reads).toBe(0); expect(result.calls).toBe(0);
  });
  it("sanitizes a backend failure instead of returning empty success", async () => {
    const { response } = await request({ failRead: true }, 500);
    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(response.body).not.toContain("private database");
  });
  it("preserves historical stored codes without aliasing them into proposed enums", async () => {
    const { response } = await request({ resolutionStatus: "historical_fixture" }, 200);
    expect(response.json().result.resolution_status).toBe("historical_fixture");
  });
  it.each(["9223372036854775808", "0"])("does not silently corrupt stored version %s when producing the contracted decimal string projection", async versionNumber => {
    const { response, reads } = await request({ versionNumber }, 500);
    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(reads).toBe(1);
  });
  it.each(["9007199254740993", "9223372036854775807"])("preserves positive int64 version %s exactly as a decimal string", async versionNumber => {
    const { response, reads } = await request({ versionNumber }, 200);
    expect(response.json().result.configuration_definition.version_number).toBe(versionNumber); expect(reads).toBe(1);
  });
  it.each(["duplicateKey", "duplicateSelected"] as const)("rejects %s lineage ambiguity with the published conflict code", async defect => {
    const { response } = await request({ [defect]: true }, 409); expect(response.json().code).toBe("TCDX.CONFLICT.RESOURCE");
  });
  it("returns all persisted metadata with an empty layer collection, without fabricating a default", async () => {
    const { response } = await request({ emptyLayers: true }, 200); expect(response.json().result.layers).toEqual([]);
  });
  it("retains a persisted conflict status as metadata, without publishing an official value or recalculating", async () => {
    const { response } = await request({ resolutionStatus: "configuration_conflict" }, 200); expect(response.json().result.resolution_status).toBe("configuration_conflict");
  });
  it("supplies the contracted Bearer challenge and contracted private cache policy", async () => {
    const { response } = await request({}, 401, {}); expect(response.headers["www-authenticate"]).toBe("Bearer"); expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers.vary).toBe("Authorization, X-TCDX-Tenant-Id");
  });
  it("repeats an idempotent read without writes, transactions or materialization", async () => {
    const f = fixture();
    try {
      const first = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
      const second = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
      expect(first.statusCode).toBe(200); expect(second.statusCode).toBe(200); expect(first.json().result).toEqual(second.json().result);
      expect(configReads(f)).toHaveLength(2);
    } finally { await f.app.close(); }
  });
});


describe("EC detail defensive projection and reference policy", () => {
  it("denies machine identity without SQL", async () => {
    expect((await request({ principalClass: "MACHINE_TO_MACHINE" },403)).calls).toBe(0);
  });
  it("rejects malformed tenant context before SQL", async () => {
    const f=fixture();
    try { const response=await f.app.inject({method:"GET",url:f.url,headers:{...f.headers,"x-tcdx-tenant-id":"invalid"}});
      expect(response.statusCode).toBe(400);expect(f.executeQuery).not.toHaveBeenCalled(); }
    finally {await f.app.close();}
  });
  it("conceals an unavailable referenced object with identical absence response (executor boundary, not SQL proof)", async () => {
    const absent=await request({found:false},404);const hidden=await request({concealedReference:true},404);
    expect(hidden.response.json().code).toBe(absent.response.json().code);
    expect(hidden.response.json().message).toBe(absent.response.json().message);expect(hidden.reads).toBe(1);
  });
  it.each([
    {configuration_code:""},{configuration_code:"x".repeat(129)},
    {resolution_status:"x".repeat(33)},{resolution_status:null},{input_hash:"invalid"},
    {resolved_for_subject_id:"private-invalid-reference"},{configuration_definition_id:"invalid"},
    {effective_at:"invalid"},{effective_at:"2026-02-30T00:00:00Z"},{effective_at:"2026-10-09T00:00:00+00:00"},
    {resolved_at:new Date(NaN)},{version_number:"1\n"},{version_number:"1\r\n"},{input_hash:"a".repeat(64)+"\n"},{version_number:1},{version_number:"01"},{version_number:"-1"},
    {layer_id:"invalid"},{layer_definition_id:null},{configuration_override_id:"invalid"},
    {precedence_level:"x".repeat(33)},{ordinal:0},{ordinal:1.5},{ordinal:2147483648},{was_selected:1}
  ])("rejects corrupt metadata with opaque500: %o",async rowPatch=>{
    const {response}=await request({rowPatch},500);expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE");
    expect(response.body).not.toContain("private-invalid-reference");expect(response.body).not.toContain("configuration_definition");
  });
  it("does not confuse a corrupt nonempty layer with the LEFT JOIN zero-layer sentinel", async()=>{
    await request({emptyLayers:true,rowPatch:{ordinal:1}},500);
  });
  it("counts Unicode characters consistently with PostgreSQL varchar and JSON Schema", async()=>{
    const {response}=await request({rowPatch:{configuration_code:"😀".repeat(128),resolution_status:"😀".repeat(32)}},200);
    expect([...response.json().result.configuration_definition.configuration_code]).toHaveLength(128);
  });
  it("preserves UTC timestamp text precision and nullable references without coercion", async()=>{
    const {response}=await request({rowPatch:{effective_at:"2026-10-09T00:00:00.123456Z",configuration_override_id:newUuidV7(),resolved_for_subject_id:newUuidV7()}},200);
    expect(response.json().result.effective_at).toBe("2026-10-09T00:00:00.123456Z");
  });
  it("accepts separate selected levels and repeated ordinals across levels", async()=>{
    // SQL order/predicates are inspected by the fixture; actual PG execution is a separate gate.
    const {response}=await request({layerPatches:[{precedence_level:"historical_a",ordinal:1,was_selected:true},{precedence_level:"historical_b",ordinal:1,was_selected:true}]},200);expect(response.json().result.layers.map((x:{ordinal:number})=>x.ordinal)).toEqual([1,1]);
  });
});


it("matches the published closed OpenAPI response schema and exact int64 boundaries",async()=>{
  const {readFileSync}=await import("node:fs");const {createRequire}=await import("node:module");
  const require=createRequire(import.meta.url);const fastifyRequire=createRequire(require.resolve("fastify"));
  const compilerRequire=createRequire(fastifyRequire.resolve("@fastify/ajv-compiler"));
  const Ajv=compilerRequire("ajv");const addFormats=compilerRequire("ajv-formats");
  const ajv=new Ajv({strict:true,allErrors:true});addFormats(ajv);
  const openApi=readFileSync(new URL("../../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml",import.meta.url),"utf8");
  const schema=JSON.parse(openApi.split("    EffectiveConfigurationDetailReadResult:\n")[1]!.split("    OperationResult:\n")[0]!);
  const validate=ajv.compile(schema);const {response}=await request({},200);const envelope=response.json();
  expect(validate(envelope)).toBe(true);
  for (const version of ["1","9007199254740993","9223372036854775807"]) {
    const valid=structuredClone(envelope);valid.result.configuration_definition.version_number=version;expect(validate(valid)).toBe(true);
  }
  for (const version of ["0","-1","01","9223372036854775808","1\n","1\r\n",1]) {
    const invalid=structuredClone(envelope);invalid.result.configuration_definition.version_number=version;expect(validate(invalid)).toBe(false);
  }
  const extra=structuredClone(envelope);extra.result.secret_value="not_public";expect(validate(extra)).toBe(false);
});
