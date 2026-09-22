import { createHash } from "node:crypto";
import { CompiledQuery, sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor, ResourceDefinition } from "./model.js";
import { grantedScopes } from "./security.js";

type Executor = Kysely<FoundationDatabase> | Transaction<FoundationDatabase>;
type Row = Record<string, unknown>;

const integerProjectionFields = new Set(["row_version", "applicability_version", "soa_version", "version_number", "population_count", "sample_count", "display_order"]);
const numberProjectionFields = new Set(["coverage_percent", "design_effectiveness", "operating_effectiveness", "overall_effectiveness"]);

function normalizeProjection(value: unknown, field = ""): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalizeProjection(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Row).map(([key, item]) => [key, normalizeProjection(item, key)]));
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && (integerProjectionFields.has(field) || numberProjectionFields.has(field))) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return value;
}

function selected(definition: ResourceDefinition): string {
  return definition.projection.map((column) => `t."${column}"`).join(",");
}

function tenantPredicate(definition: ResourceDefinition): string {
  return definition.name === "Control" ? "(t.tenant_id IS NULL OR t.tenant_id=$1::uuid)" : "t.tenant_id=$1::uuid";
}

function normalizePageSize(value: unknown): number {
  if (value === undefined) return 25;
  const size = Number(value);
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid page size", 400, false, { field: "page[size]" });
  }
  return size;
}

function filterHash(filters: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
}

type Cursor = { created_at: string; id: string; filter_hash: string };

function decodeCursor(value: unknown, expectedHash: string): Cursor | null {
  if (value === undefined) return null;
  if (typeof value !== "string") throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid cursor", 400);
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>;
    if (typeof cursor.created_at !== "string" || Number.isNaN(Date.parse(cursor.created_at)) || typeof cursor.id !== "string" || !validateUuid(cursor.id) || cursor.filter_hash !== expectedHash) throw new Error("cursor");
    return cursor as Cursor;
  } catch {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid cursor", 400);
  }
}

function encodeCursor(row: Row, definition: ResourceDefinition, hash: string): string {
  return Buffer.from(JSON.stringify({ created_at: row.created_at, id: row[definition.idColumn], filter_hash: hash }), "utf8").toString("base64url");
}

export async function listResource(executor: Executor, actor: CoreActor, definition: ResourceDefinition, query: Record<string, unknown>): Promise<{ items: Row[]; page: { has_more: boolean; next_cursor: string | null } }> {
  const allowedQuery = new Set(["page[size]", "page[cursor]", "filter[lifecycle_state]", ...Object.keys(definition.filters ?? {})]);
  const unsupported = Object.keys(query).find((key) => !allowedQuery.has(key));
  if (unsupported) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query parameter", 400, false, { field: unsupported });
  const size = normalizePageSize(query["page[size]"]);
  const contractualFilters = Object.fromEntries(Object.entries(query).filter(([key]) => key.startsWith("filter[")));
  const hash = filterHash(contractualFilters);
  const cursor = decodeCursor(query["page[cursor]"], hash);
  const values: unknown[] = [actor.tenantId];
  let where = tenantPredicate(definition);
  const grants = grantedScopes(actor, definition.permission);
  if (!grants.has("tenant")) {
    const policies: string[] = [];
    if (grants.has("owned_object")) { values.push(actor.userIdentityId); policies.push(`t.created_by_user_identity_id=$${values.length}::uuid`); }
    if (grants.has("assigned_object") && definition.assignedMembershipColumn) { values.push(actor.membershipId); policies.push(`t."${definition.assignedMembershipColumn}"=$${values.length}::uuid`); }
    const objectPolicy = policies.length ? policies.join(" OR ") : "FALSE";
    where = definition.name === "Control" ? `(t.tenant_id IS NULL OR (t.tenant_id=$1::uuid AND (${objectPolicy})))` : `${where} AND (${objectPolicy})`;
  }
  for (const [key, raw] of Object.entries(contractualFilters)) {
    if (typeof raw !== "string" || raw.length === 0) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
    let expression: string;
    let type: "uuid" | "text" | "date" | "timestamp";
    if (key === "filter[lifecycle_state]") { expression = "t.lifecycle_state"; type = "text"; }
    else {
      const filter = definition.filters?.[key];
      if (!filter) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported filter", 400, false, { field: key });
      ({ expression, type } = filter);
    }
    if (type === "uuid" && !validateUuid(raw)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
    if ((type === "date" || type === "timestamp") && Number.isNaN(Date.parse(raw))) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
    values.push(raw);
    const placeholder = `$${values.length}::${type === "text" ? "text" : type === "timestamp" ? "timestamptz" : type}`;
    const comparator = key.endsWith("_from]") ? ">=" : key.endsWith("_to]") ? "<=" : "=";
    const comparableExpression = type === "date" ? `(${expression})::date` : expression;
    where += ` AND ${expression.includes("{value}") ? expression.replace("{value}", placeholder) : `${comparableExpression}${comparator}${placeholder}`}`;
  }
  if (cursor) {
    values.push(cursor.created_at, cursor.id);
    where += ` AND (t.created_at,t."${definition.idColumn}") < ($${values.length - 1}::timestamptz,$${values.length}::uuid)`;
  }
  values.push(size + 1);
  const compiled = CompiledQuery.raw(`SELECT ${selected(definition)},t.created_at FROM ${definition.table} t WHERE ${where} ORDER BY t.created_at DESC,t."${definition.idColumn}" DESC LIMIT $${values.length}`, values);
  const result = await executor.executeQuery<Row>(compiled);
  const more = result.rows.length > size;
  const rows = result.rows.slice(0, size);
  const last = rows.at(-1);
  return { items: rows.map(({ created_at: _createdAt, ...row }) => normalizeProjection(row) as Row), page: { has_more: more, next_cursor: more && last ? encodeCursor(last, definition, hash) : null } };
}

export async function getResource(executor: Executor, actor: CoreActor, definition: ResourceDefinition, id: string, lock = false, policyPermission = definition.permission): Promise<Row> {
  const values = [actor.tenantId, id];
  const result = await executor.executeQuery<Row>(CompiledQuery.raw(
    `SELECT ${selected(definition)},t.tenant_id AS __tenant_id,t.created_at,t.created_by_user_identity_id FROM ${definition.table} t WHERE ${tenantPredicate(definition)} AND t."${definition.idColumn}"=$2::uuid${lock ? " FOR UPDATE" : ""}`,
    values
  ));
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const grants = grantedScopes(actor, policyPermission);
  const globalReference = definition.name === "Control" && row.__tenant_id === null;
  if (!grants.has("tenant") && !globalReference) {
    const assigned = definition.assignedMembershipColumn ? row[definition.assignedMembershipColumn] === actor.membershipId : false;
    const owned = row.created_by_user_identity_id === actor.userIdentityId;
    if (!(assigned && grants.has("assigned_object")) && !(owned && grants.has("owned_object"))) {
      throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
    }
  }
  const { __tenant_id: _tenantId, created_at: _createdAt, created_by_user_identity_id: _createdBy, ...projection } = row;
  return normalizeProjection(projection) as Row;
}

export async function detailResource(executor: Executor, actor: CoreActor, definition: ResourceDefinition, id: string, policyPermission = definition.permission): Promise<Row> {
  const row = await getResource(executor, actor, definition, id, false, policyPermission);
  if (definition.name === "StatementOfApplicability") row.items = (await sql<Row>`SELECT statement_of_applicability_item_id,reference_control_version_id,applicability_decision,justification,implementation_state,tenant_control_id,tenant_control_version_id FROM regulatory.statement_of_applicability_items WHERE tenant_id=${actor.tenantId}::uuid AND statement_of_applicability_id=${id}::uuid ORDER BY created_at,statement_of_applicability_item_id`.execute(executor)).rows;
  if (definition.name === "Control") {
    row.versions = (await sql<Row>`SELECT control_version_id,control_id,version_number,objective,control_type,nature,frequency_code,execution_method,verification_method,minimum_evidence,suggested_owner_role_code,lifecycle_state,effective_from,effective_to,published_at,superseded_by_id FROM controls.control_versions WHERE control_id=${id}::uuid AND (tenant_id IS NULL OR tenant_id=${actor.tenantId}::uuid) ORDER BY version_number DESC`.execute(executor)).rows;
    row.objectives = (await sql<Row>`SELECT o.control_objective_id,o.control_version_id,o.objective_code,o.description,o.display_order FROM controls.control_objectives o JOIN controls.control_versions v ON v.control_version_id=o.control_version_id WHERE v.control_id=${id}::uuid AND (o.tenant_id IS NULL OR o.tenant_id=${actor.tenantId}::uuid) ORDER BY o.display_order,o.control_objective_id`.execute(executor)).rows;
    row.scopes = (await sql<Row>`SELECT control_scope_id,control_id,subject_id,scope_role,effective_from,effective_to FROM controls.control_scopes WHERE control_id=${id}::uuid AND tenant_id=${actor.tenantId}::uuid ORDER BY created_at`.execute(executor)).rows;
  }
  if (definition.name === "AssuranceTest") row.samples = (await sql<Row>`SELECT assurance_sample_id,assurance_test_id,sample_code,population_count,sample_count,selection_method,sample_period_start,sample_period_end,result_status FROM controls.assurance_samples WHERE tenant_id=${actor.tenantId}::uuid AND assurance_test_id=${id}::uuid ORDER BY created_at`.execute(executor)).rows;
  if (definition.name === "Evidence") row.versions = (await sql<Row>`SELECT evidence_version_id,row_version,evidence_id,document_version_id,file_object_id,version_number,effective_from,effective_to,published_at,period_start,period_end,lifecycle_state,submitted_at,approved_at,expires_at,superseded_by_id,provenance_ref FROM evidence.evidence_versions WHERE tenant_id=${actor.tenantId}::uuid AND evidence_id=${id}::uuid ORDER BY version_number DESC`.execute(executor)).rows;
  if (definition.name === "EvidenceVersion") {
    row.links = (await sql<Row>`SELECT evidence_link_id,evidence_version_id,requirement_id,control_id,control_version_id,requirement_assessment_id,control_assessment_id,assurance_test_id,claim,effective_from,effective_to FROM evidence.evidence_links WHERE tenant_id=${actor.tenantId}::uuid AND evidence_version_id=${id}::uuid ORDER BY created_at`.execute(executor)).rows;
    row.reviews = (await sql<Row>`SELECT evidence_review_id,evidence_id,evidence_version_id,reviewer_membership_id,decision,sufficiency,relevance,rationale,reviewed_at FROM evidence.evidence_reviews WHERE tenant_id=${actor.tenantId}::uuid AND evidence_version_id=${id}::uuid ORDER BY reviewed_at`.execute(executor)).rows;
  }
  if (definition.name === "Issue") row.origins = (await sql<Row>`SELECT issue_origin_id,issue_id,requirement_assessment_id,control_assessment_id,assurance_test_id,audit_test_id,risk_id,incident_id,supplier_assessment_id,origin_role FROM remediation.issue_origins WHERE tenant_id=${actor.tenantId}::uuid AND issue_id=${id}::uuid ORDER BY created_at`.execute(executor)).rows;
  if (definition.name === "Action") {
    row.evidence_links = (await sql<Row>`SELECT action_evidence_link_id,action_id,evidence_version_id,link_role FROM remediation.action_evidence_links WHERE tenant_id=${actor.tenantId}::uuid AND action_id=${id}::uuid ORDER BY created_at`.execute(executor)).rows;
    row.verifications = (await sql<Row>`SELECT action_verification_id,action_id,verifier_membership_id,verification_decision,rationale,verified_at,retest_reference FROM remediation.action_verifications WHERE tenant_id=${actor.tenantId}::uuid AND action_id=${id}::uuid ORDER BY verified_at`.execute(executor)).rows;
  }
  return normalizeProjection(row) as Row;
}

export async function insertRow(executor: Executor, table: string, values: Record<string, unknown>, returning = "*"): Promise<Row> {
  const columns = Object.keys(values);
  const parameters = Object.values(values);
  const placeholders = parameters.map((_, index) => `$${index + 1}`);
  const result = await executor.executeQuery<Row>(CompiledQuery.raw(`INSERT INTO ${table} (${columns.map((column) => `"${column}"`).join(",")}) VALUES (${placeholders.join(",")}) RETURNING ${returning}`, parameters));
  return result.rows[0]!;
}

export async function casTransition(executor: Executor, actor: CoreActor, definition: ResourceDefinition, id: string, expectedVersion: number, fromState: string, toState: string, changes: Record<string, unknown> = {}): Promise<Row> {
  const assignments = { ...changes, lifecycle_state: toState, updated_at: new Date(), updated_by_user_identity_id: actor.userIdentityId };
  const columns = Object.keys(assignments);
  const parameters: unknown[] = [actor.tenantId, id, expectedVersion, fromState, ...Object.values(assignments)];
  const set = columns.map((column, index) => `"${column}"=$${index + 5}`).concat("row_version=row_version+1").join(",");
  const result = await executor.executeQuery<Row>(CompiledQuery.raw(`UPDATE ${definition.table} SET ${set} WHERE tenant_id=$1::uuid AND "${definition.idColumn}"=$2::uuid AND row_version=$3::bigint AND lifecycle_state=$4 RETURNING *`, parameters));
  const row = result.rows[0];
  if (!row) {
    const current = await executor.executeQuery<Row>(CompiledQuery.raw(`SELECT row_version,lifecycle_state FROM ${definition.table} WHERE tenant_id=$1::uuid AND "${definition.idColumn}"=$2::uuid`, [actor.tenantId, id]));
    if (!current.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
    if (Number(current.rows[0].row_version) !== expectedVersion) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409, true);
    throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Lifecycle transition denied", 409);
  }
  return row;
}
