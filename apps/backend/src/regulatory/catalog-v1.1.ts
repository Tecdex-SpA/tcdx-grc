import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type pg from "pg";
import { newUuidV7 } from "../uuid.js";

type Row = Record<string, unknown>;
type Manifest = {
  version: string;
  generated_on: string;
  files: Array<{ file: string; sha256: string; bytes: number }>;
  canonical_counts: Record<string, number>;
};
type Catalog = { manifest: Manifest; checksum: string; rows: Record<string, Row[]> };
type DatabaseRow = Record<string, unknown>;

const FILES = [
  "source_registry", "provenance_registry", "regulatory_packs", "regulatory_pack_versions", "frameworks",
  "normative_units", "requirements", "regulatory_reference_controls", "regulatory_reference_control_versions",
  "tcdx_baseline_controls", "tcdx_baseline_control_versions", "normative_unit_control_mappings",
  "requirement_control_mappings", "framework_crosswalks", "normative_unit_crosswalk_mappings",
  "requirement_crosswalk_mappings", "control_crosswalk_mappings", "coverage_manifest", "quarantined_relations"
] as const;
const SHA256 = /^[0-9a-f]{64}$/;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIRECTIONS = new Set(["source_to_target", "target_to_source", "bidirectional"]);
const RELATIONSHIPS = new Set(["equivalent", "partially_equivalent", "overlaps", "supports", "supersedes", "no_match"]);

function fail(message: string): never { throw new Error(`CATALOG_V1_1_FAIL_CLOSED: ${message}`); }
function sha256(bytes: string | Buffer): string { return createHash("sha256").update(bytes).digest("hex"); }
function value(row: Row, key: string): string {
  const raw = row[key];
  if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "boolean") fail(`Missing ${key}`);
  return String(raw);
}
function nonblank(row: Row, key: string): string {
  const result = value(row, key);
  if (!result.trim()) fail(`Blank ${key}`);
  return result;
}
function optional(row: Row, key: string): string | null {
  const raw = row[key];
  return raw === null || raw === undefined || raw === "" ? null : String(raw);
}
function positiveInteger(row: Row, key: string): number {
  const result = Number(value(row, key));
  if (!Number.isSafeInteger(result) || result < 1) fail(`Invalid ${key}`);
  return result;
}
function key(...parts: Array<string | number>): string { return parts.join("|"); }
function unique(rows: Row[], name: string): void {
  const keys = rows.map((row) => nonblank(row, "business_key"));
  if (new Set(keys).size !== keys.length) fail(`Duplicate ${name} business key`);
}
function byKey<T>(map: Map<string, T>, id: string, name: string): T {
  const result = map.get(id);
  if (result === undefined) fail(`Unresolved ${name}: ${id}`);
  return result;
}

/** Official ISO lifecycle stage 60.60 supplies the civil date 2023-12-18.
 * Midnight UTC is the canonical date-to-timestamptz boundary, not the ISO publication time.
 * This Catalog v1.1 rule is restricted to ISO_IEC_42001_2023 + source value 2023-12.
 */
export function catalogEffectiveFrom(frameworkCode: string, sourceValue: string | null, boundary: "from" | "to" = "from"): string | null {
  if (sourceValue === null || sourceValue === "") return null;
  if (boundary === "from" && sourceValue === "2023-12" && frameworkCode === "ISO_IEC_42001_2023") return "2023-12-18T00:00:00Z";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceValue)) fail(`Unapproved partial effective_from ${frameworkCode}/${sourceValue}`);
  const date = new Date(`${sourceValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== sourceValue) fail(`Invalid effective_from ${frameworkCode}/${sourceValue}`);
  return date.toISOString();
}

export function catalogHeaderDirection(sourceValue: string): string {
  if (sourceValue === "directed") return "source_to_target";
  if (sourceValue === "bidirectional") return sourceValue;
  return fail(`Unapproved FrameworkCrosswalk direction ${sourceValue}`);
}
export function catalogConfidence(sourceValue: string): string {
  if (sourceValue === "medium") return "0.750000";
  if (sourceValue === "high") return "0.900000";
  return fail(`Unapproved confidence ${sourceValue}`);
}

export function loadCatalogV11(directory: string): Catalog {
  const manifestBytes = readFileSync(join(directory, "manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Manifest;
  if (manifest.version !== "1.1" || manifest.generated_on !== "2026-09-28" || manifest.files.length !== 49) fail("Unexpected Catalog v1.1 manifest identity");
  for (const entry of manifest.files) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(entry.file) || !SHA256.test(entry.sha256)) fail("Invalid manifest file entry");
    const bytes = readFileSync(join(directory, entry.file));
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) fail(`Catalog hash drift: ${entry.file}`);
  }
  const rows: Record<string, Row[]> = {};
  for (const name of FILES) {
    const parsed: unknown = JSON.parse(readFileSync(join(directory, `${name}.json`), "utf8"));
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) fail(`Invalid ${name}`);
    rows[name] = parsed as Row[];
  }
  const countFiles: Record<string, string> = {
    regulatory_packs: "regulatory_packs", regulatory_pack_versions: "regulatory_pack_versions", frameworks: "frameworks",
    normative_units: "normative_units", requirements: "requirements", regulatory_reference_controls: "regulatory_reference_controls",
    tcdx_baseline_controls: "tcdx_baseline_controls", normative_unit_control_mappings: "normative_unit_control_mappings",
    requirement_control_mappings: "requirement_control_mappings", framework_crosswalks: "framework_crosswalks",
    normative_unit_crosswalk_mappings: "normative_unit_crosswalk_mappings", requirement_crosswalk_mappings: "requirement_crosswalk_mappings",
    control_crosswalk_mappings: "control_crosswalk_mappings", quarantined_relations: "quarantined_relations"
  };
  for (const [countKey, file] of Object.entries(countFiles)) {
    if (rows[file]!.length !== manifest.canonical_counts[countKey]) fail(`Count drift: ${file}`);
  }
  if (rows.regulatory_reference_control_versions!.length + rows.tcdx_baseline_control_versions!.length !== manifest.canonical_counts.control_versions_total) fail("ControlVersion count drift");
  for (const name of FILES) if (rows[name]![0]?.business_key !== undefined) unique(rows[name]!, name);
  const materializableMappingCodes = new Set([
    ...rows.requirement_control_mappings!, ...rows.requirement_crosswalk_mappings!
  ].map((row) => nonblank(row, "mapping_code")));
  for (const relation of rows.quarantined_relations!) {
    if (materializableMappingCodes.has(nonblank(relation, "record_id"))) fail("Quarantined relation is present in a materializable mapping file");
  }
  for (const row of rows.requirements!) {
    if (!nonblank(row, "summary_tcdx") || optional(row, "licensed_statement") || optional(row, "licensed_content_ref")) fail("Requirement editorial/licensed separation");
    if (!SHA256.test(nonblank(row, "content_hash"))) fail("Invalid Requirement content_hash");
  }
  for (const row of rows.framework_crosswalks!) catalogHeaderDirection(nonblank(row, "direction"));
  for (const name of ["normative_unit_crosswalk_mappings", "requirement_crosswalk_mappings", "control_crosswalk_mappings"] as const) {
    for (const row of rows[name]!) {
      if (!DIRECTIONS.has(nonblank(row, "direction")) || !RELATIONSHIPS.has(nonblank(row, "relationship_type"))) fail(`Invalid ${name} vocabulary`);
      nonblank(row, "provenance_ref");
      catalogConfidence(nonblank(row, "confidence"));
    }
  }
  return { manifest, checksum: sha256(manifestBytes), rows };
}

function same(actual: unknown, expected: unknown, column: string): boolean {
  if (actual === null || expected === null) return actual === expected;
  if (actual instanceof Date) return actual.toISOString() === new Date(String(expected)).toISOString();
  if (["coverage_contribution", "confidence", "coverage_percent"].includes(column)) return Number(actual) === Number(expected);
  if (typeof actual === "number" || typeof expected === "number") return Number(actual) === Number(expected);
  return String(actual) === String(expected);
}
function identifier(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) fail(`Invalid SQL identifier ${name}`);
  return `"${name}"`;
}
async function resolveRow(client: pg.Client, table: string, idColumn: string, business: Row, columns: Row, actorId: string): Promise<string> {
  const [schema, tableName] = table.split(".");
  if (!schema || !tableName) fail(`Invalid table ${table}`);
  const tableSql = `${identifier(schema)}.${identifier(tableName)}`;
  const clauses: string[] = [];
  const parameters: unknown[] = [];
  for (const [column, val] of Object.entries(business)) {
    if (val === null) clauses.push(`${identifier(column)} IS NULL`);
    else { parameters.push(val); clauses.push(`${identifier(column)}=$${parameters.length}`); }
  }
  const found = await client.query<DatabaseRow>(`SELECT * FROM ${tableSql} WHERE ${clauses.join(" AND ")} FOR UPDATE`, parameters);
  if (found.rows.length > 1) fail(`Duplicate ${table} business identity`);
  if (found.rows[0]) {
    for (const [column, val] of Object.entries(columns)) if (!same(found.rows[0][column], val, column)) fail(`Source drift: ${table}.${column}`);
    return String(found.rows[0][idColumn]);
  }
  const id = newUuidV7();
  if (!UUID_V7.test(id)) fail("Canonical UUIDv7 utility failed");
  const inserted: Row = { [idColumn]: id, created_by_user_identity_id: actorId, ...columns };
  if (["regulatory.regulatory_sources", "regulatory.frameworks", "controls.controls"].includes(table)) inserted.updated_by_user_identity_id = actorId;
  const entries = Object.entries(inserted);
  await client.query(`INSERT INTO ${tableSql} (${entries.map(([name]) => identifier(name)).join(",")}) VALUES (${entries.map((_, index) => `$${index + 1}`).join(",")})`, entries.map(([, val]) => val));
  return id;
}

export async function materializeCatalogV11(client: pg.Client, catalog: Catalog, actorId: string): Promise<{ replayed: boolean; checksum: string }> {
  if (!UUID_V7.test(actorId)) fail("Importer actor must be an existing UUIDv7 UserIdentity");
  const identity = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM iam.user_identities WHERE user_identity_id=$1 AND lifecycle_state='active'", [actorId]);
  if (identity.rows[0]?.count !== "1") fail("Importer actor UserIdentity is unavailable");
  const database = await client.query<{ name: string; major: number }>("SELECT current_database() AS name,current_setting('server_version_num')::integer/10000 AS major");
  if (database.rows[0]?.name !== "tcdx-grc" || database.rows[0]?.major !== 16) fail("Wrong database identity");
  const rows = catalog.rows;
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('tcdx-grc:catalog-v1.1'))");
    const packVersionByCode = new Map(rows.regulatory_pack_versions!.map((row) => [nonblank(row, "pack_code"), row]));
    const frameworkByCode = new Map(rows.frameworks!.map((row) => [nonblank(row, "framework_code"), row]));
    const sourceIds = new Map<string, string>();
    for (const source of rows.source_registry!) {
      const code = nonblank(source, "source_id");
      const id = await resolveRow(client, "regulatory.regulatory_sources", "regulatory_source_id", { source_code: code }, {
        source_code: code, source_type: nonblank(source, "source_type"), publisher: nonblank(source, "authority"),
        official_uri: optional(source, "url"), license_classification: nonblank(source, "license_classification"),
        lifecycle_state: nonblank(source, "lifecycle_state")
      }, actorId);
      sourceIds.set(code, id);
    }
    const packVersionIds = new Map<string, string>();
    const frameworkVersionIds = new Map<string, string>();
    for (const pack of rows.regulatory_packs!) {
      const code = nonblank(pack, "pack_code");
      const packVersion = byKey(packVersionByCode, code, "RegulatoryPackVersion");
      const framework = byKey(frameworkByCode, code, "Framework");
      const existing = await client.query<DatabaseRow>("SELECT * FROM regulatory.regulatory_packs WHERE pack_code=$1 FOR UPDATE", [code]);
      let packId: string;
      if (existing.rows[0]) {
        const prior = existing.rows[0];
        packId = String(prior.regulatory_pack_id);
        if (prior.source_type !== pack.source_type) fail(`RegulatoryPack source drift ${code}`);
        if (prior.name !== pack.name || prior.jurisdiction_code !== pack.jurisdiction || prior.lifecycle_state !== "draft") {
          const versions = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_id=$1", [packId]);
          if (versions.rows[0]?.count !== "0") fail(`RegulatoryPack published/existing header drift ${code}`);
          await client.query("UPDATE regulatory.regulatory_packs SET name=$2,jurisdiction_code=$3,lifecycle_state='draft',updated_by_user_identity_id=$4,updated_at=CURRENT_TIMESTAMP,row_version=row_version+1 WHERE regulatory_pack_id=$1", [packId, pack.name, pack.jurisdiction, actorId]);
        }
      } else {
        packId = await resolveRow(client, "regulatory.regulatory_packs", "regulatory_pack_id", { pack_code: code }, {
          pack_code: code, name: nonblank(pack, "name"), source_type: nonblank(pack, "source_type"),
          jurisdiction_code: nonblank(pack, "jurisdiction"), lifecycle_state: "draft"
        }, actorId);
      }
      const packVersionNumber = positiveInteger(packVersion, "version_number");
      const pvId = await resolveRow(client, "regulatory.regulatory_pack_versions", "regulatory_pack_version_id", { regulatory_pack_id: packId, version_number: packVersionNumber }, {
        regulatory_pack_id: packId, version_number: packVersionNumber, lifecycle_state: "draft",
        edition: nonblank(packVersion, "edition"), license_classification: nonblank(packVersion, "license_classification"),
        effective_from: catalogEffectiveFrom(code, optional(packVersion, "effective_from")),
        effective_to: catalogEffectiveFrom(code, optional(packVersion, "effective_to"), "to"), content_hash: sha256(JSON.stringify(packVersion))
      }, actorId);
      packVersionIds.set(code, pvId);
      const frameworkCode = nonblank(framework, "framework_code");
      const fwId = await resolveRow(client, "regulatory.frameworks", "framework_id", { ownership_class: "GLOBAL_REFERENCE", tenant_id: null, framework_code: frameworkCode }, {
        ownership_class: "GLOBAL_REFERENCE", tenant_id: null, framework_code: frameworkCode,
        name: nonblank(framework, "name"), source_type: nonblank(pack, "source_type"), lifecycle_state: "draft"
      }, actorId);
      const fvId = await resolveRow(client, "regulatory.framework_versions", "framework_version_id", { framework_id: fwId, version_number: positiveInteger(framework, "version_number") }, {
        ownership_class: "GLOBAL_REFERENCE", tenant_id: null, framework_id: fwId,
        version_number: positiveInteger(framework, "version_number"), edition: nonblank(framework, "edition"),
        lifecycle_state: "draft", effective_from: catalogEffectiveFrom(code, optional(packVersion, "effective_from")),
        effective_to: catalogEffectiveFrom(code, optional(packVersion, "effective_to"), "to"), content_hash: sha256(JSON.stringify(framework))
      }, actorId);
      frameworkVersionIds.set(key(frameworkCode, positiveInteger(framework, "version_number")), fvId);
      await resolveRow(client, "regulatory.regulatory_pack_framework_versions", "regulatory_pack_framework_version_id", { regulatory_pack_version_id: pvId, framework_version_id: fvId }, {
        regulatory_pack_version_id: pvId, framework_version_id: fvId
      }, actorId);
    }
    const unitIds = new Map<string, string>();
    const unitByCode = new Map(rows.normative_units!.map((row) => [key(nonblank(row, "framework_code"), positiveInteger(row, "framework_version_number"), nonblank(row, "normative_unit_code")), row]));
    if (unitByCode.size !== rows.normative_units!.length) fail("Duplicate NormativeUnit framework/version/code");
    const pending = [...rows.normative_units!];
    while (pending.length) {
      const index = pending.findIndex((row) => !optional(row, "parent_normative_unit_code") || unitIds.has(key(nonblank(row, "framework_code"), positiveInteger(row, "framework_version_number"), nonblank(row, "parent_normative_unit_code"))));
      if (index < 0) fail("Unresolved or cyclic NormativeUnit hierarchy");
      const unit = pending.splice(index, 1)[0]!;
      const code = nonblank(unit, "framework_code");
      const version = positiveInteger(unit, "framework_version_number");
      const frameworkVersionId = byKey(frameworkVersionIds, key(code, version), "FrameworkVersion");
      const unitCode = nonblank(unit, "normative_unit_code");
      const parentCode = optional(unit, "parent_normative_unit_code");
      const unitId = await resolveRow(client, "regulatory.normative_units", "normative_unit_id", { framework_version_id: frameworkVersionId, source_locator: nonblank(unit, "source_locator") }, {
        ownership_class: "GLOBAL_REFERENCE", tenant_id: null, framework_version_id: frameworkVersionId,
        parent_normative_unit_id: parentCode ? byKey(unitIds, key(code, version, parentCode), "parent NormativeUnit") : null,
        unit_type: nonblank(unit, "unit_type"), unit_code: unitCode, title: nonblank(unit, "title"),
        display_order: positiveInteger(unit, "display_order"), source_locator: nonblank(unit, "source_locator"),
        content_language: nonblank(unit, "content_language"), licensed_content: optional(unit, "licensed_content"),
        licensed_content_ref: optional(unit, "licensed_content_ref"), content_hash: nonblank(unit, "content_hash"),
        license_classification: nonblank(unit, "license_classification"), provenance_ref: nonblank(unit, "provenance_ref"),
        effective_from: catalogEffectiveFrom(code, optional(unit, "effective_from")),
        effective_to: catalogEffectiveFrom(code, optional(unit, "effective_to"), "to")
      }, actorId);
      unitIds.set(key(code, version, unitCode), unitId);
    }
    const requirementIds = new Map<string, string>();
    const requirementKeysByCode = new Map<string, string>();
    for (const requirement of rows.requirements!) {
      const code = nonblank(requirement, "framework_code");
      const version = positiveInteger(requirement, "framework_version_number");
      const frameworkVersionId = byKey(frameworkVersionIds, key(code, version), "FrameworkVersion");
      const requirementCode = nonblank(requirement, "requirement_code");
      const requirementId = await resolveRow(client, "regulatory.requirements", "requirement_id", { framework_version_id: frameworkVersionId, requirement_code: requirementCode }, {
        ownership_class: "GLOBAL_REFERENCE", tenant_id: null, framework_version_id: frameworkVersionId,
        normative_unit_id: byKey(unitIds, key(code, version, nonblank(requirement, "normative_unit_code")), "Requirement NormativeUnit"),
        requirement_code: requirementCode, requirement_kind: nonblank(requirement, "requirement_kind"),
        statement_locator: nonblank(requirement, "statement_locator"), content_language: nonblank(requirement, "content_language"),
        licensed_statement: optional(requirement, "licensed_statement"), licensed_content_ref: optional(requirement, "licensed_content_ref"),
        editorial_summary: nonblank(requirement, "summary_tcdx"), content_hash: nonblank(requirement, "content_hash"),
        is_mandatory: value(requirement, "is_mandatory") === "true",
        applicability_guidance: optional(requirement, "applicability_guidance"), evidence_expectations: optional(requirement, "evidence_expectations"),
        effective_from: catalogEffectiveFrom(code, optional(requirement, "effective_from")),
        effective_to: catalogEffectiveFrom(code, optional(requirement, "effective_to"), "to"), provenance_ref: nonblank(requirement, "provenance_ref")
      }, actorId);
      const requirementKey = key(code, version, requirementCode);
      requirementIds.set(requirementKey, requirementId);
      if (requirementKeysByCode.has(requirementCode)) fail(`Ambiguous Requirement code in Catalog v1.1 mappings: ${requirementCode}`);
      requirementKeysByCode.set(requirementCode, requirementKey);
    }
    const requirementIdForCatalogCode = (code: string) => byKey(requirementIds,
      byKey(requirementKeysByCode, code, "Requirement framework/version key"), "Requirement");
    const controlVersionIds = new Map<string, string>();
    const controlFrameworks = new Map<string, string>();
    const materializeControls = async (controls: Row[], versions: Row[], ownership: "GLOBAL_REFERENCE" | "PLATFORM_CONTROL", origin: string) => {
      const versionByCode = new Map(versions.map((row) => [nonblank(row, "control_code"), row]));
      if (versionByCode.size !== versions.length) fail(`Duplicate ${origin} ControlVersion code`);
      for (const control of controls) {
        const code = nonblank(control, "control_code");
        if (nonblank(control, "ownership_class") !== ownership || nonblank(control, "control_origin") !== origin) fail(`Control ownership/origin drift ${code}`);
        const controlId = await resolveRow(client, "controls.controls", "control_id", { ownership_class: ownership, tenant_id: null, control_code: code }, {
          ownership_class: ownership, tenant_id: null, control_code: code, name: nonblank(control, "name"),
          control_origin: origin, based_on_control_version_id: null, business_owner_subject_id: null, lifecycle_state: "draft"
        }, actorId);
        const version = byKey(versionByCode, code, "ControlVersion");
        const versionNumber = positiveInteger(version, "version_number");
        const effectiveFramework = optional(control, "source_framework_code");
        if (effectiveFramework) controlFrameworks.set(code, effectiveFramework);
        const controlVersionId = await resolveRow(client, "controls.control_versions", "control_version_id", { control_id: controlId, version_number: versionNumber }, {
          ownership_class: ownership, tenant_id: null, control_id: controlId, version_number: versionNumber,
          objective: nonblank(version, "objective"), control_type: nonblank(version, "control_type"),
          nature: nonblank(version, "nature"), frequency_code: nonblank(version, "frequency_code"),
          execution_method: nonblank(version, "execution_method"), verification_method: nonblank(version, "verification_method"),
          minimum_evidence: nonblank(version, "minimum_evidence"), suggested_owner_role_code: optional(version, "suggested_owner_role_code"),
          lifecycle_state: "draft", effective_from: effectiveFramework ? catalogEffectiveFrom(effectiveFramework, optional(version, "effective_from")) : null,
          effective_to: effectiveFramework ? catalogEffectiveFrom(effectiveFramework, optional(version, "effective_to"), "to") : null
        }, actorId);
        controlVersionIds.set(key(ownership, code, versionNumber), controlVersionId);
      }
    };
    await materializeControls(rows.regulatory_reference_controls!, rows.regulatory_reference_control_versions!, "GLOBAL_REFERENCE", "regulatory_reference");
    for (const mapping of rows.normative_unit_control_mappings!) {
      const code = nonblank(mapping, "framework_code");
      const unitId = byKey(unitIds, key(code, positiveInteger(mapping, "framework_version_number"), nonblank(mapping, "normative_unit_code")), "NormativeUnitControlMapping source");
      const controlVersionId = byKey(controlVersionIds, key("GLOBAL_REFERENCE", nonblank(mapping, "control_code"), positiveInteger(mapping, "control_version_number")), "NormativeUnitControlMapping control");
      if (byKey(controlFrameworks, nonblank(mapping, "control_code"), "control framework") !== code) fail("NormativeUnitControlMapping framework mismatch");
      await resolveRow(client, "regulatory.normative_unit_control_mappings", "normative_unit_control_mapping_id", {
        normative_unit_id: unitId, control_version_id: controlVersionId, mapping_version: 1
      }, { ownership_class: "GLOBAL_REFERENCE", tenant_id: null, normative_unit_id: unitId, control_version_id: controlVersionId,
        mapping_version: 1, source_locator: nonblank(mapping, "normative_unit_code"), rationale: null,
        lifecycle_state: "draft", effective_from: null, effective_to: null, provenance_ref: nonblank(mapping, "provenance_ref")
      }, actorId);
    }
    await materializeControls(rows.tcdx_baseline_controls!, rows.tcdx_baseline_control_versions!, "PLATFORM_CONTROL", "tcdx_baseline");
    for (const mapping of rows.requirement_control_mappings!) {
      const requirementId = requirementIdForCatalogCode(nonblank(mapping, "requirement_code"));
      const controlVersionId = byKey(controlVersionIds, key("PLATFORM_CONTROL", nonblank(mapping, "control_code"), positiveInteger(mapping, "control_version_number")), "RequirementControlMapping control");
      if (nonblank(mapping, "ownership_class") !== "PLATFORM_CONTROL") fail("RequirementControlMapping ownership drift");
      await resolveRow(client, "regulatory.requirement_control_mappings", "requirement_control_mapping_id", {
        requirement_id: requirementId, control_version_id: controlVersionId, mapping_type: nonblank(mapping, "mapping_type"), mapping_version: 1
      }, { ownership_class: "PLATFORM_CONTROL", tenant_id: null, requirement_id: requirementId,
        control_version_id: controlVersionId, mapping_version: 1, mapping_type: nonblank(mapping, "mapping_type"),
        coverage_contribution: optional(mapping, "coverage_contribution"), rationale: nonblank(mapping, "rationale"),
        lifecycle_state: "draft", effective_from: null, effective_to: null, provenance_ref: nonblank(mapping, "provenance_ref")
      }, actorId);
    }
    const crosswalks = new Map<string, { id: string; source: string; target: string; direction: string; provenance: string; effectiveFrom: string; effectiveTo: string | null }>();
    for (const crosswalk of rows.framework_crosswalks!) {
      const code = nonblank(crosswalk, "crosswalk_code");
      const sourceCode = nonblank(crosswalk, "source_framework_code");
      const targetCode = nonblank(crosswalk, "target_framework_code");
      const sourceId = byKey(frameworkVersionIds, key(sourceCode, positiveInteger(crosswalk, "source_framework_version_number")), "crosswalk source framework");
      const targetId = byKey(frameworkVersionIds, key(targetCode, positiveInteger(crosswalk, "target_framework_version_number")), "crosswalk target framework");
      const effectiveFrom = catalogEffectiveFrom(sourceCode, optional(crosswalk, "effective_from") ?? catalog.manifest.generated_on);
      if (!effectiveFrom) fail("FrameworkCrosswalk effective_from missing");
      const effectiveTo = catalogEffectiveFrom(sourceCode, optional(crosswalk, "effective_to"), "to");
      const direction = catalogHeaderDirection(nonblank(crosswalk, "direction"));
      const provenance = nonblank(crosswalk, "provenance_ref");
      const id = await resolveRow(client, "regulatory.framework_crosswalks", "framework_crosswalk_id", {
        source_framework_version_id: sourceId, target_framework_version_id: targetId, crosswalk_version: 1
      }, { ownership_class: "GLOBAL_REFERENCE", tenant_id: null, source_framework_version_id: sourceId,
        target_framework_version_id: targetId, crosswalk_version: 1, direction, lifecycle_state: "draft",
        effective_from: effectiveFrom, effective_to: effectiveTo, provenance_ref: provenance
      }, actorId);
      crosswalks.set(code, { id, source: sourceCode, target: targetCode, direction, provenance, effectiveFrom, effectiveTo });
    }
    const crosswalkSpecs = [
      { file: "normative_unit_crosswalk_mappings", table: "regulatory.normative_unit_crosswalk_mappings", id: "normative_unit_crosswalk_mapping_id", source: "source_normative_unit_id", target: "target_normative_unit_id", sourceCode: "source_normative_unit_code", targetCode: "target_normative_unit_code", kind: "unit" },
      { file: "requirement_crosswalk_mappings", table: "regulatory.requirement_crosswalk_mappings", id: "requirement_crosswalk_mapping_id", source: "source_requirement_id", target: "target_requirement_id", sourceCode: "source_requirement_code", targetCode: "target_requirement_code", kind: "requirement" },
      { file: "control_crosswalk_mappings", table: "regulatory.control_crosswalk_mappings", id: "control_crosswalk_mapping_id", source: "source_control_version_id", target: "target_control_version_id", sourceCode: "source_control_code", targetCode: "target_control_code", kind: "control" }
    ] as const;
    for (const spec of crosswalkSpecs) for (const mapping of rows[spec.file]!) {
      const header = byKey(crosswalks, nonblank(mapping, "crosswalk_code"), "FrameworkCrosswalk");
      const resolveTyped = (side: "source" | "target"): string | null => {
        const code = optional(mapping, side === "source" ? spec.sourceCode : spec.targetCode);
        if (!code) return null;
        const frameworkCode = side === "source" ? header.source : header.target;
        if (spec.kind === "unit") {
          const fw = byKey(frameworkByCode, frameworkCode, "Framework");
          return byKey(unitIds, key(frameworkCode, positiveInteger(fw, "version_number"), code), "crosswalk NormativeUnit");
        }
        if (spec.kind === "requirement") {
          const source = rows.requirements!.find((item) => item.requirement_code === code && item.framework_code === frameworkCode);
          if (!source) fail("Crosswalk Requirement framework mismatch");
          return requirementIdForCatalogCode(code);
        }
        if (byKey(controlFrameworks, code, "crosswalk Control framework") !== frameworkCode) fail("Crosswalk Control framework mismatch");
        return byKey(controlVersionIds, key("GLOBAL_REFERENCE", code, positiveInteger(mapping, `${side}_control_version_number`)), "crosswalk ControlVersion");
      };
      const sourceId = resolveTyped("source");
      const targetId = resolveTyped("target");
      if (!sourceId || (nonblank(mapping, "relationship_type") === "no_match") !== (targetId === null)) fail("Crosswalk target/no_match contradiction");
      const effectiveFrom = catalogEffectiveFrom(header.source, optional(mapping, "effective_from")) ?? header.effectiveFrom;
      const effectiveTo = optional(mapping, "effective_to") === null ? header.effectiveTo : catalogEffectiveFrom(header.source, optional(mapping, "effective_to"), "to");
      const business = { framework_crosswalk_id: header.id, [spec.source]: sourceId, [spec.target]: targetId, mapping_version_number: 1 };
      await resolveRow(client, spec.table, spec.id, business, {
        ownership_class: "GLOBAL_REFERENCE", tenant_id: null, ...business,
        relationship_type: nonblank(mapping, "relationship_type"), direction: nonblank(mapping, "direction"),
        rationale: nonblank(mapping, "rationale"), confidence: catalogConfidence(nonblank(mapping, "confidence")),
        provenance_ref: nonblank(mapping, "provenance_ref"), mapping_status: nonblank(mapping, "status"),
        effective_from: effectiveFrom, effective_to: effectiveTo
      }, actorId);
    }
    for (const coverage of rows.coverage_manifest!) {
      const code = nonblank(coverage, "framework_code");
      const pvId = byKey(packVersionIds, code, "coverage RegulatoryPackVersion");
      const units = rows.normative_units!.filter((row) => row.framework_code === code);
      const requirements = rows.requirements!.filter((row) => row.framework_code === code);
      const controls = rows.regulatory_reference_controls!.filter((row) => row.source_framework_code === code);
      const editorial = rows.normative_unit_control_mappings!.filter((row) => row.framework_code === code);
      const compliance = rows.requirement_control_mappings!.filter((row) => requirements.some((item) => item.requirement_code === row.requirement_code));
      if (units.length !== Number(coverage.normative_units_import_ready) || requirements.length !== Number(coverage.requirements_import_ready)
        || controls.length !== Number(coverage.reference_controls_import_ready)) fail(`Coverage source count drift ${code}`);
      const reviewed = (row: Row) => row.review_status === "reviewed_public_source";
      const unitReviewed = units.filter(reviewed).length;
      const requirementReviewed = requirements.filter(reviewed).length;
      const controlReviewed = controls.filter(reviewed).length;
      const editorialReviewed = editorial.filter(reviewed).length;
      const complianceReviewed = compliance.filter(reviewed).length;
      const complete = unitReviewed === units.length && requirementReviewed === requirements.length && controlReviewed === controls.length
        && editorialReviewed === editorial.length && complianceReviewed === compliance.length;
      await resolveRow(client, "regulatory.regulatory_coverage_manifests", "regulatory_coverage_manifest_id", { regulatory_pack_version_id: pvId }, {
        regulatory_pack_version_id: pvId, normative_units_expected: units.length, normative_units_imported: units.length,
        normative_units_reviewed: unitReviewed, requirements_expected: requirements.length, requirements_imported: requirements.length,
        requirements_reviewed: requirementReviewed, reference_controls_expected: controls.length, reference_controls_imported: controls.length,
        reference_controls_reviewed: controlReviewed, valid_parent_links: units.length,
        reviewed_editorial_mappings: editorialReviewed, reviewed_compliance_mappings: complianceReviewed,
        coverage_percent: complete ? 100 : 0
      }, actorId);
    }
    let replayed = true;
    for (const pack of rows.regulatory_packs!) {
      const code = nonblank(pack, "pack_code");
      const pvId = byKey(packVersionIds, code, "import RegulatoryPackVersion");
      const primarySource = rows.source_registry!.filter((source) => source.framework_code === code && source.url === pack.source_url);
      if (primarySource.length !== 1) fail(`Ambiguous primary RegulatorySource ${code}`);
      const sourceId = byKey(sourceIds, nonblank(primarySource[0]!, "source_id"), "import RegulatorySource");
      const found = await client.query<{ regulatory_import_manifest_id: string; regulatory_source_id: string; row_count: string }>(
        "SELECT regulatory_import_manifest_id,regulatory_source_id,row_count::text FROM regulatory.regulatory_import_manifests WHERE regulatory_pack_version_id=$1 AND import_checksum=$2 FOR UPDATE", [pvId, catalog.checksum]);
      const rowCount = rows.normative_units!.filter((row) => row.framework_code === code).length
        + rows.requirements!.filter((row) => row.framework_code === code).length
        + rows.regulatory_reference_controls!.filter((row) => row.source_framework_code === code).length;
      if (found.rows.length > 1) fail(`Duplicate import manifest ${code}`);
      if (found.rows[0]) {
        if (found.rows[0].regulatory_source_id !== sourceId || Number(found.rows[0].row_count) !== rowCount) fail(`Import manifest drift ${code}`);
      } else {
        replayed = false;
        await client.query(`INSERT INTO regulatory.regulatory_import_manifests
          (regulatory_import_manifest_id,created_by_user_identity_id,regulatory_pack_version_id,regulatory_source_id,import_checksum,source_edition,imported_by_user_identity_id,imported_at,row_count,outcome)
          VALUES ($1,$2,$3,$4,$5,$6,$2,CURRENT_TIMESTAMP,$7,'validated')`, [
          newUuidV7(), actorId, pvId, sourceId, catalog.checksum, nonblank(byKey(packVersionByCode, code, "RegulatoryPackVersion"), "edition"), rowCount
        ]);
      }
    }
    await client.query("COMMIT");
    return { replayed, checksum: catalog.checksum };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
