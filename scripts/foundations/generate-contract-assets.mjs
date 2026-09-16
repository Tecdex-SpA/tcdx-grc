#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const checkOnly = process.argv.includes("--check");
const physicalPath = resolve(root, "docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md");
const permissionPath = resolve(root, "docs/executable-contracts/05_PERMISSION_CATALOG.md");
const seedPath = resolve(root, "docs/executable-contracts/09_SEED_MANIFESTS.md");
const generatedAt = "2026-09-16T00:00:00.000Z";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const quoteIdent = (value) => `"${value.replaceAll('"', '""')}"`;
const fq = (name) => name.split(".").map(quoteIdent).join(".");
const compactIdent = (value) => value.length <= 63 ? value : `${value.slice(0, 54)}_${sha256(value).slice(0, 8)}`;
const constraint = (value) => quoteIdent(compactIdent(value));

function camelToSnake(value) {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function singular(value) {
  const irregular = new Map([
    ["criteria", "criterion"], ["data", "datum"], ["analyses", "analysis"],
    ["processes", "process"], ["statuses", "status"], ["evidence", "evidence"],
    ["data_lineage", "data_lineage"], ["kris", "kri"], ["bia", "bia"]
  ]);
  if (irregular.has(value)) return irregular.get(value);
  if (value.endsWith("_criteria")) return `${value.slice(0, -8)}_criterion`;
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("sses") || value.endsWith("xes") || value.endsWith("ches")) return value.slice(0, -2);
  if (value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function pkFor(tableName, entity) {
  if (/^[A-Z]/.test(entity)) return `${camelToSnake(entity)}_id`;
  const table = tableName.split(".")[1];
  return `${singular(table)}_id`;
}

const typedColumns = (prefix = "") => [
  [`${prefix}boolean_value`, "boolean", true],
  [`${prefix}integer_value`, "bigint", true],
  [`${prefix}decimal_value`, "numeric(30,10)", true],
  [`${prefix}text_value`, "text", true],
  [`${prefix}timestamp_value`, "timestamptz", true],
  [`${prefix}duration_seconds_value`, "bigint", true],
  [`${prefix}json_value`, "jsonb", true]
];

function parseColumnSpec(spec) {
  const explicit = spec.match(/^([a-z0-9_/]+)\s+([a-z]+(?:\([0-9,]+\))?)([!?])?(?:=([^\s]+))?$/);
  if (!explicit) {
    const inferred = spec.match(/^([a-z0-9_]+)([!?])$/);
    if (!inferred) return [];
    return [[inferred[1], inferred[1].endsWith("_id") ? "uuid" : "text", inferred[2] === "?", undefined]];
  }
  const [, rawNames, type, marker, defaultValue] = explicit;
  let names = [rawNames];
  if (rawNames.includes("/")) {
    const [base, suffix] = rawNames.split("/");
    const prefix = base.includes("_") ? base.slice(0, base.lastIndexOf("_") + 1) : "";
    names = [base, `${prefix}${suffix}`];
  }
  return names.map((name) => [name, type, marker === "?", defaultValue]);
}

const commonProfileColumns = {
  M: (pk) => [
    [pk, "uuid", false], ["created_at", "timestamptz", false, "CURRENT_TIMESTAMP"],
    ["created_by_user_identity_id", "uuid", true], ["created_by_service_principal_id", "uuid", true],
    ["updated_at", "timestamptz", false, "CURRENT_TIMESTAMP"], ["updated_by_user_identity_id", "uuid", true],
    ["updated_by_service_principal_id", "uuid", true], ["row_version", "bigint", false, "1"]
  ],
  I: (pk) => [
    [pk, "uuid", false], ["created_at", "timestamptz", false, "CURRENT_TIMESTAMP"],
    ["created_by_user_identity_id", "uuid", true], ["created_by_service_principal_id", "uuid", true]
  ]
};

function profileColumns(profile, pk) {
  const immutable = ["I", "TI", "V", "TV", "MXI", "EV"].includes(profile);
  const columns = (immutable ? commonProfileColumns.I(pk) : commonProfileColumns.M(pk)).map((v) => [...v]);
  if (["TM", "TI", "TV"].includes(profile)) columns.push(["tenant_id", "uuid", false]);
  if (["MX", "MXI", "EV"].includes(profile)) {
    columns.push(["ownership_class", "varchar(24)", false], ["tenant_id", "uuid", true]);
  }
  if (["V", "TV"].includes(profile)) {
    columns.push(
      ["version_number", "bigint", false], ["lifecycle_state", "varchar(32)", false],
      ["effective_from", "timestamptz", true], ["effective_to", "timestamptz", true],
      ["published_at", "timestamptz", true], ["superseded_by_id", "uuid", true]
    );
  }
  if (profile === "EV") columns.push(["correlation_id", "uuid", false], ["causation_id", "uuid", true]);
  return columns;
}

function parsePhysicalModel() {
  const text = readFileSync(physicalPath, "utf8");
  const rows = [];
  for (const line of text.split("\n")) {
    if (!/^\| `[^`]+` — /.test(line)) continue;
    const cells = line.slice(2, -2).split(" | ").map((cell) => cell.trim());
    const identity = cells[0].match(/^`([^`]+)` — (.+)$/);
    if (!identity) throw new Error(`Unparseable physical identity: ${cells[0]}`);
    const [, name, entity] = identity;
    const profile = cells[1].split("/")[0].trim();
    const pk = pkFor(name, entity);
    const own = [];
    for (const token of cells[2].matchAll(/`([^`]+)`/g)) own.push(...parseColumnSpec(token[1]));
    if (cells[2].includes("typed value columns from 10")) own.push(...typedColumns());
    if (cells[2].includes("typed default columns from 10")) own.push(...typedColumns("default_"));
    if (cells[2].includes("typed operand columns from 10")) own.push(...typedColumns("operand_"));
    if (cells[2].includes("typed effective value columns from 10")) own.push(...typedColumns("effective_"));
    if (cells[2].includes("four weight columns")) {
      own.push(["completeness_weight", "numeric(12,6)", false], ["freshness_weight", "numeric(12,6)", false],
        ["validity_weight", "numeric(12,6)", false], ["lineage_weight", "numeric(12,6)", false]);
    }
    if (cells[2].includes("matching nine target columns")) {
      for (const source of ["raw_record", "observation", "source_resolution", "calculation_input", "metric_measurement", "rule_evaluation", "grc_impact", "snapshot_item", "ai_recommendation"])
        own.push([`${source}_to_id`, "uuid", true]);
    }
    if (cells[2].includes("lifecycle/effective/publish/supersession fields")) {
      own.push(["lifecycle_state", "varchar(32)", false], ["effective_from", "timestamptz", true],
        ["effective_to", "timestamptz", true], ["published_at", "timestamptz", true], ["superseded_by_id", "uuid", true]);
    }
    const merged = new Map();
    for (const col of [...profileColumns(profile, pk), ...own]) merged.set(col[0], col);
    if (!merged.has(pk)) merged.set(pk, [pk, "uuid", false]);
    const columns = [merged.get(pk), ...[...merged.values()].filter((col) => col[0] !== pk)];
    rows.push({ name, schema: name.split(".")[0], table: name.split(".")[1], entity, profile, pk, columns, integrity: cells[3], retention: cells[4], fieldText: cells[2] });
  }
  if (rows.length !== 214) throw new Error(`Expected 214 physical tables, parsed ${rows.length}`);
  return rows;
}

function sqlDefault(raw, type) {
  if (raw === undefined) return "";
  if (raw === "CURRENT_TIMESTAMP") return " DEFAULT CURRENT_TIMESTAMP";
  if (raw === "empty_object") return " DEFAULT '{}'::jsonb";
  if (raw === "true" || raw === "false" || /^-?\d+$/.test(raw)) return ` DEFAULT ${raw}`;
  return ` DEFAULT ${q(raw)}`;
}

const targetGroups = {
  "evidence.evidence_requests": [["requirement_id", "control_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id"]],
  "evidence.evidence_links": [["requirement_id", "control_id", "control_version_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id"]],
  "remediation.issue_origins": [["requirement_assessment_id", "control_assessment_id", "assurance_test_id", "audit_test_id", "risk_id", "incident_id", "supplier_assessment_id"]],
  "data.calculation_inputs": [["observation_id", "source_resolution_id", "metric_measurement_id", "effective_configuration_id", "snapshot_id"]],
  "data.data_quality_assessments": [["observation_id", "metric_measurement_id", "calculation_input_id", "source_resolution_id", "snapshot_id", "dataset_subject_id"]],
  "data.snapshot_items": [["metric_measurement_id", "risk_assessment_id", "requirement_assessment_id", "control_assessment_id", "assurance_test_id", "rule_evaluation_id", "data_quality_assessment_id", "supplier_assessment_id", "audit_test_id", "dpia_id", "recovery_test_id", "issue_id", "action_id"]],
  "ai.ai_provenance_links": [["evidence_version_id", "metric_measurement_id", "snapshot_id", "knowledge_version_id", "requirement_id", "control_id", "risk_id", "issue_id"]],
  "data.data_lineage": [
    ["raw_record_id", "observation_id", "source_resolution_id", "calculation_input_id", "metric_measurement_id", "rule_evaluation_id", "grc_impact_id", "snapshot_item_id", "ai_recommendation_id"],
    ["raw_record_to_id", "observation_to_id", "source_resolution_to_id", "calculation_input_to_id", "metric_measurement_to_id", "rule_evaluation_to_id", "grc_impact_to_id", "snapshot_item_to_id", "ai_recommendation_to_id"]
  ]
};

function tableChecks(row) {
  const names = new Set(row.columns.map((column) => column[0]));
  const checks = [];
  const add = (key, expression) => checks.push({ key, expression });
  if (names.has("row_version")) add("row_version_positive", "row_version > 0");
  if (names.has("created_by_user_identity_id") && names.has("created_by_service_principal_id"))
    add("created_actor_one", "num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) <= 1");
  if (names.has("updated_by_user_identity_id") && names.has("updated_by_service_principal_id"))
    add("updated_actor_one", "num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1");
  if (names.has("actor_user_identity_id") && names.has("actor_service_principal_id"))
    add("actor_one", "num_nonnulls(actor_user_identity_id, actor_service_principal_id) <= 1");
  if (row.name === "ops_audit.idempotency_records")
    add("actor_required", "num_nonnulls(actor_user_identity_id, actor_service_principal_id) = 1");
  if (names.has("ownership_class")) {
    add("ownership_class", "ownership_class IN ('GLOBAL_REFERENCE','PLATFORM_CONTROL','TENANT_OWNED','TENANT_DERIVED')");
    add("tenant_ownership", "((ownership_class IN ('TENANT_OWNED','TENANT_DERIVED')) = (tenant_id IS NOT NULL))");
  }
  for (const [from, to] of [["effective_from", "effective_to"], ["period_start", "period_end"], ["valid_from", "valid_to"], ["starts_at", "ends_at"]]) {
    if (names.has(from) && names.has(to)) add(`${from}_${to}`, `${to} IS NULL OR ${from} IS NULL OR ${to} > ${from}`);
  }
  for (const name of names) {
    if (/(_percent|_coverage|coverage_percent|_value)$/.test(name) && row.columns.find((c) => c[0] === name)?.[1] === "numeric(5,2)")
      add(`${name}_range`, `${name} IS NULL OR ${name} BETWEEN 0 AND 100`);
    if (/confidence/.test(name) && row.columns.find((c) => c[0] === name)?.[1] === "numeric(7,6)")
      add(`${name}_range`, `${name} IS NULL OR ${name} BETWEEN 0 AND 1`);
    if (/attempt_count|attempt_number|row_count|_expected|_imported|_reviewed|duration_seconds/.test(name))
      add(`${name}_nonnegative`, `${name} IS NULL OR ${name} >= 0`);
  }
  if (names.has("calculation_status")) add("calculation_status", "calculation_status IN ('pending','running','succeeded','failed','cancelled')");
  if (names.has("result_status")) add("result_status", "result_status IN ('valid','no_data','insufficient_data','insufficient_coverage','stale_source','conflicting_sources','dependency_pending','invalid_input','source_error','calculation_error','not_applicable','superseded')");
  for (const [table, groups] of Object.entries(targetGroups)) {
    if (row.name !== table) continue;
    groups.forEach((group, index) => add(`typed_target_${index + 1}`, `num_nonnulls(${group.join(", ")}) = 1`));
  }
  for (const prefix of ["", "default_", "operand_", "effective_"]) {
    const values = typedColumns(prefix).map((column) => column[0]).filter((name) => names.has(name));
    if (values.length !== 7) continue;
    const requiresValue = prefix === "" && ["survey.survey_answers", "data.observations", "config.configuration_overrides"].includes(row.name);
    add(`${prefix || "typed_"}value_count`, `num_nonnulls(${values.join(", ")}) ${requiresValue ? "=" : "<="} 1`);
  }
  return checks;
}

function uniqueDefinitions(row) {
  const names = new Set(row.columns.map((column) => column[0]));
  const uniques = [];
  const tenantScoped = names.has("tenant_id") && row.pk !== "tenant_id";
  if (tenantScoped) uniques.push(["tenant_id", row.pk]);
  const ownNames = row.columns.filter((column) => !["created_at", "created_by_user_identity_id", "created_by_service_principal_id", "updated_at", "updated_by_user_identity_id", "updated_by_service_principal_id", "row_version", "ownership_class", "tenant_id"].includes(column[0])).map((column) => column[0]);
  const code = ownNames.find((name) => /_code$/.test(name) && name !== "country_code" && name !== "currency_code");
  const phraseColumns = (phrase) => {
    if (/\bpair\b/.test(phrase)) return ownNames.filter((name) => name.endsWith("_id") && name !== row.pk);
    const words = phrase.replace(/`|\(|\)|active |current |coalesced |partial\/logical | and .*/g, "").split(/[+,/]/).map((v) => v.trim()).filter(Boolean);
    const columns = [];
    for (const word of words) {
      const aliases = {
        ownership: "ownership_class", tenant: "tenant_id", code, version: names.has("version_number") ? "version_number" : ownNames.find((name) => name.endsWith("_version")),
        root: ownNames.find((name) => name.endsWith("_id") && name !== row.pk), entity: "entity_type", from: "from_state", command: "command_code",
        transition: "lifecycle_transition_definition_id", scope: "scope_kind", event: "event_code", ordinal: "ordinal", level: ownNames.find((name) => name.endsWith("level_value")), key: ownNames.find((name) => name.endsWith("_key"))
      };
      const normalized = word.replace(/\s.*/, "");
      const direct = names.has(normalized) ? normalized : names.has(`${normalized}_id`) ? `${normalized}_id` : names.has(`${normalized}_code`) ? `${normalized}_code` : aliases[normalized];
      if (direct && names.has(direct) && !columns.includes(direct)) columns.push(direct);
    }
    return columns;
  };
  for (const match of row.integrity.matchAll(/UQ\s+([^;]+)/g)) {
    const phrase = match[1];
    const explicit = phrase.match(/`\(([^)]+)\)`|`([a-z0-9_]+)`/);
    let columns = explicit ? (explicit[1] ?? explicit[2]).split(",").map((v) => v.trim()) : phraseColumns(phrase);
    columns = columns.filter((name) => names.has(name));
    if (columns.length) uniques.push(columns);
  }
  const exact = {
    "platform.plan_versions": [["plan_id", "version_number"]],
    "regulatory.regulatory_pack_versions": [["regulatory_pack_id", "version_number"]],
    "platform.entitlements": [["plan_version_id", "capability_id"]],
    "iam.role_permissions": [["ownership_class", "tenant_id", "role_id", "permission_id"]],
    "risk.impact_scale_levels": [["impact_scale_definition_id", "level_value"]],
    "risk.likelihood_scale_levels": [["likelihood_scale_definition_id", "level_value"]],
    "ops_audit.lifecycle_transition_definitions": [["entity_type", "from_state", "command_code", "version_number"]],
    "ops_audit.lifecycle_transition_scopes": [["lifecycle_transition_definition_id", "scope_kind"]],
    "ops_audit.lifecycle_transition_side_effects": [["lifecycle_transition_definition_id", "event_code"], ["lifecycle_transition_definition_id", "ordinal"]]
  };
  if (row.name === "ops_audit.audit_events") {
    for (let index = uniques.length - 1; index >= 0; index--) {
      if (uniques[index].length === 1 && uniques[index][0] === "event_code") uniques.splice(index, 1);
    }
  }
  if (row.name === "config.configuration_overrides") {
    for (let index = uniques.length - 1; index >= 0; index--) {
      if (uniques[index].length === 1 && uniques[index][0] === "override_version") uniques.splice(index, 1);
    }
    uniques.push(["configuration_definition_id", "scope_level", "methodology_id", "regulatory_pack_version_id", "scope_subject_id", "override_version", "effective_from"]);
  }
  if (row.name === "ops_audit.idempotency_records") {
    uniques.push(["ownership_class", "tenant_id", "actor_user_identity_id", "actor_service_principal_id", "operation_code", "idempotency_key"]);
  }
  uniques.push(...(exact[row.name] ?? []));
  return [...new Map(uniques.map((columns) => [columns.join("|"), columns])).values()];
}

function createTablesSql(rows, schemas) {
  const out = [`-- Generated mechanically from ${physicalPath.slice(root.length + 1)}.`, "-- PostgreSQL 16; the approved physical model remains authority.", ""];
  for (const row of rows.filter((item) => schemas.includes(item.schema))) {
    const lines = row.columns.map(([name, type, nullable, defaultValue]) => `  ${quoteIdent(name)} ${type}${nullable ? "" : " NOT NULL"}${sqlDefault(defaultValue, type)}`);
    lines.push(`  CONSTRAINT ${constraint(`pk_${row.table}`)} PRIMARY KEY (${quoteIdent(row.pk)})`);
    out.push(`CREATE TABLE ${fq(row.name)} (\n${lines.join(",\n")}\n);`, "");
  }
  return `${out.join("\n").trimEnd()}\n`;
}

function constraintsSql(rows) {
  const out = ["-- Declarative invariants derived from physical profiles 01 and invariants 03.", ""];
  for (const row of rows) {
    for (const check of tableChecks(row)) {
      out.push(`ALTER TABLE ${fq(row.name)} ADD CONSTRAINT ${constraint(`ck_${row.table}__${check.key}`)} CHECK (${check.expression});`);
    }
    for (const columns of uniqueDefinitions(row)) {
      const nullSemantics = columns.includes("tenant_id") ? " NULLS NOT DISTINCT" : "";
      out.push(`ALTER TABLE ${fq(row.name)} ADD CONSTRAINT ${constraint(`uq_${row.table}__${columns.join("_")}`)} UNIQUE${nullSemantics} (${columns.map(quoteIdent).join(", ")});`);
    }
  }
  return `${out.join("\n")}\n`;
}

function foreignKeysSql(rows) {
  const byPk = new Map(rows.map((row) => [row.pk, row]));
  const pkNames = [...byPk.keys()].sort((a, b) => b.length - a.length);
  const out = ["-- Foreign keys are added after every approved table exists; all delete actions are RESTRICT.", ""];
  for (const row of rows) {
    const names = new Set(row.columns.map((column) => column[0]));
    for (const [column, type] of row.columns) {
      if (type !== "uuid" || column === row.pk || column === "correlation_id" || column === "causation_id") continue;
      let target;
      if (column === "tenant_id") target = rows.find((item) => item.name === "platform.tenants");
      else if (column === "superseded_by_id") target = row;
      else {
        const match = pkNames.find((pk) => column === pk || column.endsWith(`_${pk}`));
        if (match) target = byPk.get(match);
      }
      if (!target) continue;
      // Composite FKs enforce same-tenant ownership only for strictly tenant-owned
      // parents. Mixed parents (MX/MXI/EV) may be GLOBAL/PLATFORM or same-tenant;
      // their compatibility is a transactional service invariant (physical 01 §12).
      const composite = column !== "tenant_id" && names.has("tenant_id") && ["TM", "TI", "TV"].includes(target.profile);
      const cols = composite ? ["tenant_id", column] : [column];
      const refs = composite ? ["tenant_id", target.pk] : [target.pk];
      const key = compactIdent(`fk_${row.table}__${column}`);
      out.push(`ALTER TABLE ${fq(row.name)} ADD CONSTRAINT ${quoteIdent(key)} FOREIGN KEY (${cols.map(quoteIdent).join(", ")}) REFERENCES ${fq(target.name)} (${refs.map(quoteIdent).join(", ")}) ON UPDATE NO ACTION ON DELETE RESTRICT;`);
    }
  }
  return `${out.join("\n")}\n`;
}

function indexesSql(rows) {
  const out = ["-- Required operational FK and authority-path indexes from physical index strategy 04.", ""];
  for (const row of rows) {
    const columns = new Set(row.columns.map((column) => column[0]));
    for (const [column, type] of row.columns) {
      if (type !== "uuid" || column === row.pk) continue;
      out.push(`CREATE INDEX ${quoteIdent(compactIdent(`ix_${row.table}__${column}`))} ON ${fq(row.name)} (${quoteIdent(column)});`);
    }
    const candidates = [
      ["tenant_id", "lifecycle_state"], ["tenant_id", "effective_from", "effective_to"],
      ["delivery_status", "available_at", "event_id"], ["tenant_id", "aggregate_type", "aggregate_id", "occurred_at"],
      ["tenant_id", "recipient_membership_id", "lifecycle_state", "created_at"]
    ];
    for (const candidate of candidates) {
      if (!candidate.every((column) => columns.has(column))) continue;
      out.push(`CREATE INDEX ${quoteIdent(compactIdent(`ix_${row.table}__${candidate.join("_")}`))} ON ${fq(row.name)} (${candidate.map(quoteIdent).join(", ")});`);
    }
  }
  out.push(`CREATE UNIQUE INDEX ${quoteIdent("uq_membership_roles__active_assignment")} ON ${fq("iam.membership_roles")} (${["tenant_id", "tenant_membership_id", "role_id", "scope_kind", "organizational_unit_id", "process_id", "service_id", "audit_id"].map(quoteIdent).join(", ")}) NULLS NOT DISTINCT WHERE valid_to IS NULL;`);
  return `${out.join("\n")}\n`;
}

function deterministicUuid(stableKey) {
  const bytes = Buffer.from(sha256(`TCDX_GRC_PHASE3_V1:${stableKey}`), "hex");
  const timestamp = BigInt(Date.parse(generatedAt));
  const out = Buffer.alloc(16);
  for (let i = 0; i < 6; i++) out[5 - i] = Number((timestamp >> BigInt(i * 8)) & 0xffn);
  bytes.copy(out, 6, 6, 16);
  out[6] = (out[6] & 0x0f) | 0x70;
  out[8] = (out[8] & 0x3f) | 0x80;
  const hex = out.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const roles = ["Platform Admin", "Platform Support", "Tenant Admin", "Executive/Board Viewer", "GRC Manager", "Quality Manager", "Compliance Manager", "Risk Manager", "CISO/Security Manager", "AI Governance Manager", "Privacy Manager", "Legal Reviewer", "Auditor Lead", "Auditor", "Process Owner", "Control Owner", "Evidence Owner", "Action Owner", "Supplier Manager", "Continuity Manager", "Regulatory Content Steward", "Data Admin", "Report Viewer", "Viewer"];
const capabilities = ["CORE_PLATFORM", "ISO_COMPLIANCE", "CONTROLS_ASSURANCE", "EVIDENCE_DOCUMENTS", "ISSUES_ACTIONS", "AUDIT", "ISO_REPORTING", "OPERATIONAL_RISK", "INCIDENTS_LOSS", "INTEGRATION_HUB", "DATA_TRUST", "RULES_IMPACT", "THIRD_PARTIES", "RESILIENCE", "PRIVACY", "SURVEYS", "REPORT_STUDIO", "REGULATORY_INTELLIGENCE", "AI_ASSISTANCE", "GOVERNED_AUTOMATION"];

function parsePermissions() {
  const rows = [];
  for (const line of readFileSync(permissionPath, "utf8").split("\n")) {
    const cells = line.startsWith("| `") ? line.slice(2, -2).split(" | ").map((cell) => cell.trim()) : [];
    if (!cells[0]?.match(/^`[a-z0-9_.]+`$/) || cells.length < 8) continue;
    const permissionCode = cells[0].slice(1, -1);
    if (!permissionCode.includes(".")) continue;
    const parts = permissionCode.split(".");
    let grantRoles = roles.filter((role) => cells[5].includes(role));
    if (/same as|same domain/i.test(cells[5]) && rows.length) {
      const resourcePrefix = parts.slice(0, -1).join(".");
      const inherited = [...rows].reverse().find((row) => row.permissionCode.startsWith(`${resourcePrefix}.`) && row.grantRoles.length);
      if (inherited) grantRoles = inherited.grantRoles;
    }
    rows.push({ permissionCode, domain: parts[0], resource: parts.slice(1, -1).join("."), action: parts.at(-1), capability: cells[1], scopes: cells[3].split(",").map((v) => v.trim()).filter(Boolean), grantRoles });
  }
  const unique = [...new Map(rows.map((row) => [row.permissionCode, row])).values()];
  if (unique.length !== 134) throw new Error(`Expected 134 permissions, parsed ${unique.length}`);
  return unique;
}

function parseLifecycle() {
  const rows = [];
  for (const line of readFileSync(seedPath, "utf8").split("\n")) {
    if (!line.startsWith("| `")) continue;
    const cells = line.slice(2, -2).split(" | ").map((cell) => cell.trim().replaceAll("`", ""));
    if (cells.length !== 10 || !cells[3]?.includes(".")) continue;
    rows.push({ entity: cells[0], from: cells[1], to: cells[2], command: cells[3], permission: cells[4], preconditions: cells[5], audit: cells[6], event: cells[7] });
  }
  if (rows.length !== 95) throw new Error(`Expected 95 lifecycle edges, parsed ${rows.length}`);
  return rows;
}

function seedsSql() {
  const permissions = parsePermissions();
  const lifecycle = parseLifecycle();
  const out = ["-- Canonical global/reference seeds from executable contract artifact 09.", "-- Stable UUIDv7 values use the fixed manifest publication instant plus SHA-256-derived randomness.", ""];
  const userCols = "created_by_user_identity_id, created_by_service_principal_id";
  const nullActors = "NULL, NULL";
  const now = q(generatedAt);
  const planCodes = ["ISO", "ISO_RIESGO_OPERATIVO", "GRC"];
  for (const code of planCodes) {
    const planId = deterministicUuid(`plan:${code}:v1`);
    const versionId = deterministicUuid(`plan_version:${code}:v1`);
    out.push(`INSERT INTO platform.plans (plan_id, created_at, ${userCols}, updated_at, updated_by_user_identity_id, updated_by_service_principal_id, row_version, plan_code, name, lifecycle_state) VALUES (${q(planId)}, ${now}, ${nullActors}, ${now}, ${nullActors}, 1, ${q(code)}, ${q(code.replaceAll("_", " "))}, 'published') ON CONFLICT (plan_code) DO NOTHING;`);
    out.push(`INSERT INTO platform.plan_versions (plan_version_id, created_at, ${userCols}, version_number, lifecycle_state, effective_from, effective_to, published_at, superseded_by_id, plan_id, display_name, commercial_terms_ref) VALUES (${q(versionId)}, ${now}, ${nullActors}, 1, 'published', ${now}, NULL, ${now}, NULL, ${q(planId)}, ${q(`${code} v1`)}, NULL) ON CONFLICT (plan_id, version_number) DO NOTHING;`);
  }
  capabilities.forEach((code) => {
    const id = deterministicUuid(`capability:${code}:v1`);
    out.push(`INSERT INTO platform.capabilities (capability_id, created_at, ${userCols}, updated_at, updated_by_user_identity_id, updated_by_service_principal_id, row_version, capability_code, capability_group, name, lifecycle_state) VALUES (${q(id)}, ${now}, ${nullActors}, ${now}, ${nullActors}, 1, ${q(code)}, ${q(code)}, ${q(code.replaceAll("_", " "))}, 'published') ON CONFLICT (capability_code) DO NOTHING;`);
  });
  for (const [index, plan] of planCodes.entries()) {
    const planVersionId = deterministicUuid(`plan_version:${plan}:v1`);
    for (const capability of capabilities.slice(0, index === 0 ? 7 : index === 1 ? 9 : 20)) {
      out.push(`INSERT INTO platform.entitlements (entitlement_id, created_at, ${userCols}, plan_version_id, capability_id, is_enabled) VALUES (${q(deterministicUuid(`entitlement:${plan}:${capability}:v1`))}, ${now}, ${nullActors}, ${q(planVersionId)}, ${q(deterministicUuid(`capability:${capability}:v1`))}, true) ON CONFLICT DO NOTHING;`);
    }
  }
  roles.forEach((name, index) => {
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    out.push(`INSERT INTO iam.roles (role_id, created_at, ${userCols}, updated_at, updated_by_user_identity_id, updated_by_service_principal_id, row_version, ownership_class, tenant_id, role_code, name, is_baseline, lifecycle_state) VALUES (${q(deterministicUuid(`role:${code}:v1`))}, ${now}, ${nullActors}, ${now}, ${nullActors}, 1, 'PLATFORM_CONTROL', NULL, ${q(code)}, ${q(name)}, true, 'published') ON CONFLICT DO NOTHING;`);
  });
  for (const permission of permissions) {
    const permissionId = deterministicUuid(`permission:${permission.permissionCode}:v1`);
    out.push(`INSERT INTO iam.permissions (permission_id, created_at, ${userCols}, updated_at, updated_by_user_identity_id, updated_by_service_principal_id, row_version, permission_code, domain_code, resource_code, action_code, lifecycle_state) VALUES (${q(permissionId)}, ${now}, ${nullActors}, ${now}, ${nullActors}, 1, ${q(permission.permissionCode)}, ${q(permission.domain)}, ${q(permission.resource)}, ${q(permission.action)}, 'published') ON CONFLICT (permission_code) DO NOTHING;`);
    for (const role of permission.grantRoles) {
      const roleCode = role.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
      out.push(`INSERT INTO iam.role_permissions (role_permission_id, created_at, ${userCols}, ownership_class, tenant_id, role_id, permission_id) VALUES (${q(deterministicUuid(`grant:${roleCode}:${permission.permissionCode}:v1`))}, ${now}, ${nullActors}, 'PLATFORM_CONTROL', NULL, ${q(deterministicUuid(`role:${roleCode}:v1`))}, ${q(permissionId)}) ON CONFLICT DO NOTHING;`);
    }
  }
  for (const edge of lifecycle) {
    const stable = `transition:${edge.entity}:${edge.from}:${edge.command}:v1`;
    const transitionId = deterministicUuid(stable);
    out.push(`INSERT INTO ops_audit.lifecycle_transition_definitions (lifecycle_transition_definition_id, created_at, ${userCols}, entity_type, version_number, from_state, command_code, to_state, precondition_policy_ref, permission_id, sod_policy_ref, audit_event_code, notification_policy_ref, recalculation_policy_ref, idempotency_semantics, concurrency_semantics, system_actor_allowed, lifecycle_state, published_at) VALUES (${q(transitionId)}, ${now}, ${nullActors}, ${q(edge.entity)}, 1, ${q(edge.from)}, ${q(edge.command)}, ${q(edge.to)}, ${q(`contract:${stable}`)}, ${q(deterministicUuid(`permission:${edge.permission}:v1`))}, 'contract:default-deny-sod:v1', ${q(edge.audit)}, 'NONE_CONTRACTUALLY_REQUIRED', 'NONE_CONTRACTUALLY_REQUIRED', 'IDEMPOTENCY_KEY_REQUIRED', 'ROW_VERSION_COMPARE_AND_SWAP', false, 'published', ${now}) ON CONFLICT DO NOTHING;`);
    const permission = permissions.find((item) => item.permissionCode === edge.permission);
    for (const [ordinal, scope] of (permission?.scopes ?? []).entries()) {
      out.push(`INSERT INTO ops_audit.lifecycle_transition_scopes (lifecycle_transition_scope_id, created_at, ${userCols}, lifecycle_transition_definition_id, scope_kind) VALUES (${q(deterministicUuid(`${stable}:scope:${scope}`))}, ${now}, ${nullActors}, ${q(transitionId)}, ${q(scope)}) ON CONFLICT DO NOTHING;`);
    }
    if (edge.event !== "NONE_CONTRACTUALLY_REQUIRED")
      out.push(`INSERT INTO ops_audit.lifecycle_transition_side_effects (lifecycle_transition_side_effect_id, created_at, ${userCols}, lifecycle_transition_definition_id, event_code, ordinal, is_required) VALUES (${q(deterministicUuid(`${stable}:event:${edge.event}`))}, ${now}, ${nullActors}, ${q(transitionId)}, ${q(edge.event)}, 1, true) ON CONFLICT DO NOTHING;`);
  }
  const impactId = deterministicUuid("scale:impact:baseline:v1");
  const likelihoodId = deterministicUuid("scale:likelihood:baseline:v1");
  const formulaId = deterministicUuid("formula:risk:baseline:v1");
  out.push(`INSERT INTO risk.impact_scale_definitions (impact_scale_definition_id, created_at, ${userCols}, ownership_class, tenant_id, scale_code, version_number, name, minimum_value, maximum_value, lifecycle_state, effective_from, effective_to, published_at) VALUES (${q(impactId)}, ${now}, ${nullActors}, 'GLOBAL_REFERENCE', NULL, 'BASELINE_IMPACT_1_5', 1, 'Baseline impact 1..5', 1, 5, 'published', ${now}, NULL, ${now}) ON CONFLICT DO NOTHING;`);
  ["Insignificant", "Minor", "Material", "Severe", "Extreme"].forEach((label, index) => out.push(`INSERT INTO risk.impact_scale_levels (impact_scale_level_id, created_at, ${userCols}, ownership_class, tenant_id, impact_scale_definition_id, level_value, label, display_order) VALUES (${q(deterministicUuid(`scale:impact:baseline:v1:level:${index + 1}`))}, ${now}, ${nullActors}, 'GLOBAL_REFERENCE', NULL, ${q(impactId)}, ${index + 1}, ${q(label)}, ${index + 1}) ON CONFLICT DO NOTHING;`));
  out.push(`INSERT INTO risk.likelihood_scale_definitions (likelihood_scale_definition_id, created_at, ${userCols}, ownership_class, tenant_id, scale_code, version_number, name, minimum_value, maximum_value, horizon_months, lifecycle_state, effective_from, effective_to, published_at) VALUES (${q(likelihoodId)}, ${now}, ${nullActors}, 'GLOBAL_REFERENCE', NULL, 'BASELINE_LIKELIHOOD_1_5_12M', 1, 'Baseline likelihood 1..5 / 12 months', 1, 5, 12, 'published', ${now}, NULL, ${now}) ON CONFLICT DO NOTHING;`);
  const likelihood = [["Rare", null, 0.05], ["Unlikely", 0.05, 0.20], ["Possible", 0.20, 0.50], ["Likely", 0.50, 0.80], ["Almost certain", 0.80, null]];
  likelihood.forEach(([label, min, max], index) => out.push(`INSERT INTO risk.likelihood_scale_levels (likelihood_scale_level_id, created_at, ${userCols}, ownership_class, tenant_id, likelihood_scale_definition_id, level_value, label, probability_min, probability_max, frequency_min, frequency_max, frequency_period_months, criterion_text) VALUES (${q(deterministicUuid(`scale:likelihood:baseline:v1:level:${index + 1}`))}, ${now}, ${nullActors}, 'GLOBAL_REFERENCE', NULL, ${q(likelihoodId)}, ${index + 1}, ${q(label)}, ${min ?? "NULL"}, ${max ?? "NULL"}, NULL, NULL, 12, ${q(`${label}; rector 39 section 4`)}) ON CONFLICT DO NOTHING;`));
  out.push(`INSERT INTO data.formula_definitions (formula_definition_id, created_at, ${userCols}, ownership_class, tenant_id, formula_code, version_number, name, expression_language, expression, output_unit, lifecycle_state, effective_from, effective_to, published_at) VALUES (${q(formulaId)}, ${now}, ${nullActors}, 'GLOBAL_REFERENCE', NULL, 'BASELINE_RISK_INHERENT_RESIDUAL', 1, 'Baseline inherent and residual risk', 'TCDX_DETERMINISTIC_EXPRESSION_V1', 'inherent_score=likelihood*impact;residual_score=inherent_score*(1-control_effectiveness_aggregate);inherent_bands=1..4:LOW,5..9:MODERATE,10..16:HIGH,17..25:CRITICAL;residual_bands=0..<5:LOW,5..<10:MODERATE,10..<17:HIGH,17..25:CRITICAL', 'risk_score', 'published', ${now}, NULL, ${now}) ON CONFLICT DO NOTHING;`);
  out.push(`INSERT INTO risk.risk_methodologies (risk_methodology_id, created_at, ${userCols}, ownership_class, tenant_id, methodology_code, version_number, name, impact_scale_definition_id, likelihood_scale_definition_id, formula_definition_id, minimum_coverage, lifecycle_state, effective_from, effective_to, published_at) VALUES (${q(deterministicUuid("methodology:risk:baseline:v1"))}, ${now}, ${nullActors}, 'GLOBAL_REFERENCE', NULL, 'BASELINE_RISK', 1, 'Baseline Risk Methodology', ${q(impactId)}, ${q(likelihoodId)}, ${q(formulaId)}, 80.00, 'published', ${now}, NULL, ${now}) ON CONFLICT DO NOTHING;`);
  const packs = [["ISO_9001_2015", "standard", "global", "prepublication"], ["ISO_9001_2026", "standard", "global", "prepublication"], ["ISO_IEC_27001_2022", "standard", "global", "prepublication"], ["ISO_IEC_42001_2023", "standard", "global", "prepublication"], ["CL_LEY_21719", "law", "CL", "published"]];
  for (const [code, type, jurisdiction, state] of packs)
    out.push(`INSERT INTO regulatory.regulatory_packs (regulatory_pack_id, created_at, ${userCols}, updated_at, updated_by_user_identity_id, updated_by_service_principal_id, row_version, pack_code, name, source_type, jurisdiction_code, lifecycle_state) VALUES (${q(deterministicUuid(`regulatory_pack:${code}:v1`))}, ${now}, ${nullActors}, ${now}, ${nullActors}, 1, ${q(code)}, ${q(code.replaceAll("_", " "))}, ${q(type)}, ${q(jurisdiction)}, ${q(state)}) ON CONFLICT (pack_code) DO NOTHING;`);
  out.push("-- SEED-011 configuration defaults: intentionally empty.", "-- SEED-012 protected regulatory contents: intentionally empty.");
  return `${out.join("\n")}\n`;
}

function bootstrapSql() {
  const schemas = ["platform", "iam", "org", "regulatory", "controls", "evidence", "risk", "remediation", "audit", "operations", "third_party", "resilience", "privacy", "survey", "data", "rules", "integration", "config", "reporting", "knowledge", "ai", "notification", "ops_audit"];
  return `${schemas.map((schema) => `CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)};`).join("\n")}\n\nCREATE TABLE platform.schema_migrations (\n  migration_id char(14) NOT NULL,\n  filename text NOT NULL,\n  content_sha256 char(64) NOT NULL,\n  transactional boolean NOT NULL,\n  runner_version varchar(32) NOT NULL,\n  started_at timestamptz NOT NULL,\n  applied_at timestamptz NOT NULL,\n  duration_ms bigint NOT NULL,\n  outcome varchar(16) NOT NULL,\n  CONSTRAINT pk_schema_migrations PRIMARY KEY (migration_id),\n  CONSTRAINT uq_schema_migrations__filename UNIQUE (filename),\n  CONSTRAINT ck_schema_migrations__outcome CHECK (outcome = 'applied'),\n  CONSTRAINT ck_schema_migrations__duration CHECK (duration_ms >= 0)\n);\n`;
}

function expectedInventory(rows) {
  return {
    contract: "TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15",
    physicalModelCommit: "a822bb92d0d585edd84adc8a1c65ec280923cc8e",
    tableCount: rows.length,
    tables: rows.map((row) => ({
      name: row.name, profile: row.profile, primaryKey: [row.pk],
      columns: row.columns.map(([name, type, nullable, defaultValue]) => ({ name, type, nullable, default: defaultValue ?? null })),
      checks: tableChecks(row).map((item) => item.key),
      uniqueConstraints: uniqueDefinitions(row)
    }))
  };
}

function writeOrCheck(path, content) {
  if (checkOnly) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) throw new Error(`Generated artifact drift: ${path.slice(root.length + 1)}`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const rows = parsePhysicalModel();
const migrationDir = resolve(root, "database/migrations");
const migrations = [
  ["20260916000100_bootstrap_schemas_and_ledger.sql", bootstrapSql()],
  ["20260916000200_platform_iam_organization.sql", createTablesSql(rows, ["platform", "iam", "org"])],
  ["20260916000300_normative_control_evidence.sql", createTablesSql(rows, ["regulatory", "controls", "evidence"])],
  ["20260916000400_risk_operations_privacy.sql", createTablesSql(rows, ["risk", "remediation", "audit", "operations", "third_party", "resilience", "privacy", "survey"])],
  ["20260916000500_data_integration_reporting_ai.sql", createTablesSql(rows, ["data", "rules", "integration", "config", "reporting", "knowledge", "ai", "notification", "ops_audit"])],
  ["20260916000600_constraints_and_uniqueness.sql", constraintsSql(rows)],
  ["20260916000700_foreign_keys.sql", foreignKeysSql(rows)],
  ["20260916000800_required_indexes.sql", indexesSql(rows)],
  ["20260916000900_canonical_seeds.sql", seedsSql()]
];
const manifest = {
  manifestVersion: 1,
  runnerVersion: "1.0.0",
  databaseName: "tcdx-grc",
  postgresMajor: 16,
  advisoryLockSource: "tcdx-grc:platform.schema_migrations:v1",
  migrations: migrations.map(([filename, content]) => ({ id: filename.slice(0, 14), filename, sha256: sha256(content), transactional: true, preconditions: ["database_name=tcdx-grc", "postgres_major=16"], postconditions: ["ledger_outcome=applied"] }))
};

for (const [filename, content] of migrations) writeOrCheck(resolve(migrationDir, filename), content);
writeOrCheck(resolve(root, "database/migrations/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeOrCheck(resolve(root, "database/expected-schema.json"), `${JSON.stringify(expectedInventory(rows), null, 2)}\n`);
writeOrCheck(resolve(root, "database/seed-manifest.json"), `${JSON.stringify({ manifestVersion: 1, source: "docs/executable-contracts/09_SEED_MANIFESTS.md", entries: ["SEED-001", "SEED-002", "SEED-003", "SEED-004", "SEED-005", "SEED-006", "SEED-007", "SEED-008", "SEED-009", "SEED-011", "SEED-012"], permissionRows: 134, lifecycleEdges: 95, configurationDefaults: 0, protectedRegulatoryContents: 0, contentSha256: sha256(migrations.at(-1)[1]) }, null, 2)}\n`);

console.log(JSON.stringify({ mode: checkOnly ? "check" : "write", physicalTables: rows.length, permissions: 134, lifecycleEdges: 95, migrations: migrations.length }, null, 2));
