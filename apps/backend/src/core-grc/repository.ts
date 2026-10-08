import { createHash } from "node:crypto";
import { CompiledQuery, sql, type Kysely, type Transaction } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor, ResourceDefinition } from "./model.js";
import { grantedScopes } from "./security.js";
import { packVisibility } from "../regulatory/pack-entitlement.js";

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

async function entitledResourcePredicate(executor: Executor, actor: CoreActor, definition: ResourceDefinition, values: unknown[], knownVisibility?: Awaited<ReturnType<typeof packVisibility>>): Promise<string> {
  if (!["Control", "RequirementApplicability", "RequirementAssessment", "StatementOfApplicability"].includes(definition.name)) return "TRUE";
  const visibility = knownVisibility ?? await packVisibility(executor, actor.tenantId, actor.runtimeEnvironment);
  if (definition.name === "Control") {
    values.push([...visibility.globalControlIds]);
    return `(t.tenant_id=$1::uuid OR (t.tenant_id IS NULL AND t.control_id=ANY($${values.length}::uuid[])))`;
  }
  values.push([...visibility.frameworkVersionIds]);
  const frameworks = `$${values.length}::uuid[]`;
  if (definition.name === "StatementOfApplicability") return `t.framework_version_id=ANY(${frameworks})`;
  const applicability = definition.name === "RequirementAssessment"
    ? "JOIN regulatory.requirement_applicabilities a ON a.requirement_applicability_id=t.requirement_applicability_id AND a.tenant_id=t.tenant_id"
    : "";
  const requirementId = definition.name === "RequirementAssessment" ? "a.requirement_id" : "t.requirement_id";
  return `EXISTS (SELECT 1 FROM regulatory.requirements r ${applicability} WHERE r.requirement_id=${requirementId} AND (r.tenant_id=$1::uuid OR r.framework_version_id=ANY(${frameworks})))`;
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

async function controlCatalogProjection(executor: Executor, actor: CoreActor, rows: Row[], visibility: Awaited<ReturnType<typeof packVisibility>>): Promise<Row[]> {
  const ids = rows.map((row) => String(row.control_id));
  if (ids.length === 0) return rows;
  const permittedVersions = [...visibility.globalControlVersionIds];
  const permittedFrameworks = [...visibility.frameworkVersionIds];
  const [versions, relations] = await Promise.all([
    sql<{ control_id: string; version_number: number }>`
      SELECT cv.control_id,max(cv.version_number)::integer AS version_number
        FROM controls.control_versions cv
       WHERE cv.control_id=ANY(${ids}::uuid[])
         AND (cv.tenant_id=${actor.tenantId}::uuid OR cv.control_version_id=ANY(${permittedVersions}::uuid[]))
       GROUP BY cv.control_id
    `.execute(executor),
    sql<{ control_id: string; framework_version_id: string; framework_code: string; framework_name: string; edition: string }>`
      SELECT DISTINCT relation.control_id,relation.framework_version_id,fw.framework_code,fw.name AS framework_name,fv.edition
        FROM (
          SELECT c.control_id,r.framework_version_id
            FROM controls.controls c
            JOIN controls.control_versions cv ON (cv.control_id=c.control_id OR cv.control_version_id=c.based_on_control_version_id)
            JOIN regulatory.requirement_control_mappings rcm ON rcm.control_version_id=cv.control_version_id
            JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
           WHERE c.control_id=ANY(${ids}::uuid[]) AND cv.control_version_id=ANY(${permittedVersions}::uuid[])
          UNION
          SELECT c.control_id,nu.framework_version_id
            FROM controls.controls c
            JOIN controls.control_versions cv ON (cv.control_id=c.control_id OR cv.control_version_id=c.based_on_control_version_id)
            JOIN regulatory.normative_unit_control_mappings ncm ON ncm.control_version_id=cv.control_version_id
            JOIN regulatory.normative_units nu ON nu.normative_unit_id=ncm.normative_unit_id
           WHERE c.control_id=ANY(${ids}::uuid[]) AND cv.control_version_id=ANY(${permittedVersions}::uuid[])
        ) relation
        JOIN regulatory.framework_versions fv ON fv.framework_version_id=relation.framework_version_id
        JOIN regulatory.frameworks fw ON fw.framework_id=fv.framework_id
       WHERE relation.framework_version_id=ANY(${permittedFrameworks}::uuid[])
       ORDER BY relation.control_id,fw.framework_code,fv.edition
    `.execute(executor)
  ]);
  const versionById = new Map(versions.rows.map((version) => [version.control_id, version.version_number]));
  const frameworksById = new Map<string, Array<Omit<(typeof relations.rows)[number], "control_id"> & { access_mode: "official" | "non_authoritative_validation" }>>();
  for (const { control_id: controlId, ...framework } of relations.rows) {
    const current = frameworksById.get(controlId) ?? [];
    current.push({ ...framework, access_mode: visibility.frameworkAccessModes.get(framework.framework_version_id) ?? "official" });
    frameworksById.set(controlId, current);
  }
  const applicabilityAllowed = actor.permissions.has("compliance.applicability.read")
    && actor.capabilityGroups.has("ISO_COMPLIANCE")
    && grantedScopes(actor, "compliance.applicability.read").has("tenant");
  const applicability = applicabilityAllowed ? (await sql<{ control_id: string; applicability_decision: string; requirement_count: number }>`
    SELECT c.control_id,a.applicability_decision,count(DISTINCT a.requirement_id)::integer AS requirement_count
      FROM controls.controls c
      JOIN controls.control_versions cv ON (cv.control_id=c.control_id OR cv.control_version_id=c.based_on_control_version_id)
      JOIN regulatory.requirement_control_mappings rcm ON rcm.control_version_id=cv.control_version_id
      JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
      JOIN regulatory.requirement_applicabilities a ON a.requirement_id=r.requirement_id AND a.tenant_id=${actor.tenantId}::uuid
     WHERE c.control_id=ANY(${ids}::uuid[]) AND cv.control_version_id=ANY(${permittedVersions}::uuid[])
       AND r.framework_version_id=ANY(${permittedFrameworks}::uuid[])
       AND a.lifecycle_state='approved' AND a.effective_from<=transaction_timestamp()
       AND (a.effective_to IS NULL OR a.effective_to>transaction_timestamp())
     GROUP BY c.control_id,a.applicability_decision
  `.execute(executor)).rows : null;
  const applicabilityById = new Map<string, Array<{ decision: string; requirement_count: number }>>();
  for (const item of applicability ?? []) {
    const current = applicabilityById.get(item.control_id) ?? [];
    current.push({ decision: item.applicability_decision, requirement_count: item.requirement_count });
    applicabilityById.set(item.control_id, current);
  }
  const tenantWideControlRead = grantedScopes(actor, "controls.control.read").has("tenant");
  const implementations = tenantWideControlRead ? (await sql<{ control_id: string; implementation_count: number }>`
    SELECT cv.control_id,count(DISTINCT owned.control_id)::integer AS implementation_count
      FROM controls.control_versions cv
      JOIN controls.controls owned ON owned.based_on_control_version_id=cv.control_version_id
     WHERE cv.control_id=ANY(${ids}::uuid[]) AND cv.control_version_id=ANY(${permittedVersions}::uuid[])
       AND owned.tenant_id=${actor.tenantId}::uuid
     GROUP BY cv.control_id
  `.execute(executor)).rows : null;
  const implementationById = new Map((implementations ?? []).map((item) => [item.control_id, item.implementation_count]));
  return rows.map((row) => ({
    ...row,
    version_number: versionById.get(String(row.control_id)) ?? null,
    normative_frameworks: frameworksById.get(String(row.control_id)) ?? [],
    access_mode: (frameworksById.get(String(row.control_id)) ?? []).some((framework) =>
      visibility.frameworkAccessModes.get(framework.framework_version_id) === "non_authoritative_validation")
      ? "non_authoritative_validation" : "official",
    applicability_decisions: applicabilityAllowed ? applicabilityById.get(String(row.control_id)) ?? [] : null,
    implementation_count: row.ownership_class === "TENANT_OWNED" ? 1
      : tenantWideControlRead ? implementationById.get(String(row.control_id)) ?? 0 : null
  }));
}

export async function listResource(executor: Executor, actor: CoreActor, definition: ResourceDefinition, query: Record<string, unknown>): Promise<{ items: Row[]; page: { has_more: boolean; next_cursor: string | null }; framework_filters?: Array<{ framework_version_id: string; framework_code: string; framework_name: string; edition: string }> }> {
  const controlRead = definition.name === "Control";
  const allowedQuery = new Set(["page[size]", "page[cursor]", "filter[lifecycle_state]", ...Object.keys(definition.filters ?? {}), ...(controlRead ? ["filter[query]", "filter[framework_version_id]"] : [])]);
  const unsupported = Object.keys(query).find((key) => !allowedQuery.has(key));
  if (unsupported) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query parameter", 400, false, { field: unsupported });
  const size = normalizePageSize(query["page[size]"]);
  const contractualFilters = Object.fromEntries(Object.entries(query).filter(([key]) => key.startsWith("filter[")));
  const hash = filterHash(contractualFilters);
  const cursor = decodeCursor(query["page[cursor]"], hash);
  const values: unknown[] = [actor.tenantId];
  let where = tenantPredicate(definition);
  const controlVisibility = controlRead ? await packVisibility(executor, actor.tenantId, actor.runtimeEnvironment) : undefined;
  where += ` AND ${await entitledResourcePredicate(executor, actor, definition, values, controlVisibility)}`;
  const grants = grantedScopes(actor, definition.permission);
  if (!grants.has("tenant")) {
    const policies: string[] = [];
    if (grants.has("owned_object")) { values.push(actor.userIdentityId); policies.push(`t.created_by_user_identity_id=$${values.length}::uuid`); }
    if (grants.has("assigned_object") && definition.assignedMembershipColumn) { values.push(actor.membershipId); policies.push(`t."${definition.assignedMembershipColumn}"=$${values.length}::uuid`); }
    const objectPolicy = policies.length ? policies.join(" OR ") : "FALSE";
    where += definition.name === "Control"
      ? ` AND (t.tenant_id IS NULL OR (t.tenant_id=$1::uuid AND (${objectPolicy})))`
      : ` AND (${objectPolicy})`;
  }
  for (const [key, raw] of Object.entries(contractualFilters)) {
    if (typeof raw !== "string" || raw.length === 0) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
    if (controlRead && key === "filter[framework_version_id]") {
      if (!validateUuid(raw)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
      if (!controlVisibility!.frameworkVersionIds.has(raw)) { where += " AND FALSE"; continue; }
      values.push(raw);
      const framework = `$${values.length}::uuid`;
      where += ` AND EXISTS (SELECT 1 FROM controls.control_versions cv WHERE (cv.control_id=t.control_id OR cv.control_version_id=t.based_on_control_version_id) AND
        (EXISTS (SELECT 1 FROM regulatory.requirement_control_mappings rcm JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id WHERE rcm.control_version_id=cv.control_version_id AND r.framework_version_id=${framework})
         OR EXISTS (SELECT 1 FROM regulatory.normative_unit_control_mappings ncm JOIN regulatory.normative_units nu ON nu.normative_unit_id=ncm.normative_unit_id WHERE ncm.control_version_id=cv.control_version_id AND nu.framework_version_id=${framework})))`;
      continue;
    }
    if (controlRead && key === "filter[query]") {
      if (raw.trim().length < 2 || raw.length > 160) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
      values.push(`%${raw.trim()}%`, [...controlVisibility!.frameworkVersionIds]);
      const pattern = `$${values.length - 1}::text`;
      const frameworks = `$${values.length}::uuid[]`;
      where += ` AND (t.control_code ILIKE ${pattern} OR t.name ILIKE ${pattern} OR EXISTS (
        SELECT 1 FROM controls.control_versions cv WHERE (cv.control_id=t.control_id OR cv.control_version_id=t.based_on_control_version_id) AND (
          EXISTS (SELECT 1 FROM regulatory.requirement_control_mappings rcm
            JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
            JOIN regulatory.framework_versions fv ON fv.framework_version_id=r.framework_version_id
            JOIN regulatory.frameworks fw ON fw.framework_id=fv.framework_id
           WHERE rcm.control_version_id=cv.control_version_id AND fv.framework_version_id=ANY(${frameworks})
             AND (r.requirement_code ILIKE ${pattern} OR r.statement_locator ILIKE ${pattern} OR fw.framework_code ILIKE ${pattern} OR fw.name ILIKE ${pattern}))
          OR EXISTS (SELECT 1 FROM regulatory.normative_unit_control_mappings ncm
            JOIN regulatory.normative_units nu ON nu.normative_unit_id=ncm.normative_unit_id
            JOIN regulatory.framework_versions fv ON fv.framework_version_id=nu.framework_version_id
            JOIN regulatory.frameworks fw ON fw.framework_id=fv.framework_id
           WHERE ncm.control_version_id=cv.control_version_id AND fv.framework_version_id=ANY(${frameworks})
             AND (nu.unit_code ILIKE ${pattern} OR nu.source_locator ILIKE ${pattern} OR fw.framework_code ILIKE ${pattern} OR fw.name ILIKE ${pattern}))
        )))`;
      continue;
    }
    if (controlRead && key === "filter[applicability]") {
      if (raw !== "applicable" && raw !== "not_applicable") throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
      if (!actor.permissions.has("compliance.applicability.read") || !actor.capabilityGroups.has("ISO_COMPLIANCE") ||
          !grantedScopes(actor, "compliance.applicability.read").has("tenant")) {
        where += " AND FALSE"; continue;
      }
      values.push(raw,[...controlVisibility!.globalControlVersionIds],[...controlVisibility!.frameworkVersionIds]);
      const decision = `$${values.length - 2}::text`;
      const versions = `$${values.length - 1}::uuid[]`;
      const frameworks = `$${values.length}::uuid[]`;
      where += ` AND EXISTS (SELECT 1 FROM controls.control_versions cv
        JOIN regulatory.requirement_control_mappings rcm ON rcm.control_version_id=cv.control_version_id
        JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
        JOIN regulatory.requirement_applicabilities a ON a.requirement_id=r.requirement_id AND a.tenant_id=$1::uuid
        WHERE (cv.control_id=t.control_id OR cv.control_version_id=t.based_on_control_version_id)
          AND cv.control_version_id=ANY(${versions}) AND r.framework_version_id=ANY(${frameworks})
          AND a.applicability_decision=${decision} AND a.lifecycle_state='approved'
          AND a.effective_from<=transaction_timestamp() AND (a.effective_to IS NULL OR a.effective_to>transaction_timestamp()))`;
      continue;
    }
    if (controlRead && key === "filter[implementation]") {
      if (raw !== "implemented" && raw !== "unimplemented") throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid filter", 400, false, { field: key });
      if (!grantedScopes(actor, "controls.control.read").has("tenant")) { where += " AND FALSE"; continue; }
      const predicate = `EXISTS (SELECT 1 FROM controls.control_versions cv
        JOIN controls.controls owned ON owned.based_on_control_version_id=cv.control_version_id
        WHERE cv.control_id=t.control_id AND owned.tenant_id=$1::uuid)`;
      where += raw === "implemented" ? ` AND (t.tenant_id=$1::uuid OR ${predicate})`
        : ` AND t.tenant_id IS NULL AND NOT ${predicate}`;
      continue;
    }
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
  const projected = controlRead ? await controlCatalogProjection(executor, actor, rows, controlVisibility!) : rows;
  const frameworkFilters = controlRead ? (await sql<{ framework_version_id: string; framework_code: string; framework_name: string; edition: string }>`
    SELECT fv.framework_version_id,fw.framework_code,fw.name AS framework_name,fv.edition
      FROM regulatory.framework_versions fv
      JOIN regulatory.frameworks fw ON fw.framework_id=fv.framework_id
     WHERE fv.framework_version_id=ANY(${[...controlVisibility!.frameworkVersionIds]}::uuid[])
     ORDER BY fw.name,fv.edition,fv.framework_version_id
  `.execute(executor)).rows : undefined;
  return { items: projected.map(({ created_at: _createdAt, ...row }) => normalizeProjection(row) as Row), page: { has_more: more, next_cursor: more && last ? encodeCursor(last, definition, hash) : null }, ...(frameworkFilters ? { framework_filters: frameworkFilters.map((framework) => ({ ...framework, access_mode: controlVisibility!.frameworkAccessModes.get(framework.framework_version_id) ?? "official" })) } : {}) };
}

export async function getResource(executor: Executor, actor: CoreActor, definition: ResourceDefinition, id: string, lock = false, policyPermission = definition.permission): Promise<Row> {
  const values: unknown[] = [actor.tenantId, id];
  const entitled = await entitledResourcePredicate(executor, actor, definition, values);
  const result = await executor.executeQuery<Row>(CompiledQuery.raw(
    `SELECT ${selected(definition)},t.tenant_id AS __tenant_id,t.created_at,t.created_by_user_identity_id FROM ${definition.table} t WHERE ${tenantPredicate(definition)} AND ${entitled} AND t."${definition.idColumn}"=$2::uuid${lock ? " FOR UPDATE" : ""}`,
    values
  ));
  const row = result.rows[0];
  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  const grants = grantedScopes(actor, policyPermission);
  const globalReference = definition.name === "Control" && row.__tenant_id === null;
  if (!grants.has("tenant") && !globalReference) {
    const assigned = definition.assignedMembershipColumn ? row[definition.assignedMembershipColumn] === actor.membershipId : false;
    const owned = definition.ownedByCreator !== false && row.created_by_user_identity_id === actor.userIdentityId;
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
    const visibility = await packVisibility(executor, actor.tenantId, actor.runtimeEnvironment);
    const permittedVersions = [...visibility.globalControlVersionIds];
    const permittedFrameworks = [...visibility.frameworkVersionIds];
    const basedOn = typeof row.based_on_control_version_id === "string" ? row.based_on_control_version_id : null;
    row.versions = (await sql<Row>`SELECT control_version_id,control_id,version_number,objective,control_type,nature,frequency_code,execution_method,verification_method,minimum_evidence,suggested_owner_role_code,lifecycle_state,effective_from,effective_to,published_at,superseded_by_id FROM controls.control_versions WHERE control_id=${id}::uuid AND (tenant_id=${actor.tenantId}::uuid OR (tenant_id IS NULL AND control_version_id=ANY(${permittedVersions}::uuid[]))) ORDER BY version_number DESC`.execute(executor)).rows;
    row.objectives = (await sql<Row>`SELECT o.control_objective_id,o.control_version_id,o.objective_code,o.description,o.display_order FROM controls.control_objectives o JOIN controls.control_versions v ON v.control_version_id=o.control_version_id WHERE v.control_id=${id}::uuid AND (o.tenant_id=${actor.tenantId}::uuid OR (o.tenant_id IS NULL AND o.control_version_id=ANY(${permittedVersions}::uuid[]))) ORDER BY o.display_order,o.control_objective_id`.execute(executor)).rows;
    row.scopes = (await sql<Row>`SELECT control_scope_id,control_id,subject_id,scope_role,effective_from,effective_to FROM controls.control_scopes WHERE control_id=${id}::uuid AND tenant_id=${actor.tenantId}::uuid ORDER BY created_at`.execute(executor)).rows;
    row.normative_relations = (await sql<Row>`
      SELECT rcm.requirement_control_mapping_id AS mapping_id,'requirement' AS target_kind,
             r.requirement_id AS target_id,r.requirement_code AS target_code,r.statement_locator AS locator,
             fw.framework_code,fw.name AS framework_name,fv.edition,fv.framework_version_id,
             rcm.mapping_type,rcm.coverage_contribution,rcm.lifecycle_state AS mapping_state,rcm.provenance_ref
        FROM regulatory.requirement_control_mappings rcm
        JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
        JOIN regulatory.framework_versions fv ON fv.framework_version_id=r.framework_version_id
        JOIN regulatory.frameworks fw ON fw.framework_id=fv.framework_id
        JOIN controls.control_versions cv ON cv.control_version_id=rcm.control_version_id
       WHERE (cv.control_id=${id}::uuid OR cv.control_version_id=${basedOn}::uuid)
         AND cv.control_version_id=ANY(${permittedVersions}::uuid[])
         AND fv.framework_version_id=ANY(${permittedFrameworks}::uuid[])
      UNION ALL
      SELECT ncm.normative_unit_control_mapping_id AS mapping_id,'normative_unit' AS target_kind,
             nu.normative_unit_id AS target_id,nu.unit_code AS target_code,nu.source_locator AS locator,
             fw.framework_code,fw.name AS framework_name,fv.edition,fv.framework_version_id,
             NULL::text AS mapping_type,NULL::numeric AS coverage_contribution,ncm.lifecycle_state AS mapping_state,ncm.provenance_ref
        FROM regulatory.normative_unit_control_mappings ncm
        JOIN regulatory.normative_units nu ON nu.normative_unit_id=ncm.normative_unit_id
        JOIN regulatory.framework_versions fv ON fv.framework_version_id=nu.framework_version_id
        JOIN regulatory.frameworks fw ON fw.framework_id=fv.framework_id
        JOIN controls.control_versions cv ON cv.control_version_id=ncm.control_version_id
       WHERE (cv.control_id=${id}::uuid OR cv.control_version_id=${basedOn}::uuid)
         AND cv.control_version_id=ANY(${permittedVersions}::uuid[])
         AND fv.framework_version_id=ANY(${permittedFrameworks}::uuid[])
       ORDER BY framework_code,target_kind,target_code,mapping_id
    `.execute(executor)).rows.map((relation) => ({ ...relation,
      access_mode: visibility.frameworkAccessModes.get(String(relation.framework_version_id)) ?? "official" }));
    row.crosswalk_relations = (await sql<Row>`
      SELECT DISTINCT cm.control_crosswalk_mapping_id,cm.framework_crosswalk_id,
             cm.source_control_version_id,cm.target_control_version_id,
             fc.source_framework_version_id,fc.target_framework_version_id,
             fc.direction,fc.crosswalk_version,cm.relationship_type,cm.mapping_status,
             cm.confidence,cm.provenance_ref
        FROM regulatory.control_crosswalk_mappings cm
        JOIN regulatory.framework_crosswalks fc ON fc.framework_crosswalk_id=cm.framework_crosswalk_id
        JOIN controls.control_versions source_cv ON source_cv.control_version_id=cm.source_control_version_id
        LEFT JOIN controls.control_versions target_cv ON target_cv.control_version_id=cm.target_control_version_id
       WHERE (source_cv.control_id=${id}::uuid OR cm.source_control_version_id=${basedOn}::uuid
          OR target_cv.control_id=${id}::uuid OR cm.target_control_version_id=${basedOn}::uuid)
         AND cm.source_control_version_id=ANY(${permittedVersions}::uuid[])
         AND cm.target_control_version_id=ANY(${permittedVersions}::uuid[])
         AND fc.source_framework_version_id=ANY(${permittedFrameworks}::uuid[])
         AND fc.target_framework_version_id=ANY(${permittedFrameworks}::uuid[])
         AND (fc.tenant_id IS NULL OR fc.tenant_id=${actor.tenantId}::uuid)
         AND (cm.tenant_id IS NULL OR cm.tenant_id=${actor.tenantId}::uuid)
       ORDER BY cm.control_crosswalk_mapping_id
    `.execute(executor)).rows.map((mapping) => ({ ...mapping,
      source_access_mode: visibility.frameworkAccessModes.get(String(mapping.source_framework_version_id)) ?? "official",
      target_access_mode: visibility.frameworkAccessModes.get(String(mapping.target_framework_version_id)) ?? "official" }));
    if (actor.permissions.has("compliance.applicability.read") && actor.capabilityGroups.has("ISO_COMPLIANCE")
      && grantedScopes(actor, "compliance.applicability.read").has("tenant")) {
      row.applicability_relations = (await sql<Row>`
        SELECT DISTINCT a.requirement_applicability_id,r.requirement_code,r.framework_version_id,
               a.scope_subject_id,a.applicability_decision,a.rationale,a.lifecycle_state,
               a.effective_from,a.effective_to,a.approved_at,a.approved_by_user_identity_id
          FROM controls.control_versions cv
          JOIN regulatory.requirement_control_mappings rcm ON rcm.control_version_id=cv.control_version_id
          JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
          JOIN regulatory.requirement_applicabilities a ON a.requirement_id=r.requirement_id AND a.tenant_id=${actor.tenantId}::uuid
         WHERE (cv.control_id=${id}::uuid OR cv.control_version_id=${basedOn}::uuid)
           AND cv.control_version_id=ANY(${permittedVersions}::uuid[])
           AND r.framework_version_id=ANY(${permittedFrameworks}::uuid[])
           AND a.effective_from<=transaction_timestamp()
           AND (a.effective_to IS NULL OR a.effective_to>transaction_timestamp())
         ORDER BY r.framework_version_id,r.requirement_code,a.effective_from DESC
      `.execute(executor)).rows;
    }
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

export async function casRetentionPolicyTransition(executor: Executor, actor: CoreActor, id: string, expectedVersion: number, fromState: string, toState: string, publish = false): Promise<Row> {
  const publication = publish ? ",effective_from=transaction_timestamp()" : "";
  const result = await executor.executeQuery<Row>(CompiledQuery.raw(
    `UPDATE privacy.retention_policies SET lifecycle_state=$5,row_version=row_version+1${publication} WHERE tenant_id=$1::uuid AND retention_policy_id=$2::uuid AND row_version=$3::bigint AND lifecycle_state=$4 RETURNING *`,
    [actor.tenantId, id, expectedVersion, fromState, toState]
  ));
  const row = result.rows[0];
  if (!row) {
    const current = await executor.executeQuery<Row>(CompiledQuery.raw(
      "SELECT row_version,lifecycle_state FROM privacy.retention_policies WHERE tenant_id=$1::uuid AND retention_policy_id=$2::uuid",
      [actor.tenantId, id]
    ));
    if (!current.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
    if (Number(current.rows[0].row_version) !== expectedVersion) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409, true);
    throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Lifecycle transition denied", 409);
  }
  return row;
}

export async function casRetentionPolicyUpdate(executor: Executor, actor: CoreActor, id: string, expectedVersion: number, changes: { retention_seconds: number; is_mandatory: boolean }): Promise<Row> {
  const result = await executor.executeQuery<Row>(CompiledQuery.raw(
    `UPDATE privacy.retention_policies SET retention_seconds=$4::bigint,is_mandatory=$5::boolean,row_version=row_version+1 WHERE tenant_id=$1::uuid AND retention_policy_id=$2::uuid AND row_version=$3::bigint AND lifecycle_state='draft' RETURNING *`,
    [actor.tenantId, id, expectedVersion, changes.retention_seconds, changes.is_mandatory]
  ));
  if (result.rows[0]) return result.rows[0];
  const current = await executor.executeQuery<Row>(CompiledQuery.raw(
    "SELECT row_version,lifecycle_state FROM privacy.retention_policies WHERE tenant_id=$1::uuid AND retention_policy_id=$2::uuid",
    [actor.tenantId, id]
  ));
  if (!current.rows[0]) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
  if (Number(current.rows[0].row_version) !== expectedVersion) throw new FoundationError("TCDX.CONFLICT.CONCURRENCY", "Concurrent modification detected", 409, true);
  throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Only a draft RetentionPolicy is editable", 409);
}
