import { describe, expect, it, vi } from "vitest";
import { PostgresQueryCompiler, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { newUuidV7 } from "../uuid.js";
import { listMethodologies, type MethodologyDomain } from "./methodologies.js";
import type { CoreActor } from "./model.js";
import { mutations } from "./service.js";

// In-memory domain evidence only: this adapter has no pool, driver or socket.
type Query = { sql: string; parameters: readonly unknown[] };
type Row = Record<string, unknown>;
function executor(handler: (query: Query) => { rows: Row[] }) {
  const compiler = new PostgresQueryCompiler();
  const executeQuery = vi.fn(handler);
  return {
    database: {
      executeQuery,
      getExecutor: () => ({
        transformQuery: (node: unknown) => node,
        compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
        executeQuery
      })
    } as unknown as Transaction<FoundationDatabase>,
    executeQuery
  };
}

function actor(): CoreActor {
  const permissions = ["compliance.methodology.read", "controls.methodology.read", "controls.control_assessment.submit"];
  return {
    tenantId: newUuidV7(), membershipId: newUuidV7(), userIdentityId: newUuidV7(),
    permissions: new Set(permissions), scopes: new Set(["tenant"]),
    permissionScopes: new Map(permissions.map(permission => [permission, new Set(["tenant"] as const)])),
    capabilityGroups: new Set(["ISO_COMPLIANCE", "CONTROLS_ASSURANCE"]), roles: []
  };
}

function method(domain: MethodologyDomain, minimumCoverage = 80): Row {
  return {
    methodology_version_ref: newUuidV7(), methodology_code: domain === "compliance" ? "BASELINE_COMPLIANCE" : "BASELINE_CONTROL_EFFECTIVENESS",
    version_number: 1, name: "Methodology fixture", minimum_coverage: minimumCoverage,
    ...(domain === "compliance" ? { partial_compliance_factor: 0.5 } : {}),
    formula_definition_id: newUuidV7(), rector_source: "unit fixture", rector_version: "unit fixture",
    effective_from: new Date(0), effective_to: null, published_at: new Date(0)
  };
}

describe("STEP6A.3 existing methodology catalog authority", () => {
  it.each(["compliance", "controls"] as const)("denies %s catalog without its permission before database execution", async domain => {
    const principal = actor();
    const db = executor(() => { throw new Error("No database query expected"); });
    await expect(listMethodologies(db.database, { ...principal, permissions: new Set() }, domain, {}))
      .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });
    expect(db.executeQuery).not.toHaveBeenCalled();
  });

  it.each(["compliance", "controls"] as const)("denies %s catalog without entitlement or with only platform scope", async domain => {
    const principal = actor();
    const db = executor(() => { throw new Error("No database query expected"); });
    for (const candidate of [
      { ...principal, capabilityGroups: new Set<string>() },
      { ...principal, permissionScopes: new Map([[`${domain}.methodology.read`, new Set(["platform"] as const)]]) }
    ]) {
      await expect(listMethodologies(db.database, candidate, domain, {}))
        .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });
    }
    expect(db.executeQuery).not.toHaveBeenCalled();
  });

  it.each(["tenant", "domain"] as const)("rejects cursor reuse after a %s change before another database execution", async change => {
    const principal = actor();
    const db = executor(() => ({ rows: [method("compliance"), method("compliance")] }));
    const page = await listMethodologies(db.database, principal, "compliance", { "page[size]": 1 });
    expect(page.page.has_more).toBe(true);
    expect(page.page.next_cursor).not.toBeNull();
    const candidate = change === "tenant" ? { ...principal, tenantId: newUuidV7() } : principal;
    await expect(listMethodologies(db.database, candidate, change === "domain" ? "controls" : "compliance", { "page[cursor]": page.page.next_cursor }))
      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400 });
    expect(db.executeQuery).toHaveBeenCalledTimes(1);
  });
});

describe("STEP6A.3 existing optional assessment configuration", () => {
  it.each(["compliance", "controls"] as const)("preserves %s absence as NULL without reading EC or declaring none", async domain => {
    const principal = actor();
    const definition = mutations.get(domain === "compliance" ? "requirementAssessmentCreate" : "controlAssessmentCreate")!;
    let persisted: Row | undefined;
    const db = executor(query => {
      if (query.sql.includes("FROM config.effective_configurations")) throw new Error("Absent EC must not be resolved");
      if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [method(domain)] };
      if (query.sql.trimStart().startsWith("SELECT 1 AS found")) return { rows: [{ found: 1 }] };
      if (query.sql.startsWith("INSERT INTO")) {
        const columns = [...query.sql.matchAll(/"([a-z_]+)"/g)].map(match => match[1]!);
        persisted = Object.fromEntries(columns.map((column, index) => [column, query.parameters[index]]));
        return { rows: [persisted] };
      }
      throw new Error(`Unexpected query: ${query.sql}`);
    });
    const body = domain === "compliance"
      ? { methodology_version_ref: newUuidV7(), requirement_applicability_id: newUuidV7() }
      : { methodology_version_ref: newUuidV7(), control_id: newUuidV7(), control_version_id: newUuidV7() };
    await definition.execute({ transaction: db.database, actor: principal, body });
    expect(persisted).toMatchObject({ tenant_id: principal.tenantId, methodology_version_ref: body.methodology_version_ref, effective_configuration_id: null });
    expect(persisted).not.toHaveProperty("configuration_mode");
  });

  it.each(["compliance", "controls"] as const)("accepts compatible EC for %s under the current contract, rather than publishing none", async domain => {
    const definition = mutations.get(domain === "compliance" ? "requirementAssessmentCreate" : "controlAssessmentCreate")!;
    const principal = actor();
    const ecId = newUuidV7();
    let persisted: Row | undefined;
    const db = executor(query => {
      if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [method(domain)] };
      if (query.sql.includes("FROM config.effective_configurations")) {
        expect(query.parameters).toEqual([ecId, principal.tenantId, domain]);
        return { rows: [{ effective_configuration_id: ecId }] };
      }
      if (query.sql.trimStart().startsWith("SELECT 1 AS found")) return { rows: [{ found: 1 }] };
      if (query.sql.startsWith("INSERT INTO")) {
        const columns = [...query.sql.matchAll(/"([a-z_]+)"/g)].map(match => match[1]!);
        persisted = Object.fromEntries(columns.map((column, index) => [column, query.parameters[index]]));
        return { rows: [persisted] };
      }
      throw new Error(`Unexpected query: ${query.sql}`);
    });
    const body = domain === "compliance"
      ? { methodology_version_ref: newUuidV7(), requirement_applicability_id: newUuidV7(), effective_configuration_id: ecId }
      : { methodology_version_ref: newUuidV7(), control_id: newUuidV7(), control_version_id: newUuidV7(), effective_configuration_id: ecId };
    await definition.execute({ transaction: db.database, actor: principal, body });
    expect(persisted).toMatchObject({ effective_configuration_id: ecId });
  });

  it.each(["compliance", "controls"] as const)("rejects incompatible %s EC before assessment persistence", async domain => {
    const definition = mutations.get(domain === "compliance" ? "requirementAssessmentCreate" : "controlAssessmentCreate")!;
    const db = executor(query => {
      if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [method(domain)] };
      if (query.sql.includes("FROM config.effective_configurations")) return { rows: [] };
      throw new Error("No persistence or later reference resolution expected");
    });
    await expect(definition.execute({ transaction: db.database, actor: actor(), body: { methodology_version_ref: newUuidV7(), effective_configuration_id: newUuidV7() } }))
      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400 });
    expect(db.executeQuery).toHaveBeenCalledTimes(2);
  });
});

function submissionFixture(minimumCoverage: number, domain: MethodologyDomain = "controls") {
  const principal = actor();
  const id = newUuidV7();
  const methodId = newUuidV7();
  const definition = mutations.get(domain === "controls" ? "controlAssessmentSubmit" : "requirementAssessmentSubmit")!;
  principal.permissions = new Set([...principal.permissions, definition.permission]);
  principal.permissionScopes = new Map([...principal.permissionScopes, [definition.permission, new Set(["tenant"] as const)]]);
  const table = domain === "controls" ? "controls.control_assessments" : "regulatory.requirement_assessments";
  let saved: Row | undefined;
  const db = executor(query => {
    if (query.sql.includes("FROM platform.subscriptions")) return { rows: [] };
    if (query.sql.startsWith("SELECT") && query.sql.includes(`FROM ${table} t`)) {
      return { rows: [{ [domain === "controls" ? "control_assessment_id" : "requirement_assessment_id"]: id, methodology_version_ref: methodId, effective_configuration_id: null, row_version: 1, lifecycle_state: "in_progress" }] };
    }
    if (query.sql.includes("WITH current_edges")) return { rows: [{ to_state: "completed", audit_event_code: definition.auditEvent, sod_policy_ref: "none", scope_kind: "tenant" }] };
    if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [{ ...method(domain, minimumCoverage), methodology_version_ref: methodId }] };
    if (query.sql.startsWith(`UPDATE ${table} SET`)) {
      const assignments = [...query.sql.matchAll(/"([a-z_]+)"=\$(\d+)/g)];
      saved = Object.fromEntries(assignments.map(match => [match[1]!, query.parameters[Number(match[2]) - 1]]));
      return { rows: [{ ...saved, control_assessment_id: id, row_version: 2 }] };
    }
    throw new Error(`Unexpected query: ${query.sql}`);
  });
  return { run: (body: Row) => definition.execute({ transaction: db.database, actor: principal, targetId: id, body: { expected_version: 1, ...body } }), saved: () => saved };
}

describe("STEP6A.3 Controls diagnostic calculation without methodological signoff", () => {
  it("calculates the conservative minimum with EC absent", async () => {
    const fixture = submissionFixture(80);
    await fixture.run({ result_status: "valid", domain_conclusion: "effective", design_effectiveness: 90, operating_effectiveness: 70, coverage_percent: 80 });
    expect(fixture.saved()).toMatchObject({ overall_effectiveness: 70, result_status: "insufficient_data", domain_conclusion: null, coverage_percent: 80 });
  });

  it("uses the method's typed coverage threshold rather than assuming the baseline value", async () => {
    const fixture = submissionFixture(90);
    await expect(fixture.run({ result_status: "valid", domain_conclusion: "effective", design_effectiveness: 90, operating_effectiveness: 90, coverage_percent: 85 }))
      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400 });
    expect(fixture.saved()).toBeUndefined();
  });

  it("retains below-threshold preview as insufficient_coverage", async () => {
    const fixture = submissionFixture(80);
    await fixture.run({ result_status: "insufficient_coverage", design_effectiveness: 90, operating_effectiveness: 70, coverage_percent: 79 });
    expect(fixture.saved()).toMatchObject({ overall_effectiveness: 70, result_status: "insufficient_coverage", coverage_percent: 79 });
  });

  it("preserves a measured zero without turning absent dimensions into zero", async () => {
    const measured = submissionFixture(80);
    await measured.run({ result_status: "valid", domain_conclusion: "ineffective", design_effectiveness: 0, operating_effectiveness: 90, coverage_percent: 80 });
    expect(measured.saved()).toMatchObject({ overall_effectiveness: 0 });
    const absent = submissionFixture(80);
    await absent.run({ result_status: "no_data" });
    expect(absent.saved()).toMatchObject({ overall_effectiveness: null, design_effectiveness: null, operating_effectiveness: null });
  });
});

describe("CFG-D official publication guard", () => {
  it("does not turn a compliance caller's valid claim and full coverage into an official conclusion", async () => {
    const fixture = submissionFixture(80, "compliance");
    await fixture.run({ result_status: "valid", domain_conclusion: "compliant", coverage_percent: 100 });
    expect(fixture.saved()).toMatchObject({ result_status: "insufficient_data", domain_conclusion: null, coverage_percent: 100 });
  });

  it.each(["compliance", "controls"] as const)("preserves causal %s diagnostic states without inventing population, evidence or zero", async domain => {
    for (const status of ["no_data", "dependency_pending", "conflicting_sources", "source_error", "stale_source", "insufficient_data"]) {
      const fixture = submissionFixture(80, domain);
      await fixture.run({ result_status: status });
      expect(fixture.saved()).toMatchObject({ result_status: status, domain_conclusion: null, coverage_percent: null });
      expect(fixture.saved()).not.toHaveProperty("configuration_mode");
    }
  });

  it("rejects a lone effectiveness dimension and below-threshold valid claim without persisting either", async () => {
    for (const body of [
      { result_status: "valid", design_effectiveness: 90, coverage_percent: 100 },
      { result_status: "valid", design_effectiveness: 90, operating_effectiveness: 90, coverage_percent: 79, domain_conclusion: "effective" }
    ]) {
      const fixture = submissionFixture(80);
      await expect(fixture.run(body)).rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED" });
      expect(fixture.saved()).toBeUndefined();
    }
  });

  it.each(["compliance", "controls"] as const)("blocks a %s v1 valid preview at approval without mutating history", async domain => {
    const principal = actor();
    const operationId = domain === "compliance" ? "requirementAssessmentApprove" : "controlAssessmentApprove";
    const definition = mutations.get(operationId)!;
    principal.permissions = new Set([...principal.permissions, definition.permission]);
    principal.permissionScopes = new Map([...principal.permissionScopes, [definition.permission, new Set(["tenant"] as const)]]);
    const id = newUuidV7();
    const methodId = newUuidV7();
    const table = domain === "compliance" ? "regulatory.requirement_assessments" : "controls.control_assessments";
    const db = executor(query => {
      if (query.sql.includes("FROM platform.subscriptions")) return { rows: [] };
      if (query.sql.includes(`FROM ${table} t`)) return { rows: [{
        [domain === "compliance" ? "requirement_assessment_id" : "control_assessment_id"]: id,
        row_version: 2, lifecycle_state: domain === "compliance" ? "assessed" : "reviewed",
        result_status: "valid", methodology_version_ref: methodId
      }] };
      if (query.sql.includes("WITH current_edges")) return { rows: [{
        to_state: "approved", audit_event_code: definition.auditEvent,
        sod_policy_ref: "contract:test", scope_kind: "tenant"
      }] };
      if (query.sql.includes("SELECT COALESCE(updated_by_user_identity_id")) return { rows: [{ prior_actor: newUuidV7() }] };
      if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [{ ...method(domain), methodology_version_ref: methodId }] };
      throw new Error(`No approval write expected: ${query.sql}`);
    });
    await expect(definition.execute({ transaction: db.database, actor: principal, targetId: id,
      body: { expected_version: 2 } })).rejects.toMatchObject({
      code: "TCDX.INVARIANT.VIOLATION", statusCode: 422
    });
    expect(db.executeQuery.mock.calls.some(([query]) => query.sql.startsWith(`UPDATE ${table}`))).toBe(false);
  });
});
