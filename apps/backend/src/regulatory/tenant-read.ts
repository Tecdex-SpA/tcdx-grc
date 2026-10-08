import { createHash } from "node:crypto";
import { CompiledQuery, sql, type Kysely } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor } from "../core-grc/model.js";
import { packVisibility } from "./pack-entitlement.js";

type Row = Record<string, unknown>;
type Kind = "normative-units" | "requirements";

function invalid(field: string): never {
  throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field });
}

function cursor(raw: unknown, frameworkVersionId: string, kind: Kind, filterHash: string): { order: string | number; id: string } | null {
  if (raw === undefined) return null;
  if (typeof raw !== "string" || raw.length > 2048) invalid("page[cursor]");
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Row;
    if (parsed.framework_version_id !== frameworkVersionId || parsed.kind !== kind || parsed.filter_hash !== filterHash ||
      !validateUuid(parsed.id) ||
      (kind === "normative-units" ? !Number.isInteger(parsed.order) : typeof parsed.order !== "string")) throw new Error("cursor");
    return { order: parsed.order as string | number, id: parsed.id as string };
  } catch { return invalid("page[cursor]"); }
}

export async function listTenantNormativeContent(
  database: Kysely<FoundationDatabase>, actor: CoreActor, frameworkVersionId: string,
  kind: Kind, query: Record<string, unknown>
): Promise<{ items: Row[]; page: { has_more: boolean; next_cursor: string | null } }> {
  if (!validateUuid(frameworkVersionId)) invalid("framework_version_id");
  const allowed = new Set(["page[size]", "page[cursor]", "filter[query]", kind === "normative-units" ? "filter[parent_normative_unit_id]" : "filter[normative_unit_id]"]);
  for (const key of Object.keys(query)) if (!allowed.has(key)) invalid(key);
  const rawSize = query["page[size]"];
  const size = rawSize === undefined ? 25 : Number(rawSize);
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid("page[size]");
  const search = query["filter[query]"];
  if (search !== undefined && (typeof search !== "string" || search.length < 2 || search.length > 160)) invalid("filter[query]");
  const parentOrUnit = query[kind === "normative-units" ? "filter[parent_normative_unit_id]" : "filter[normative_unit_id]"];
  if (parentOrUnit !== undefined && (typeof parentOrUnit !== "string" || !validateUuid(parentOrUnit))) invalid("filter[normative_unit_id]");
  const filterHash = createHash("sha256").update(JSON.stringify([search ?? null, parentOrUnit ?? null])).digest("hex");
  const after = cursor(query["page[cursor]"], frameworkVersionId, kind, filterHash);
  const visibility = await packVisibility(database, actor.tenantId, actor.runtimeEnvironment);
  const accessible = await sql<{ framework_version_id: string }>`
    SELECT framework_version_id FROM regulatory.framework_versions
     WHERE framework_version_id=${frameworkVersionId}::uuid AND
       (tenant_id=${actor.tenantId}::uuid OR (tenant_id IS NULL AND framework_version_id=ANY(${[...visibility.frameworkVersionIds]}::uuid[])))
  `.execute(database);
  if (accessible.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);

  const values: unknown[] = [frameworkVersionId, actor.tenantId];
  const unit = kind === "normative-units";
  let where = "t.framework_version_id=$1::uuid AND (t.tenant_id IS NULL OR t.tenant_id=$2::uuid)";
  if (parentOrUnit !== undefined) {
    values.push(parentOrUnit);
    where += ` AND t.${unit ? "parent_normative_unit_id" : "normative_unit_id"}=$${values.length}::uuid`;
  }
  if (search !== undefined) {
    values.push(`%${search}%`);
    where += unit
      ? ` AND (t.title ILIKE $${values.length} OR t.unit_code ILIKE $${values.length} OR t.source_locator ILIKE $${values.length})`
      : ` AND (t.requirement_code ILIKE $${values.length} OR t.statement_locator ILIKE $${values.length} OR t.editorial_summary ILIKE $${values.length})`;
  }
  if (after) {
    values.push(after.order, after.id);
    where += unit
      ? ` AND (t.display_order,t.normative_unit_id)>($${values.length - 1}::integer,$${values.length}::uuid)`
      : ` AND (t.requirement_code,t.requirement_id)>($${values.length - 1}::text,$${values.length}::uuid)`;
  }
  values.push(size + 1);
  const projection = unit
    ? "t.normative_unit_id,t.framework_version_id,t.parent_normative_unit_id,t.unit_type,t.unit_code,t.title,t.display_order,t.source_locator,t.content_language,t.effective_from,t.effective_to,t.license_classification,t.provenance_ref"
    : "t.requirement_id,t.framework_version_id,t.normative_unit_id,t.requirement_code,t.requirement_kind,t.statement_locator,t.content_language,t.editorial_summary,t.is_mandatory,t.applicability_guidance,t.evidence_expectations,t.effective_from,t.effective_to,t.provenance_ref";
  const order = unit ? "t.display_order,t.normative_unit_id" : "t.requirement_code,t.requirement_id";
  const table = unit ? "regulatory.normative_units" : "regulatory.requirements";
  const result = await database.executeQuery<Row>(CompiledQuery.raw(
    `SELECT ${projection} FROM ${table} t WHERE ${where} ORDER BY ${order} LIMIT $${values.length}::integer`, values
  ));
  const hasMore = result.rows.length > size;
  const items: Row[] = result.rows.slice(0, size).map((row) => ({ ...row,
    access_mode: visibility.frameworkAccessModes.get(frameworkVersionId) ?? "official" }));
  const last = items.at(-1);
  const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({
    framework_version_id: frameworkVersionId, kind, filter_hash: filterHash,
    order: last[unit ? "display_order" : "requirement_code"],
    id: last[unit ? "normative_unit_id" : "requirement_id"]
  }), "utf8").toString("base64url") : null;
  return { items, page: { has_more: hasMore, next_cursor: nextCursor } };
}
