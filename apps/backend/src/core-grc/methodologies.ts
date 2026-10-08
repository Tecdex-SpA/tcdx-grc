import { createHash } from "node:crypto";
import { CompiledQuery, type Kysely } from "kysely";
import { validate as validateUuid } from "uuid";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { CoreActor } from "./model.js";
import { requireAccess } from "./security.js";

export type MethodologyDomain = "compliance" | "controls";
const definitions = {
  compliance: { table: "regulatory.compliance_methodologies", id: "compliance_methodology_id", capability: "ISO_COMPLIANCE" },
  controls: { table: "controls.control_effectiveness_methodologies", id: "control_effectiveness_methodology_id", capability: "CONTROLS_ASSURANCE" }
} as const;
type Methodology = { methodology_version_ref: string; methodology_code: string; version_number: number; name: string; minimum_coverage: number; partial_compliance_factor?: number; formula_definition_id: string; rector_source: string; rector_version: string; effective_from: Date; effective_to: Date | null; published_at: Date };
const selectable = "m.ownership_class='PLATFORM_CONTROL' AND m.tenant_id IS NULL AND m.lifecycle_state='published' AND m.published_at IS NOT NULL AND m.effective_from<=transaction_timestamp() AND (m.effective_to IS NULL OR m.effective_to>transaction_timestamp()) AND f.formula_code=m.methodology_code AND f.lifecycle_state='published' AND f.tenant_id IS NULL AND f.expression_language='TCDX_DETERMINISTIC_EXPRESSION_V1'";
function projection(domain: MethodologyDomain): string {
  return `m.${definitions[domain].id} AS methodology_version_ref,m.methodology_code,m.version_number,m.name,m.minimum_coverage,${domain === "compliance" ? "m.partial_compliance_factor," : ""}m.formula_definition_id,m.rector_source,m.rector_version,m.effective_from,m.effective_to,m.published_at`;
}
function normalize(row: Methodology): Methodology {
  return { ...row, version_number: Number(row.version_number), minimum_coverage: Number(row.minimum_coverage), ...(row.partial_compliance_factor === undefined ? {} : { partial_compliance_factor: Number(row.partial_compliance_factor) }) };
}
export async function resolveMethodology(database: Kysely<FoundationDatabase>, domain: MethodologyDomain, id: string, selection = true): Promise<Methodology> {
  if (!validateUuid(id)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid methodology reference", 400, false, { field: "methodology_version_ref" });
  const definition = definitions[domain];
  const result = await database.executeQuery<Methodology>(CompiledQuery.raw(`SELECT ${projection(domain)} FROM ${definition.table} m JOIN data.formula_definitions f ON f.formula_definition_id=m.formula_definition_id WHERE m.${definition.id}=$1::uuid AND ${selection ? selectable : "m.lifecycle_state='published' AND m.ownership_class='PLATFORM_CONTROL' AND m.tenant_id IS NULL"}`, [id]));
  if (!result.rows[0]) throw new FoundationError("TCDX.VALIDATION.FAILED", "Methodology is not selectable for this assessment domain", 400, false, { field: "methodology_version_ref" });
  return normalize(result.rows[0]);
}
export async function listMethodologies(database: Kysely<FoundationDatabase>, actor: CoreActor, domain: MethodologyDomain, query: Record<string, unknown>) {
  const definition = definitions[domain];
  requireAccess(actor, `${domain}.methodology.read`, definition.capability, ["tenant"]);
  const invalid = (): never => { throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid methodology catalog query", 400); };
  if (Object.keys(query).some(key => !["page[size]", "page[cursor]"].includes(key))) invalid();
  const size = query["page[size]"] === undefined ? 25 : Number(query["page[size]"]);
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid();
  const hash = createHash("sha256").update(JSON.stringify([actor.tenantId, domain])).digest("hex");
  const params: unknown[] = [];
  let after = "";
  if (query["page[cursor]"] !== undefined) {
    try {
      const raw = query["page[cursor]"];
      if (typeof raw !== "string" || raw.length > 2048) invalid();
      const cursor = JSON.parse(Buffer.from(raw as string, "base64url").toString("utf8")) as { hash: string; id: string };
      if (cursor.hash !== hash || !validateUuid(cursor.id)) invalid();
      params.push(cursor.id); after = ` AND m.${definition.id}>$1::uuid`;
    } catch { invalid(); }
  }
  params.push(size + 1);
  const result = await database.executeQuery<Methodology>(CompiledQuery.raw(`SELECT ${projection(domain)} FROM ${definition.table} m JOIN data.formula_definitions f ON f.formula_definition_id=m.formula_definition_id WHERE ${selectable}${after} ORDER BY m.${definition.id} ASC LIMIT $${params.length}::integer`, params));
  const items = result.rows.slice(0, size).map(normalize);
  const last = items.at(-1);
  return { items, page: { has_more: result.rows.length > size, next_cursor: result.rows.length > size && last ? Buffer.from(JSON.stringify({ hash, id: last.methodology_version_ref })).toString("base64url") : null } };
}
