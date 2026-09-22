import { createHash } from "node:crypto";
import { CompiledQuery, sql, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { ScopeKind } from "@tcdx-grc/shared-types";
import { newUuidV7 } from "../uuid.js";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { claimIdempotency, completeIdempotency, persistAuditEvent, persistOutboxEvent } from "../persistence/foundation-records.js";
import type { CoreActor, ResourceKey } from "./model.js";
import { resources } from "./model.js";
import { assertLifecycleEdge, requireAccess } from "./security.js";
import { casTransition, detailResource, getResource, insertRow } from "./repository.js";

type Body = Record<string, unknown>;
type MutationResult = { resource: ResourceKey; id: string; response?: Record<string, unknown> };
type MutationContext = {
  transaction: Transaction<FoundationDatabase>;
  actor: CoreActor;
  body: Body;
  targetId?: string;
  parentId?: string;
};

export type MutationDefinition = {
  operationId: string;
  permission: string;
  capability: string;
  scopes: readonly ScopeKind[];
  auditEvent: string;
  domainEvent?: string;
  allowedFields: readonly string[];
  requiredFields: readonly string[];
  execute(context: MutationContext): Promise<MutationResult>;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Body).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function hash(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }

function string(body: Body, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: key });
  return value;
}

function optionalString(body: Body, key: string): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: key });
  return value;
}

function number(body: Body, key: string): number {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: key });
  return value;
}

function version(body: Body): number {
  const value = number(body, "expected_version");
  if (!Number.isSafeInteger(value) || value < 1) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "expected_version" });
  return value;
}

function validateClosedBody(definition: MutationDefinition, body: Body): void {
  if (!body || Array.isArray(body) || typeof body !== "object") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  const allowed = new Set(definition.allowedFields);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  const missing = definition.requiredFields.find((key) => body[key] === undefined || body[key] === null || body[key] === "");
  if (unknown || missing) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: unknown ?? missing });
  for (const [field, value] of Object.entries(body)) validateField(field, value);
  if (definition.operationId === "soaCreate") validateObjectArray(body.items, "items", soaItemFields, ["reference_control_version_id", "applicability_decision", "justification", "implementation_state"]);
  if (definition.operationId === "assuranceTestExecute" && body.samples !== undefined) validateObjectArray(body.samples, "samples", assuranceSampleFields, ["sample_code", "sample_count", "selection_method", "result_status"]);
  if (definition.operationId === "evidenceCreate") validateObjectArray(body.links, "links", evidenceLinkFields, []);
  for (const [start, end] of [["effective_from", "effective_to"], ["valid_from", "valid_to"], ["period_start", "period_end"]] as const) {
    if (typeof body[start] === "string" && typeof body[end] === "string" && Date.parse(body[end]) <= Date.parse(body[start])) invalidField(end);
  }
  if (definition.operationId === "assuranceTestExecute" && Array.isArray(body.samples)) {
    for (let index = 0; index < body.samples.length; index += 1) {
      const sample = body.samples[index] as Body;
      if (typeof sample.population_count === "number" && typeof sample.sample_count === "number" && sample.sample_count > sample.population_count) invalidField(`samples[${index}].sample_count`);
      if (typeof sample.sample_period_start === "string" && typeof sample.sample_period_end === "string" && Date.parse(sample.sample_period_end) <= Date.parse(sample.sample_period_start)) invalidField(`samples[${index}].sample_period_end`);
    }
  }
}

const resultStatuses = new Set(["valid", "no_data", "insufficient_data", "insufficient_coverage", "stale_source", "conflicting_sources", "dependency_pending", "invalid_input", "source_error", "calculation_error", "not_applicable", "superseded"]);
const uuidFields = new Set([
  "requirement_id", "scope_subject_id", "requirement_applicability_id", "methodology_version_ref", "effective_configuration_id", "framework_version_id",
  "reference_control_version_id", "tenant_control_id", "tenant_control_version_id", "based_on_control_version_id", "business_owner_subject_id", "control_id",
  "control_version_id", "assigned_membership_id", "assurance_test_id", "retention_policy_id", "file_object_id", "evidence_version_id", "issue_id",
  "requirement_assessment_id", "control_assessment_id"
]);
const timestampFields = new Set(["effective_from", "effective_to", "planned_at", "due_at", "valid_from", "valid_to", "period_start", "period_end", "expires_at", "sample_period_start", "sample_period_end"]);
const dateFields = new Set(["due_date"]);
const percentageFields = new Set(["coverage_percent", "design_effectiveness", "operating_effectiveness"]);
const integerFields = new Set(["expected_version", "population_count", "sample_count"]);
const maxLengths: Record<string, number> = {
  applicability_decision: 32, control_code: 160, control_type: 32, nature: 32, frequency_code: 64, suggested_owner_role_code: 96,
  test_code: 128, sample_code: 128, selection_method: 64, request_code: 128, evidence_code: 128, evidence_type: 64, source_kind: 32,
  sufficiency: 32, relevance: 32, issue_code: 128, issue_kind: 32, severity: 32, priority: 32, origin_role: 32, action_code: 128,
  link_role: 32, implementation_state: 32
};
const enumFields: Record<string, ReadonlySet<string>> = {
  result_status: resultStatuses,
  domain_conclusion: new Set(["not_assessed", "compliant", "partially_compliant", "non_compliant", "not_applicable", "insufficient_evidence", "effective", "partially_effective", "ineffective", "not_tested"]),
  control_type: new Set(["preventive", "detective", "corrective", "directive"]),
  nature: new Set(["manual", "automated", "hybrid"]),
  issue_kind: new Set(["finding", "non_conformity", "gap", "exception", "audit_observation"]),
  verification_decision: new Set(["accepted"])
};
const soaItemFields = new Set(["reference_control_version_id", "applicability_decision", "justification", "implementation_state", "tenant_control_id", "tenant_control_version_id"]);
const assuranceSampleFields = new Set(["sample_code", "population_count", "sample_count", "selection_method", "sample_period_start", "sample_period_end", "result_status"]);
const evidenceLinkFields = new Set(["requirement_id", "control_id", "control_version_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "claim", "effective_from", "effective_to"]);

function invalidField(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

function validateField(field: string, value: unknown): void {
  if (value === null || value === undefined) invalidField(field);
  if (uuidFields.has(field) && (typeof value !== "string" || !validateUuid(value))) invalidField(field);
  if (timestampFields.has(field) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) || Number.isNaN(Date.parse(value)))) invalidField(field);
  if (dateFields.has(field) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value)) invalidField(field);
  if (percentageFields.has(field) && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) invalidField(field);
  if (integerFields.has(field) && (typeof value !== "number" || !Number.isSafeInteger(value) || value < (field === "expected_version" ? 1 : 0))) invalidField(field);
  if (typeof value === "string" && value.length === 0) invalidField(field);
  if (maxLengths[field] !== undefined && (typeof value !== "string" || value.length > maxLengths[field]!)) invalidField(field);
  const values = enumFields[field];
  if (values && (typeof value !== "string" || !values.has(value))) invalidField(field);
}

function validateObjectArray(value: unknown, field: string, allowed: ReadonlySet<string>, required: readonly string[]): void {
  if (!Array.isArray(value)) invalidField(field);
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const itemField = `${field}[${index}]`;
    if (!item || Array.isArray(item) || typeof item !== "object") invalidField(itemField);
    const record = item as Body;
    const unknown = Object.keys(record).find((key) => !allowed.has(key));
    const missing = required.find((key) => record[key] === undefined || record[key] === null || record[key] === "");
    if (unknown || missing) invalidField(`${itemField}.${unknown ?? missing}`);
    for (const [key, nested] of Object.entries(record)) validateField(key, nested);
  }
}

async function referenceExists(tx: Transaction<FoundationDatabase>, table: string, idColumn: string, id: string, tenantId: string, globalAllowed = false): Promise<void> {
  const predicate = globalAllowed ? "(tenant_id IS NULL OR tenant_id=$2::uuid)" : "tenant_id=$2::uuid";
  const result = await tx.executeQuery<{ found: number }>(CompiledQuery.raw(`SELECT 1 AS found FROM ${table} WHERE "${idColumn}"=$1::uuid AND ${predicate}`, [id, tenantId]));
  if (!result.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
}

async function assertTenantMembership(tx: Transaction<FoundationDatabase>, membershipId: string, tenantId: string): Promise<void> {
  await referenceExists(tx, "iam.tenant_memberships", "tenant_membership_id", membershipId, tenantId);
}

async function assertControlVersion(tx: Transaction<FoundationDatabase>, controlId: string, controlVersionId: string, tenantId: string): Promise<void> {
  const result = await sql<{ found: number }>`
    SELECT 1 AS found FROM controls.control_versions
     WHERE tenant_id=${tenantId}::uuid AND control_id=${controlId}::uuid AND control_version_id=${controlVersionId}::uuid
  `.execute(tx);
  if (!result.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
}

async function assertEligibleEvidenceVersion(tx: Transaction<FoundationDatabase>, evidenceVersionId: string, tenantId: string): Promise<void> {
  const result = await sql<{ lifecycle_state: string; scan_status: string | null }>`
    SELECT ev.lifecycle_state,fo.scan_status
      FROM evidence.evidence_versions ev
      LEFT JOIN evidence.file_objects fo ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=ev.file_object_id
     WHERE ev.tenant_id=${tenantId}::uuid AND ev.evidence_version_id=${evidenceVersionId}::uuid
  `.execute(tx);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (row.lifecycle_state !== "approved" || (row.scan_status !== null && row.scan_status !== "passed")) {
    throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Evidence version is not eligible", 422);
  }
}

async function assertEvidenceVersionSubmittable(tx: Transaction<FoundationDatabase>, evidenceVersionId: string, tenantId: string): Promise<void> {
  const result = await sql<{ scan_status: string | null; link_count: string }>`
    SELECT fo.scan_status,COUNT(el.evidence_link_id)::text AS link_count
      FROM evidence.evidence_versions ev
      LEFT JOIN evidence.file_objects fo ON fo.tenant_id=ev.tenant_id AND fo.file_object_id=ev.file_object_id
      LEFT JOIN evidence.evidence_links el ON el.tenant_id=ev.tenant_id AND el.evidence_version_id=ev.evidence_version_id
     WHERE ev.tenant_id=${tenantId}::uuid AND ev.evidence_version_id=${evidenceVersionId}::uuid
     GROUP BY fo.scan_status
  `.execute(tx);
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (row.scan_status !== "passed" || Number(row.link_count) < 1) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Evidence version is not submittable", 422);
}

function actorColumns(actor: CoreActor): Record<string, unknown> {
  return { created_by_user_identity_id: actor.userIdentityId };
}

async function createApplicability({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const requirementId = string(body, "requirement_id");
  await referenceExists(tx, "regulatory.requirements", "requirement_id", requirementId, actor.tenantId, true);
  const scope = optionalString(body, "scope_subject_id");
  if (scope) await referenceExists(tx, "org.subjects", "subject_id", scope, actor.tenantId);
  const max = await sql<{ next_version: string }>`SELECT COALESCE(MAX(applicability_version),0)+1 AS next_version FROM regulatory.requirement_applicabilities WHERE tenant_id=${actor.tenantId}::uuid AND requirement_id=${requirementId}::uuid AND scope_subject_id IS NOT DISTINCT FROM ${scope}::uuid`.execute(tx);
  const id = newUuidV7();
  await insertRow(tx, "regulatory.requirement_applicabilities", { requirement_applicability_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), requirement_id: requirementId, scope_subject_id: scope, applicability_version: max.rows[0]!.next_version, applicability_decision: string(body, "applicability_decision"), rationale: string(body, "rationale"), lifecycle_state: "draft", effective_from: string(body, "effective_from"), effective_to: optionalString(body, "effective_to") });
  return { resource: "applicability", id };
}

async function createRequirementAssessment({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const applicabilityId = string(body, "requirement_applicability_id");
  await referenceExists(tx, resources.applicability.table, resources.applicability.idColumn, applicabilityId, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.requirementAssessment.table, { requirement_assessment_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), requirement_applicability_id: applicabilityId, methodology_version_ref: string(body, "methodology_version_ref"), lifecycle_state: "not_assessed", result_status: "no_data", effective_configuration_id: optionalString(body, "effective_configuration_id") });
  return { resource: "requirementAssessment", id };
}

async function createSoa({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const framework = string(body, "framework_version_id");
  await referenceExists(tx, "regulatory.framework_versions", "framework_version_id", framework, actor.tenantId, true);
  if (!Array.isArray(body.items) || body.items.length === 0) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "items" });
  const max = await sql<{ next_version: string }>`SELECT COALESCE(MAX(soa_version),0)+1 AS next_version FROM regulatory.statements_of_applicability WHERE tenant_id=${actor.tenantId}::uuid AND framework_version_id=${framework}::uuid`.execute(tx);
  const id = newUuidV7();
  await insertRow(tx, resources.soa.table, { statement_of_applicability_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), framework_version_id: framework, soa_version: max.rows[0]!.next_version, title: string(body, "title"), lifecycle_state: "draft", effective_from: optionalString(body, "effective_from") });
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "items" });
    const item = raw as Body;
    const controlVersion = string(item, "reference_control_version_id");
    await referenceExists(tx, "controls.control_versions", "control_version_id", controlVersion, actor.tenantId, true);
    const tenantControl = optionalString(item, "tenant_control_id");
    const tenantControlVersion = optionalString(item, "tenant_control_version_id");
    if (Boolean(tenantControl) !== Boolean(tenantControlVersion)) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Tenant Control and ControlVersion must be provided together", 422);
    if (tenantControl) await referenceExists(tx, resources.control.table, resources.control.idColumn, tenantControl, actor.tenantId);
    if (tenantControl && tenantControlVersion) await assertControlVersion(tx, tenantControl, tenantControlVersion, actor.tenantId);
    await insertRow(tx, "regulatory.statement_of_applicability_items", { statement_of_applicability_item_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), statement_of_applicability_id: id, reference_control_version_id: controlVersion, applicability_decision: string(item, "applicability_decision"), justification: string(item, "justification"), implementation_state: string(item, "implementation_state"), tenant_control_id: tenantControl, tenant_control_version_id: tenantControlVersion });
  }
  return { resource: "soa", id };
}

async function instantiateControl({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const basedOn = string(body, "based_on_control_version_id");
  await referenceExists(tx, "controls.control_versions", "control_version_id", basedOn, actor.tenantId, true);
  await referenceExists(tx, "org.subjects", "subject_id", string(body, "business_owner_subject_id"), actor.tenantId);
  const id = newUuidV7();
  const versionId = newUuidV7();
  await insertRow(tx, resources.control.table, { control_id: id, tenant_id: actor.tenantId, ownership_class: "TENANT_OWNED", ...actorColumns(actor), control_code: string(body, "control_code"), name: string(body, "name"), control_origin: "tenant_instantiated", based_on_control_version_id: basedOn, business_owner_subject_id: string(body, "business_owner_subject_id"), lifecycle_state: "active" });
  await insertRow(tx, "controls.control_versions", { control_version_id: versionId, tenant_id: actor.tenantId, ownership_class: "TENANT_OWNED", ...actorColumns(actor), control_id: id, version_number: 1, objective: string(body, "objective"), control_type: string(body, "control_type"), nature: string(body, "nature"), frequency_code: string(body, "frequency_code"), execution_method: string(body, "execution_method"), verification_method: string(body, "verification_method"), minimum_evidence: string(body, "minimum_evidence"), suggested_owner_role_code: optionalString(body, "suggested_owner_role_code"), lifecycle_state: "active", effective_from: optionalString(body, "effective_from"), effective_to: optionalString(body, "effective_to") });
  return { resource: "control", id };
}

async function createControlAssessment({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const control = string(body, "control_id");
  const controlVersion = string(body, "control_version_id");
  await referenceExists(tx, resources.control.table, resources.control.idColumn, control, actor.tenantId);
  await assertControlVersion(tx, control, controlVersion, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.controlAssessment.table, { control_assessment_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), control_id: control, control_version_id: controlVersion, methodology_version_ref: string(body, "methodology_version_ref"), lifecycle_state: "planned", result_status: "no_data", effective_configuration_id: optionalString(body, "effective_configuration_id") });
  return { resource: "controlAssessment", id };
}

async function createAssuranceTest({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const control = string(body, "control_id");
  const controlVersion = string(body, "control_version_id");
  await referenceExists(tx, resources.control.table, resources.control.idColumn, control, actor.tenantId);
  await assertControlVersion(tx, control, controlVersion, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.assuranceTest.table, { assurance_test_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), control_id: control, control_version_id: controlVersion, test_code: string(body, "test_code"), lifecycle_state: "planned", result_status: "no_data", planned_at: optionalString(body, "planned_at"), executor_membership_id: actor.membershipId });
  return { resource: "assuranceTest", id };
}

async function createEvidenceRequest({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const targets = ["requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id"].filter((key) => body[key] !== undefined && body[key] !== null);
  if (targets.length !== 1) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Exactly one typed evidence target is required", 422);
  const target = targets[0]!;
  const mappings: Record<string, [string, string, boolean?]> = { requirement_id: ["regulatory.requirements", "requirement_id", true], control_id: [resources.control.table, resources.control.idColumn], requirement_assessment_id: [resources.requirementAssessment.table, resources.requirementAssessment.idColumn], control_assessment_id: [resources.controlAssessment.table, resources.controlAssessment.idColumn], assurance_test_id: [resources.assuranceTest.table, resources.assuranceTest.idColumn] };
  const targetMapping = mappings[target]!;
  await referenceExists(tx, targetMapping[0], targetMapping[1], string(body, target), actor.tenantId, targetMapping[2] ?? false);
  const assignedMembership = optionalString(body, "assigned_membership_id");
  if (assignedMembership) await assertTenantMembership(tx, assignedMembership, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.evidenceRequest.table, { evidence_request_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), request_code: string(body, "request_code"), requirement_id: optionalString(body, "requirement_id"), control_id: optionalString(body, "control_id"), requirement_assessment_id: optionalString(body, "requirement_assessment_id"), control_assessment_id: optionalString(body, "control_assessment_id"), assurance_test_id: optionalString(body, "assurance_test_id"), lifecycle_state: "open", requested_by_membership_id: actor.membershipId, assigned_membership_id: assignedMembership, due_at: optionalString(body, "due_at") });
  return { resource: "evidenceRequest", id };
}

async function createEvidence({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const fileId = string(body, "file_object_id");
  const file = await sql<{ scan_status: string }>`SELECT scan_status FROM evidence.file_objects WHERE tenant_id=${actor.tenantId}::uuid AND file_object_id=${fileId}::uuid FOR UPDATE`.execute(tx);
  if (!file.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (file.rows[0].scan_status !== "passed") throw new FoundationError("TCDX.INVARIANT.VIOLATION", "File is not usable evidence", 422);
  await referenceExists(tx, "privacy.retention_policies", "retention_policy_id", string(body, "retention_policy_id"), actor.tenantId, true);
  const businessOwner = optionalString(body, "business_owner_subject_id");
  if (businessOwner) await referenceExists(tx, "org.subjects", "subject_id", businessOwner, actor.tenantId);
  if (!Array.isArray(body.links) || body.links.length === 0) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "links" });
  const evidenceId = newUuidV7();
  const versionId = newUuidV7();
  await insertRow(tx, resources.evidence.table, { evidence_id: evidenceId, tenant_id: actor.tenantId, ...actorColumns(actor), evidence_code: string(body, "evidence_code"), evidence_type: string(body, "evidence_type"), business_owner_subject_id: businessOwner, lifecycle_state: "draft", valid_from: optionalString(body, "valid_from"), valid_to: optionalString(body, "valid_to"), retention_policy_id: string(body, "retention_policy_id"), source_kind: string(body, "source_kind") });
  await insertRow(tx, resources.evidenceVersion.table, { evidence_version_id: versionId, tenant_id: actor.tenantId, ...actorColumns(actor), evidence_id: evidenceId, file_object_id: fileId, version_number: 1, effective_from: optionalString(body, "effective_from"), effective_to: optionalString(body, "effective_to"), period_start: optionalString(body, "period_start"), period_end: optionalString(body, "period_end"), lifecycle_state: "draft", expires_at: optionalString(body, "expires_at"), provenance_ref: string(body, "provenance_ref") });
  const mappings: Record<string, [string, string, boolean?]> = { requirement_id: ["regulatory.requirements", "requirement_id", true], control_id: [resources.control.table, resources.control.idColumn], control_version_id: ["controls.control_versions", "control_version_id", true], requirement_assessment_id: [resources.requirementAssessment.table, resources.requirementAssessment.idColumn], control_assessment_id: [resources.controlAssessment.table, resources.controlAssessment.idColumn], assurance_test_id: [resources.assuranceTest.table, resources.assuranceTest.idColumn] };
  for (const raw of body.links) {
    if (!raw || typeof raw !== "object") throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "links" });
    const link = raw as Body;
    const targets = Object.keys(mappings).filter((key) => link[key] !== undefined && link[key] !== null);
    if (targets.length !== 1) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Exactly one typed evidence link target is required", 422);
    const target = targets[0]!;
    const targetMapping = mappings[target]!;
    await referenceExists(tx, targetMapping[0], targetMapping[1], string(link, target), actor.tenantId, targetMapping[2] ?? false);
    await insertRow(tx, "evidence.evidence_links", { evidence_link_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), evidence_version_id: versionId, requirement_id: optionalString(link, "requirement_id"), control_id: optionalString(link, "control_id"), control_version_id: optionalString(link, "control_version_id"), requirement_assessment_id: optionalString(link, "requirement_assessment_id"), control_assessment_id: optionalString(link, "control_assessment_id"), assurance_test_id: optionalString(link, "assurance_test_id"), claim: optionalString(link, "claim"), effective_from: optionalString(link, "effective_from"), effective_to: optionalString(link, "effective_to") });
  }
  return { resource: "evidence", id: evidenceId };
}

async function createIssue({ transaction: tx, actor, body }: MutationContext): Promise<MutationResult> {
  const targets = ["requirement_assessment_id", "control_assessment_id", "assurance_test_id"].filter((key) => body[key] !== undefined && body[key] !== null);
  if (targets.length !== 1) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Exactly one typed issue origin is required", 422);
  const mappings: Record<string, [string, string]> = { requirement_assessment_id: [resources.requirementAssessment.table, resources.requirementAssessment.idColumn], control_assessment_id: [resources.controlAssessment.table, resources.controlAssessment.idColumn], assurance_test_id: [resources.assuranceTest.table, resources.assuranceTest.idColumn] };
  const target = targets[0]!;
  await referenceExists(tx, ...mappings[target]!, string(body, target), actor.tenantId);
  const businessOwner = optionalString(body, "business_owner_subject_id");
  if (businessOwner) await referenceExists(tx, "org.subjects", "subject_id", businessOwner, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.issue.table, { issue_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), issue_code: string(body, "issue_code"), issue_kind: string(body, "issue_kind"), title: string(body, "title"), description: string(body, "description"), lifecycle_state: "open", severity: string(body, "severity"), priority: string(body, "priority"), business_owner_subject_id: businessOwner, due_date: optionalString(body, "due_date") });
  await insertRow(tx, "remediation.issue_origins", { issue_origin_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), issue_id: id, requirement_assessment_id: optionalString(body, "requirement_assessment_id"), control_assessment_id: optionalString(body, "control_assessment_id"), assurance_test_id: optionalString(body, "assurance_test_id"), origin_role: string(body, "origin_role") });
  return { resource: "issue", id };
}

async function createAction({ transaction: tx, actor, body, parentId }: MutationContext): Promise<MutationResult> {
  if (!parentId) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  await referenceExists(tx, resources.issue.table, resources.issue.idColumn, parentId, actor.tenantId);
  const assignedMembership = optionalString(body, "assigned_membership_id");
  if (assignedMembership) await assertTenantMembership(tx, assignedMembership, actor.tenantId);
  const id = newUuidV7();
  await insertRow(tx, resources.action.table, { action_id: id, tenant_id: actor.tenantId, ...actorColumns(actor), issue_id: parentId, action_code: string(body, "action_code"), title: string(body, "title"), description: string(body, "description"), lifecycle_state: "pending", priority: string(body, "priority"), assigned_membership_id: assignedMembership, due_date: optionalString(body, "due_date") });
  return { resource: "action", id };
}

type TransitionSpec = { resource: ResourceKey; entity: string; from: string; command: string; requiresDistinctActor?: boolean; changes?: (body: Body, actor: CoreActor) => Record<string, unknown>; before?: (tx: Transaction<FoundationDatabase>, actor: CoreActor, body: Body, id: string, current: Record<string, unknown>) => Promise<void>; after?: (tx: Transaction<FoundationDatabase>, actor: CoreActor, body: Body, id: string, row: Record<string, unknown>) => Promise<void> };

function transition(spec: TransitionSpec) {
  return async ({ transaction: tx, actor, body, targetId }: MutationContext): Promise<MutationResult> => {
    if (!targetId) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
    const definition = resources[spec.resource];
    const permission = mutationPermission.get(spec.command)!;
    const current = await getResource(tx, actor, definition, targetId, true, permission);
    const edge = await assertLifecycleEdge(tx, actor, { entityType: spec.entity, fromState: spec.from, commandCode: spec.command, permission });
    if (edge.auditEventCode !== mutationAudit.get(spec.command)) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Audit contract mismatch", 422);
    if (spec.requiresDistinctActor) {
      const previous = await tx.executeQuery<{ prior_actor: string | null }>(CompiledQuery.raw(`SELECT COALESCE(updated_by_user_identity_id,created_by_user_identity_id) AS prior_actor FROM ${definition.table} WHERE tenant_id=$1::uuid AND "${definition.idColumn}"=$2::uuid`, [actor.tenantId, targetId]));
      if (previous.rows[0]?.prior_actor === actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    if (spec.before) await spec.before(tx, actor, body, targetId, current);
    const row = await casTransition(tx, actor, definition, targetId, version(body), spec.from, edge.toState, spec.changes?.(body, actor));
    if (spec.after) await spec.after(tx, actor, body, targetId, row);
    return { resource: spec.resource, id: targetId };
  };
}

const mutationPermission = new Map<string, string>();
const mutationAudit = new Map<string, string>();

const operationScopes: Readonly<Record<string, readonly ScopeKind[]>> = {
  applicabilityCreate: ["tenant"], applicabilitySubmit: ["tenant", "owned_object"], applicabilityApprove: ["tenant"],
  requirementAssessmentCreate: ["tenant"], requirementAssessmentStart: ["assigned_object", "tenant"], requirementAssessmentSubmit: ["assigned_object", "tenant"], requirementAssessmentApprove: ["tenant"],
  soaCreate: ["tenant"], soaPublish: ["tenant"], controlInstantiate: ["tenant"],
  controlAssessmentCreate: ["tenant", "owned_object"], controlAssessmentStart: ["assigned_object", "tenant"], controlAssessmentReview: ["tenant"], controlAssessmentApprove: ["tenant"],
  assuranceTestCreate: ["tenant", "audit_engagement"], assuranceTestStart: ["assigned_object", "audit_engagement"], assuranceTestExecute: ["assigned_object"], assuranceTestReview: ["tenant", "audit_engagement"], assuranceTestApprove: ["tenant"],
  evidenceRequestCreate: ["tenant"], evidenceCreate: ["tenant", "assigned_object", "owned_object"],
  evidenceSubmit: ["owned_object", "assigned_object"], evidenceReviewStart: ["assigned_object", "tenant"], evidenceApprove: ["tenant"], evidenceReject: ["tenant"],
  issueCreate: ["tenant"], issueTriage: ["tenant"], issueStartRemediation: ["tenant", "assigned_object", "owned_object"], issueRequestVerification: ["tenant", "assigned_object", "owned_object"], issueVerifyClose: ["tenant", "assigned_object", "owned_object"],
  actionCreate: ["tenant"], actionStart: ["assigned_object", "owned_object"], actionSubmitForReview: ["assigned_object", "owned_object"], actionComplete: ["assigned_object", "owned_object"], actionVerify: ["tenant"]
};

function def(value: Omit<MutationDefinition, "scopes">): MutationDefinition {
  const scopes = operationScopes[value.operationId];
  if (!scopes) throw new Error(`Missing scope contract for ${value.operationId}`);
  return { ...value, scopes };
}

const e = ["expected_version"] as const;
const transitionDefinitions: Array<[string, Omit<MutationDefinition, "execute" | "scopes">, TransitionSpec]> = [
  ["applicabilitySubmit", { operationId: "applicabilitySubmit", permission: "compliance.applicability.submit", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.applicability.submit.v1", domainEvent: "compliance.applicability.submitted.v1", allowedFields: [...e, "rationale"], requiredFields: [...e, "rationale"] }, { resource: "applicability", entity: "RequirementApplicability", from: "draft", command: "applicability.submit", changes: (b) => ({ rationale: string(b, "rationale") }) }],
  ["applicabilityApprove", { operationId: "applicabilityApprove", permission: "compliance.applicability.approve", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.applicability.approve.v1", domainEvent: "compliance.applicability.approved.v1", allowedFields: e, requiredFields: e }, { resource: "applicability", entity: "RequirementApplicability", from: "submitted", command: "applicability.approve", requiresDistinctActor: true, changes: (_b, a) => ({ approved_at: new Date(), approved_by_user_identity_id: a.userIdentityId }) }],
  ["requirementAssessmentStart", { operationId: "requirementAssessmentStart", permission: "compliance.requirement_assessment.update", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.requirement_assessment.start.v1", allowedFields: e, requiredFields: e }, { resource: "requirementAssessment", entity: "RequirementAssessment", from: "not_assessed", command: "requirement_assessment.start" }],
  ["requirementAssessmentSubmit", { operationId: "requirementAssessmentSubmit", permission: "compliance.requirement_assessment.submit", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.requirement_assessment.submit.v1", domainEvent: "compliance.requirement_assessment.assessed.v1", allowedFields: [...e, "result_status", "domain_conclusion", "coverage_percent"], requiredFields: [...e, "result_status"] }, { resource: "requirementAssessment", entity: "RequirementAssessment", from: "in_progress", command: "requirement_assessment.submit", changes: (b) => ({ result_status: string(b, "result_status"), domain_conclusion: optionalString(b, "domain_conclusion"), coverage_percent: b.coverage_percent ?? null, assessed_at: new Date() }) }],
  ["requirementAssessmentApprove", { operationId: "requirementAssessmentApprove", permission: "compliance.requirement_assessment.approve", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.requirement_assessment.approve.v1", domainEvent: "compliance.requirement_assessment.approved.v1", allowedFields: e, requiredFields: e }, { resource: "requirementAssessment", entity: "RequirementAssessment", from: "assessed", command: "requirement_assessment.approve", requiresDistinctActor: true, changes: () => ({ approved_at: new Date() }) }],
  ["soaPublish", { operationId: "soaPublish", permission: "compliance.soa.publish", capability: "ISO_COMPLIANCE", auditEvent: "audit.compliance.soa.publish.v1", domainEvent: "compliance.soa.published.v1", allowedFields: [...e, "reason"], requiredFields: [...e, "reason"] }, { resource: "soa", entity: "StatementOfApplicability", from: "draft", command: "soa.publish", changes: () => ({ published_at: new Date(), approved_at: new Date() }) }],
  ["controlAssessmentStart", { operationId: "controlAssessmentStart", permission: "controls.control_assessment.update", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.control_assessment.start.v1", allowedFields: e, requiredFields: e }, { resource: "controlAssessment", entity: "ControlAssessment", from: "planned", command: "control_assessment.start" }],
  ["controlAssessmentReview", { operationId: "controlAssessmentReview", permission: "controls.control_assessment.review", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.control_assessment.review.v1", allowedFields: e, requiredFields: e }, { resource: "controlAssessment", entity: "ControlAssessment", from: "completed", command: "control_assessment.review", requiresDistinctActor: true }],
  ["controlAssessmentApprove", { operationId: "controlAssessmentApprove", permission: "controls.control_assessment.approve", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.control_assessment.approve.v1", domainEvent: "controls.control_assessment.approved.v1", allowedFields: e, requiredFields: e }, { resource: "controlAssessment", entity: "ControlAssessment", from: "reviewed", command: "control_assessment.approve", requiresDistinctActor: true }],
  ["assuranceTestStart", { operationId: "assuranceTestStart", permission: "controls.assurance_test.execute", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.start.v1", allowedFields: e, requiredFields: e }, { resource: "assuranceTest", entity: "AssuranceTest", from: "planned", command: "assurance_test.start" }],
  ["assuranceTestExecute", { operationId: "assuranceTestExecute", permission: "controls.assurance_test.execute", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.execute.v1", domainEvent: "controls.assurance_test.completed.v1", allowedFields: [...e, "result_status", "domain_conclusion", "samples"], requiredFields: [...e, "result_status"] }, { resource: "assuranceTest", entity: "AssuranceTest", from: "in_progress", command: "assurance_test.execute", changes: (b) => ({ result_status: string(b, "result_status"), domain_conclusion: optionalString(b, "domain_conclusion"), executed_at: new Date() }), after: async (tx, actor, body, id) => { if (!Array.isArray(body.samples)) return; for (const raw of body.samples) { const sample = raw as Body; await insertRow(tx, "controls.assurance_samples", { assurance_sample_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), assurance_test_id: id, sample_code: string(sample, "sample_code"), population_count: sample.population_count ?? null, sample_count: number(sample, "sample_count"), selection_method: string(sample, "selection_method"), sample_period_start: optionalString(sample, "sample_period_start"), sample_period_end: optionalString(sample, "sample_period_end"), result_status: string(sample, "result_status") }); } } }],
  ["assuranceTestReview", { operationId: "assuranceTestReview", permission: "controls.assurance_test.review", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.review.v1", allowedFields: e, requiredFields: e }, { resource: "assuranceTest", entity: "AssuranceTest", from: "completed", command: "assurance_test.review", requiresDistinctActor: true, changes: (_b, a) => ({ reviewed_at: new Date(), reviewer_membership_id: a.membershipId }) }],
  ["assuranceTestApprove", { operationId: "assuranceTestApprove", permission: "controls.assurance_test.approve", capability: "CONTROLS_ASSURANCE", auditEvent: "audit.controls.assurance_test.approve.v1", allowedFields: e, requiredFields: e }, { resource: "assuranceTest", entity: "AssuranceTest", from: "reviewed", command: "assurance_test.approve", requiresDistinctActor: true, changes: () => ({ approved_at: new Date() }) }],
  ["evidenceSubmit", { operationId: "evidenceSubmit", permission: "evidence.evidence.submit", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.submit.v1", domainEvent: "evidence.evidence.submitted.v1", allowedFields: e, requiredFields: e }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "draft", command: "evidence.submit", before: async (tx, actor, _body, id) => assertEvidenceVersionSubmittable(tx, id, actor.tenantId), changes: () => ({ submitted_at: new Date() }) }],
  ["evidenceReviewStart", { operationId: "evidenceReviewStart", permission: "evidence.evidence.review", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.start_review.v1", allowedFields: e, requiredFields: e }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "submitted", command: "evidence.start_review" }],
  ["evidenceApprove", { operationId: "evidenceApprove", permission: "evidence.evidence.approve", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.approve.v1", domainEvent: "evidence.evidence.approved.v1", allowedFields: [...e, "sufficiency", "relevance", "rationale"], requiredFields: [...e, "rationale"] }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "under_review", command: "evidence.approve", changes: () => ({ approved_at: new Date(), published_at: new Date() }), after: async (tx, actor, body, id, row) => { const creator = await sql<{ created_by_user_identity_id: string | null }>`SELECT created_by_user_identity_id FROM evidence.evidence_versions WHERE tenant_id=${actor.tenantId}::uuid AND evidence_version_id=${id}::uuid`.execute(tx); if (creator.rows[0]?.created_by_user_identity_id === actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); await insertRow(tx, "evidence.evidence_reviews", { evidence_review_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), evidence_id: row.evidence_id, evidence_version_id: id, reviewer_membership_id: actor.membershipId, decision: "approved", sufficiency: optionalString(body, "sufficiency"), relevance: optionalString(body, "relevance"), rationale: string(body, "rationale"), reviewed_at: new Date() }); } }],
  ["evidenceReject", { operationId: "evidenceReject", permission: "evidence.evidence.reject", capability: "EVIDENCE_DOCUMENTS", auditEvent: "audit.evidence.evidence.reject.v1", domainEvent: "evidence.evidence.rejected.v1", allowedFields: [...e, "sufficiency", "relevance", "rationale"], requiredFields: [...e, "rationale"] }, { resource: "evidenceVersion", entity: "EvidenceVersion", from: "under_review", command: "evidence.reject", after: async (tx, actor, body, id, row) => { const creator = await sql<{ created_by_user_identity_id: string | null }>`SELECT created_by_user_identity_id FROM evidence.evidence_versions WHERE tenant_id=${actor.tenantId}::uuid AND evidence_version_id=${id}::uuid`.execute(tx); if (creator.rows[0]?.created_by_user_identity_id === actor.userIdentityId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); await insertRow(tx, "evidence.evidence_reviews", { evidence_review_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), evidence_id: row.evidence_id, evidence_version_id: id, reviewer_membership_id: actor.membershipId, decision: "rejected", sufficiency: optionalString(body, "sufficiency"), relevance: optionalString(body, "relevance"), rationale: string(body, "rationale"), reviewed_at: new Date() }); } }],
  ["issueTriage", { operationId: "issueTriage", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.triage.v1", domainEvent: "remediation.issue.triaged.v1", allowedFields: [...e, "severity", "priority", "business_owner_subject_id", "due_date"], requiredFields: [...e, "severity", "priority"] }, { resource: "issue", entity: "Issue", from: "open", command: "issue.triage", before: async (tx, actor, body) => { const owner = optionalString(body, "business_owner_subject_id"); if (owner) await referenceExists(tx, "org.subjects", "subject_id", owner, actor.tenantId); }, changes: (b) => ({ severity: string(b, "severity"), priority: string(b, "priority"), business_owner_subject_id: optionalString(b, "business_owner_subject_id"), due_date: optionalString(b, "due_date") }) }],
  ["issueStartRemediation", { operationId: "issueStartRemediation", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.start_remediation.v1", allowedFields: e, requiredFields: e }, { resource: "issue", entity: "Issue", from: "triaged", command: "issue.start_remediation" }],
  ["issueRequestVerification", { operationId: "issueRequestVerification", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.request_verification.v1", allowedFields: e, requiredFields: e }, { resource: "issue", entity: "Issue", from: "remediation_in_progress", command: "issue.request_verification" }],
  ["issueVerifyClose", { operationId: "issueVerifyClose", permission: "remediation.issue.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.issue.verify_close.v1", allowedFields: [...e, "verification_decision", "rationale"], requiredFields: [...e, "verification_decision", "rationale"] }, { resource: "issue", entity: "Issue", from: "pending_verification", command: "issue.verify_close", requiresDistinctActor: true, changes: () => ({ closed_at: new Date() }) }],
  ["actionStart", { operationId: "actionStart", permission: "remediation.action.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.start.v1", allowedFields: e, requiredFields: e }, { resource: "action", entity: "Action", from: "pending", command: "action.start" }],
  ["actionSubmitForReview", { operationId: "actionSubmitForReview", permission: "remediation.action.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.submit_review.v1", allowedFields: e, requiredFields: e }, { resource: "action", entity: "Action", from: "in_progress", command: "action.submit_review" }],
  ["actionComplete", { operationId: "actionComplete", permission: "remediation.action.transition", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.complete.v1", domainEvent: "remediation.action.completed.v1", allowedFields: [...e, "evidence_version_id", "link_role"], requiredFields: [...e, "evidence_version_id", "link_role"] }, { resource: "action", entity: "Action", from: "in_review", command: "action.complete", before: async (tx, actor, body) => assertEligibleEvidenceVersion(tx, string(body, "evidence_version_id"), actor.tenantId), changes: () => ({ completed_at: new Date() }), after: async (tx, actor, body, id) => { const evidence = string(body, "evidence_version_id"); await insertRow(tx, "remediation.action_evidence_links", { action_evidence_link_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), action_id: id, evidence_version_id: evidence, link_role: string(body, "link_role") }); } }],
  ["actionVerify", { operationId: "actionVerify", permission: "remediation.action.verify", capability: "ISSUES_ACTIONS", auditEvent: "audit.remediation.action.verify.v1", domainEvent: "remediation.action.verified.v1", allowedFields: [...e, "verification_decision", "rationale", "retest_reference"], requiredFields: [...e, "verification_decision", "rationale"] }, { resource: "action", entity: "Action", from: "completed", command: "action.verify", requiresDistinctActor: true, before: async (_tx, actor, _body, _id, current) => { if (current.assigned_membership_id === actor.membershipId) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403); }, changes: () => ({ verified_at: new Date() }), after: async (tx, actor, body, id) => { await insertRow(tx, "remediation.action_verifications", { action_verification_id: newUuidV7(), tenant_id: actor.tenantId, ...actorColumns(actor), action_id: id, verifier_membership_id: actor.membershipId, verification_decision: string(body, "verification_decision"), rationale: string(body, "rationale"), verified_at: new Date(), retest_reference: optionalString(body, "retest_reference") }); } }]
];

export const mutations = new Map<string, MutationDefinition>();

for (const [key, base, spec] of transitionDefinitions) {
  mutationPermission.set(spec.command, base.permission);
  mutationAudit.set(spec.command, base.auditEvent);
  mutations.set(key, def({ ...base, execute: transition(spec) }));
}

function addCreate(operationId: string, permission: string, capability: string, auditEvent: string, allowedFields: readonly string[], requiredFields: readonly string[], execute: MutationDefinition["execute"], domainEvent?: string): void {
  mutations.set(operationId, def({ operationId, permission, capability, auditEvent, ...(domainEvent ? { domainEvent } : {}), allowedFields, requiredFields, execute }));
}

addCreate("applicabilityCreate", "compliance.applicability.create", "ISO_COMPLIANCE", "audit.compliance.applicability.create.v1", ["requirement_id", "scope_subject_id", "applicability_decision", "rationale", "effective_from", "effective_to"], ["requirement_id", "applicability_decision", "rationale", "effective_from"], createApplicability);
addCreate("requirementAssessmentCreate", "compliance.requirement_assessment.create", "ISO_COMPLIANCE", "audit.compliance.requirement_assessment.create.v1", ["requirement_applicability_id", "methodology_version_ref", "effective_configuration_id"], ["requirement_applicability_id", "methodology_version_ref"], createRequirementAssessment);
addCreate("soaCreate", "compliance.soa.create", "ISO_COMPLIANCE", "audit.compliance.soa.create.v1", ["framework_version_id", "title", "effective_from", "items"], ["framework_version_id", "title", "items"], createSoa);
addCreate("controlInstantiate", "controls.control.create", "CONTROLS_ASSURANCE", "audit.controls.control.instantiate.v1", ["based_on_control_version_id", "control_code", "name", "business_owner_subject_id", "objective", "control_type", "nature", "frequency_code", "execution_method", "verification_method", "minimum_evidence", "suggested_owner_role_code", "effective_from", "effective_to"], ["based_on_control_version_id", "control_code", "name", "business_owner_subject_id", "objective", "control_type", "nature", "frequency_code", "execution_method", "verification_method", "minimum_evidence"], instantiateControl, "controls.control.instantiated.v1");
addCreate("controlAssessmentCreate", "controls.control_assessment.create", "CONTROLS_ASSURANCE", "audit.controls.control_assessment.create.v1", ["control_id", "control_version_id", "methodology_version_ref", "effective_configuration_id"], ["control_id", "control_version_id", "methodology_version_ref"], createControlAssessment);
addCreate("assuranceTestCreate", "controls.assurance_test.create", "CONTROLS_ASSURANCE", "audit.controls.assurance_test.create.v1", ["control_id", "control_version_id", "test_code", "planned_at"], ["control_id", "control_version_id", "test_code"], createAssuranceTest);
addCreate("evidenceRequestCreate", "evidence.evidence_request.create", "EVIDENCE_DOCUMENTS", "audit.evidence.request.create.v1", ["request_code", "requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "assigned_membership_id", "due_at"], ["request_code"], createEvidenceRequest, "evidence.request.opened.v1");
addCreate("evidenceCreate", "evidence.evidence.create", "EVIDENCE_DOCUMENTS", "audit.evidence.evidence.create.v1", ["evidence_code", "evidence_type", "business_owner_subject_id", "valid_from", "valid_to", "retention_policy_id", "source_kind", "file_object_id", "period_start", "period_end", "effective_from", "effective_to", "expires_at", "provenance_ref", "links"], ["evidence_code", "evidence_type", "retention_policy_id", "source_kind", "file_object_id", "provenance_ref", "links"], createEvidence, "evidence.evidence.created.v1");
addCreate("issueCreate", "remediation.issue.create", "ISSUES_ACTIONS", "audit.remediation.issue.create.v1", ["issue_code", "issue_kind", "title", "description", "severity", "priority", "business_owner_subject_id", "due_date", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "origin_role"], ["issue_code", "issue_kind", "title", "description", "severity", "priority", "origin_role"], createIssue, "remediation.issue.opened.v1");
addCreate("actionCreate", "remediation.action.create", "ISSUES_ACTIONS", "audit.remediation.action.create.v1", ["action_code", "title", "description", "priority", "assigned_membership_id", "due_date"], ["action_code", "title", "description", "priority"], createAction, "remediation.action.created.v1");

export async function executeMutation(transaction: Transaction<FoundationDatabase>, actor: CoreActor, definition: MutationDefinition, input: { body: Body; idempotencyKey: string; correlationId: string; targetId?: string; parentId?: string }): Promise<{ response: Record<string, unknown>; replayed: boolean }> {
  validateClosedBody(definition, input.body);
  requireAccess(actor, definition.permission, definition.capability, definition.scopes);
  if (!input.idempotencyKey || input.idempotencyKey.length > 255) throw new FoundationError("TCDX.VALIDATION.FAILED", "Idempotency-Key is required", 400, false, { field: "Idempotency-Key" });
  const requestHash = hash({ body: input.body, target_id: input.targetId ?? null, parent_id: input.parentId ?? null, fingerprint_version: "v1" });
  const claim = await claimIdempotency(transaction, { idempotencyRecordId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId, actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId, operationCode: definition.operationId, key: input.idempotencyKey, requestHash });
  if (claim.state === "replay") {
    if (!claim.resultRef) throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Idempotent result unavailable", 409, true);
    const [resource, id] = claim.resultRef.split(":") as [ResourceKey, string];
    return { response: await detailResource(transaction, actor, resources[resource], id, definition.permission), replayed: true };
  }
  const result = await definition.execute({ transaction, actor, body: input.body, ...(input.targetId ? { targetId: input.targetId } : {}), ...(input.parentId ? { parentId: input.parentId } : {}) });
  const response = result.response ?? await detailResource(transaction, actor, resources[result.resource], result.id, definition.permission);
  await persistAuditEvent(transaction, { auditEventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId, actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId, eventCode: definition.auditEvent, aggregateType: resources[result.resource].name, aggregateId: result.id, commandCode: definition.operationId, outcome: "success", classification: "internal", after: response });
  if (definition.domainEvent) await persistOutboxEvent(transaction, { outboxEventId: newUuidV7(), eventId: newUuidV7(), ownershipClass: "TENANT_OWNED", tenantId: actor.tenantId, actor: { userIdentityId: actor.userIdentityId }, correlationId: input.correlationId, eventType: definition.domainEvent, aggregateType: resources[result.resource].name, aggregateId: result.id, classification: "internal", payload: { aggregate_id: result.id, row_version: response.row_version } });
  await completeIdempotency(transaction, { idempotencyRecordId: claim.idempotencyRecordId, requestHash, resultStatusCode: "completed", resultRef: `${result.resource}:${result.id}`, responseHash: hash(response) });
  return { response, replayed: false };
}
