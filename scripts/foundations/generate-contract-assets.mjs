#!/usr/bin/env node

import "./permission-projection-catalog.mjs";
import { extendMethodologyInventory } from "./phase5-methodology-amendment.mjs";

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const checkOnly = process.argv.includes("--check");
const physicalPath = resolve(root, "docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md");
const permissionPath = resolve(root, "docs/executable-contracts/05_PERMISSION_CATALOG.md");
const seedPath = resolve(root, "docs/executable-contracts/09_SEED_MANIFESTS.md");
const generatedAt = "2026-09-16T00:00:00.000Z";
const preF5cGeneratedAt = "2026-09-21T00:00:00.000Z";
const phase5FinalRegentId = "TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23";

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
  if (rows.length !== 215) throw new Error(`Expected 215 physical tables, parsed ${rows.length}`);
  return rows;
}

function auditAmendmentRows() {
  const make = (name, entity, profile, ownColumns, integrity = "") => {
    const table = name.split(".")[1];
    const pk = `${singular(table)}_id`;
    const merged = new Map();
    for (const column of [...profileColumns(profile, pk), ...ownColumns]) merged.set(column[0], column);
    const columns = [merged.get(pk), ...[...merged.values()].filter((column) => column[0] !== pk)];
    return { name, schema: "audit", table, entity, profile, pk, columns, integrity, retention: "IR >=7y", fieldText: "approved PRE-F4 Audit amendment" };
  };
  const required = (name, type, defaultValue) => [name, type, false, defaultValue];
  const optional = (name, type) => [name, type, true];
  return [
    make("audit.audit_objectives", "AuditObjective", "TM", [
      required("audit_id", "uuid"), required("objective_code", "varchar(96)"), required("statement", "text"),
      required("ordinal", "integer"), required("lifecycle_state", "varchar(32)")
    ]),
    make("audit.audit_criteria", "AuditCriterion", "TM", [
      required("audit_id", "uuid"), required("criterion_kind", "varchar(32)"), required("framework_version_id", "uuid"),
      optional("requirement_id", "uuid"), required("rationale", "text"), required("ordinal", "integer"),
      required("lifecycle_state", "varchar(32)")
    ]),
    make("audit.audit_scopes", "AuditScope", "TM", [
      required("audit_id", "uuid"), required("framework_version_id", "uuid"), required("subject_id", "uuid"),
      required("scope_code", "varchar(96)"), required("lifecycle_state", "varchar(32)")
    ]),
    make("audit.audit_team_assignments", "AuditTeamAssignment", "TM", [
      required("audit_id", "uuid"), required("membership_id", "uuid"), required("team_role", "varchar(32)"),
      required("assigned_from", "timestamptz"), optional("assigned_to", "timestamptz"),
      required("lifecycle_state", "varchar(32)")
    ]),
    make("audit.audit_competencies", "AuditCompetency", "I", [
      required("competency_code", "varchar(128)"), required("version_number", "bigint"), required("name", "text"),
      required("description", "text"), required("lifecycle_state", "varchar(32)"), required("effective_from", "timestamptz"),
      optional("effective_to", "timestamptz"), optional("published_at", "timestamptz")
    ]),
    make("audit.auditor_competency_assertions", "AuditorCompetencyAssertion", "TI", [
      required("membership_id", "uuid"), required("audit_competency_id", "uuid"), optional("evidence_version_id", "uuid"),
      required("valid_from", "timestamptz"), optional("valid_to", "timestamptz"), required("assertion_status", "varchar(32)"),
      required("verified_by_membership_id", "uuid"), required("verified_at", "timestamptz"), optional("superseded_by_id", "uuid")
    ]),
    make("audit.audit_competency_requirements", "AuditCompetencyRequirement", "TI", [
      required("audit_id", "uuid"), required("framework_version_id", "uuid"), required("audit_competency_id", "uuid"),
      required("team_role", "varchar(32)"), required("rationale", "text")
    ]),
    make("audit.audit_competency_validations", "AuditCompetencyValidation", "TI", [
      required("audit_competency_requirement_id", "uuid"), required("audit_team_assignment_id", "uuid"),
      optional("auditor_competency_assertion_id", "uuid"), required("validation_outcome", "varchar(32)"),
      required("validated_by_membership_id", "uuid"), required("validated_at", "timestamptz"), optional("rationale", "text")
    ]),
    make("audit.audit_agenda_items", "AuditAgendaItem", "TM", [
      required("audit_id", "uuid"), required("agenda_code", "varchar(96)"), required("title", "text"),
      required("starts_at", "timestamptz"), required("ends_at", "timestamptz"), required("ordinal", "integer"),
      required("lifecycle_state", "varchar(32)")
    ]),
    make("audit.audit_agenda_item_tests", "AuditAgendaItemTest", "TI", [
      required("audit_agenda_item_id", "uuid"), required("audit_test_id", "uuid")
    ]),
    make("audit.audit_agenda_item_scopes", "AuditAgendaItemScope", "TI", [
      required("audit_agenda_item_id", "uuid"), required("audit_scope_id", "uuid")
    ]),
    make("audit.audit_agenda_item_team_assignments", "AuditAgendaItemTeamAssignment", "TI", [
      required("audit_agenda_item_id", "uuid"), required("audit_team_assignment_id", "uuid")
    ]),
    make("audit.audit_test_requirement_links", "AuditTestRequirementLink", "TI", [
      required("audit_test_id", "uuid"), required("requirement_id", "uuid"), required("is_anchor", "boolean", "false"),
      optional("requirement_crosswalk_mapping_id", "uuid"), required("link_rationale", "text")
    ]),
    make("audit.audit_test_control_links", "AuditTestControlLink", "TI", [
      required("audit_test_id", "uuid"), optional("control_id", "uuid"), optional("control_assessment_id", "uuid"),
      required("link_role", "varchar(32)")
    ]),
    make("audit.audit_test_requirement_assessment_links", "AuditTestRequirementAssessmentLink", "TI", [
      required("audit_test_id", "uuid"), required("audit_test_requirement_link_id", "uuid"),
      required("requirement_assessment_id", "uuid"), required("lineage_role", "varchar(32)")
    ])
  ];
}

function preF5eAmendmentRows() {
  const pk = "platform_role_assignment_id";
  return [{
    name: "iam.platform_role_assignments",
    schema: "iam",
    table: "platform_role_assignments",
    entity: "PlatformRoleAssignment",
    profile: "I",
    pk,
    columns: [
      ...profileColumns("I", pk),
      ["ownership_class", "varchar(24)", false, "PLATFORM_CONTROL"],
      ["user_identity_id", "uuid", false],
      ["role_id", "uuid", false],
      ["valid_from", "timestamptz", false],
      ["valid_to", "timestamptz", true]
    ],
    integrity: "FK UserIdentity; composite FK Role+ownership; CHECK PLATFORM_CONTROL; one open active user+role enforced by partial unique index",
    retention: "validity; audit; AO/POL",
    fieldText: "approved PRE-F5E Platform authority amendment candidate"
  }];
}

function phase5FinalAmendmentRows() {
  const pk = "file_upload_intent_id";
  return [{
    name: "evidence.file_upload_intents",
    schema: "evidence",
    table: "file_upload_intents",
    entity: "FileUploadIntent",
    profile: "TM",
    pk,
    columns: [
      ...profileColumns("TM", pk),
      ["purpose", "varchar(32)", false],
      ["original_filename", "text", false],
      ["declared_mime", "varchar(255)", false],
      ["expected_size_bytes", "bigint", false],
      ["classification", "varchar(32)", false],
      ["retention_policy_id", "uuid", false],
      ["source_provenance", "text", false],
      ["effective_from", "timestamptz", true],
      ["effective_to", "timestamptz", true],
      ["quarantine_object_key", "text", false],
      ["lifecycle_state", "varchar(32)", false],
      ["expires_at", "timestamptz", false],
      ["uploaded_at", "timestamptz", true],
      ["scan_started_at", "timestamptz", true],
      ["scan_completed_at", "timestamptz", true],
      ["promoted_at", "timestamptz", true],
      ["rejected_at", "timestamptz", true],
      ["expired_at", "timestamptz", true],
      ["cancelled_at", "timestamptz", true],
      ["file_object_id", "uuid", true]
    ],
    integrity: "UQ `quarantine_object_key`; UQ `file_object_id`; same-tenant final FileObject; closed lifecycle; expiry; no blob/secret",
    retention: "ephemeral cleanup after terminal state per retention policy; audit",
    fieldText: "approved Phase 5 final closure amendment v1.7"
  }];
}

function phase5SubscriptionRegulatoryPackAmendmentRows() {
  const pk = "subscription_regulatory_pack_id";
  return [{
    name: "platform.subscription_regulatory_packs",
    schema: "platform",
    table: "subscription_regulatory_packs",
    entity: "SubscriptionRegulatoryPack",
    profile: "TM",
    pk,
    columns: [
      ...profileColumns("TM", pk),
      ["subscription_id", "uuid", false],
      ["regulatory_pack_version_id", "uuid", false],
      ["lifecycle_state", "varchar(32)", false],
      ["effective_from", "timestamptz", false],
      ["effective_to", "timestamptz", true]
    ],
    integrity: "composite tenant Subscription FK; global pack-version FK; UQ temporal business key; exclusion against overlapping intervals; active may have planned expiry and revoked is closed",
    retention: "effective interval; material audit; immutable closed history",
    fieldText: "approved 2026-09-29 Phase 5 Subscription RegulatoryPackVersion amendment"
  }];
}

function phase5PlusValidationRows() {
  return [
    {
      name: "regulatory.regulatory_pack_validation_provenances", schema: "regulatory",
      table: "regulatory_pack_validation_provenances", entity: "RegulatoryPackValidationProvenance",
      profile: "PLATFORM_CONTROL", pk: "regulatory_pack_validation_provenance_id",
      columns: [
        ["regulatory_pack_validation_provenance_id", "uuid", false],
        ["regulatory_pack_version_id", "uuid", false], ["regulatory_import_manifest_id", "uuid", false],
        ["regulatory_source_id", "uuid", false], ["authority_class", "varchar(48)", false, "NON_AUTHORITATIVE_TEST_PACK"],
        ["source_role", "varchar(48)", false], ["provenance_ref", "text", false],
        ["source_checksum", "char(64)", false], ["created_at", "timestamptz", false, "transaction_timestamp()"],
        ["created_by_user_identity_id", "uuid", false]
      ],
      integrity: "UQ `regulatory_pack_version_id`; exact manifest/source provenance; immutable approval",
      retention: "permanent provenance", fieldText: "Phase 5+ human decision 2026-09-29"
    },
    {
      name: "platform.regulatory_pack_validation_accesses", schema: "platform",
      table: "regulatory_pack_validation_accesses", entity: "RegulatoryPackValidationAccess",
      profile: "PLATFORM_CONTROL", pk: "regulatory_pack_validation_access_id",
      columns: [
        ["regulatory_pack_validation_access_id", "uuid", false],
        ["ownership_class", "varchar(24)", false, "PLATFORM_CONTROL"], ["tenant_id", "uuid", false],
        ["regulatory_pack_version_id", "uuid", false], ["regulatory_pack_validation_provenance_id", "uuid", false],
        ["lifecycle_state", "varchar(32)", false, "active"], ["effective_from", "timestamptz", false],
        ["effective_to", "timestamptz", true], ["row_version", "bigint", false, "1"],
        ["created_at", "timestamptz", false, "transaction_timestamp()"],
        ["created_by_user_identity_id", "uuid", false],
        ["updated_at", "timestamptz", false, "transaction_timestamp()"],
        ["updated_by_user_identity_id", "uuid", false]
      ],
      integrity: "UQ `(tenant_id,regulatory_pack_validation_access_id)`; exclusion of overlapping tenant/pack intervals",
      retention: "closed historical access retained", fieldText: "Phase 5+ human decision 2026-09-29"
    }
  ];
}

function phase5RetentionPolicyAmendment(row) {
  if (row.name !== "privacy.retention_policies") return row;
  const columns = row.columns.map((column) => {
    if (column[0] === "effective_from" || column[0] === "effective_to") return [column[0], column[1], true, column[3]];
    return column;
  });
  columns.splice(columns.findIndex((column) => column[0] === "tenant_id"), 0, ["row_version", "bigint", false, "1"]);
  return {
    ...row,
    columns,
    integrity: `${row.integrity}; closed policy_kind/precedence/trigger/lifecycle vocabularies; publication timestamp coherence`,
    fieldText: "approved Phase 5 RetentionPolicy forward-only lifecycle amendment"
  };
}

function phase5RegulatoryCatalogAmendment(row) {
  if (row.name === "regulatory.requirements") {
    return { ...row, columns: [...row.columns, ["editorial_summary", "text", true]],
      fieldText: `${row.fieldText}; approved editorial representation amendment` };
  }
  if (["regulatory.normative_unit_crosswalk_mappings", "regulatory.requirement_crosswalk_mappings", "regulatory.control_crosswalk_mappings"].includes(row.name)) {
    return { ...row, columns: [...row.columns,
      ["direction", "varchar(32)", false], ["provenance_ref", "text", false],
      ["effective_from", "timestamptz", false], ["effective_to", "timestamptz", true],
      ["mapping_version_number", "bigint", false]],
      fieldText: `${row.fieldText}; approved per-mapping direction, provenance, effective interval and semantic version amendment` };
  }
  return row;
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
    add("created_actor_one", `num_nonnulls(created_by_user_identity_id, created_by_service_principal_id) ${row.name === "platform.subscription_regulatory_packs" ? "=" : "<="} 1`);
  if (names.has("updated_by_user_identity_id") && names.has("updated_by_service_principal_id"))
    add("updated_actor_one", "num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1");
  if (names.has("actor_user_identity_id") && names.has("actor_service_principal_id"))
    add("actor_one", "num_nonnulls(actor_user_identity_id, actor_service_principal_id) <= 1");
  if (row.name === "ops_audit.idempotency_records")
    add("actor_required", "num_nonnulls(actor_user_identity_id, actor_service_principal_id) = 1");
  if (row.name === "iam.platform_role_assignments") {
    add("ownership_class", "ownership_class = 'PLATFORM_CONTROL'");
  } else if (names.has("ownership_class")) {
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
  if (row.name === "platform.tenants") add("data_classification", "data_classification IN ('public','internal','confidential','restricted')");
  if (row.name === "platform.subscription_regulatory_packs") {
    add("lifecycle", "lifecycle_state IN ('active','revoked')");
    add("interval_state", "lifecycle_state = 'active' OR (lifecycle_state = 'revoked' AND effective_to IS NOT NULL)");
  }
  if (row.name === "evidence.file_upload_intents") {
    add("purpose", "purpose = 'evidence_document'");
    add("size_nonnegative", "expected_size_bytes >= 0");
    add("classification", "classification IN ('public','internal','confidential','restricted')");
    add("lifecycle", "lifecycle_state IN ('pending_upload','quarantined','scanning','promoted','rejected','expired','cancelled')");
    add("expiry", "expires_at > created_at");
    add("terminal_state", "state/timestamp/FileObject coherence");
  }
  if (row.name === "iam.tenant_membership_invitations") {
    add("email_normalized", "invitee_email = lower(btrim(invitee_email)) AND invitee_email LIKE '%@%'");
    add("authentication_method", "authentication_method = 'ZOHO'");
    add("token_digest", "token_digest ~ '^[0-9a-f]{64}$'");
    add("lifecycle", "lifecycle_state IN ('pending','accepted','expired','revoked')");
    add("expiry", "expires_at > created_at");
    add("accepted_coherence", "accepted terminal fields are all present only for lifecycle_state = 'accepted' and otherwise all NULL");
    add("revoked_coherence", "revocation fields are present only for lifecycle_state = 'revoked' and otherwise all NULL");
  }
  if (row.name === "privacy.retention_policies") {
    add("policy_kind", "policy_kind IN ('legal_hold','mandatory_regulatory_policy','contractual_policy','tenant_policy','product_baseline')");
    add("precedence_rank", "(policy_kind = 'legal_hold' AND precedence_rank = 500) OR (policy_kind = 'mandatory_regulatory_policy' AND precedence_rank = 400) OR (policy_kind = 'contractual_policy' AND precedence_rank = 300) OR (policy_kind = 'tenant_policy' AND precedence_rank = 200) OR (policy_kind = 'product_baseline' AND precedence_rank = 100)");
    add("trigger_event", "trigger_event_code = 'expiry_or_closure'");
    add("lifecycle", "lifecycle_state IN ('draft','under_review','approved','published')");
    add("publication_effective_from", "(lifecycle_state = 'published' AND effective_from IS NOT NULL) OR (lifecycle_state IN ('draft','under_review','approved') AND effective_from IS NULL)");
  }
  const auditChecks = {
    "audit.audit_objectives": [
      ["ordinal_nonnegative", "ordinal >= 0"], ["statement_nonempty", "btrim(statement) <> ''"]
    ],
    "audit.audit_criteria": [
      ["criterion_target", "(criterion_kind = 'framework_version' AND requirement_id IS NULL) OR (criterion_kind = 'requirement' AND requirement_id IS NOT NULL)"],
      ["ordinal_nonnegative", "ordinal >= 0"], ["rationale_nonempty", "btrim(rationale) <> ''"]
    ],
    "audit.audit_scopes": [["scope_code_nonempty", "btrim(scope_code) <> ''"]],
    "audit.audit_team_assignments": [
      ["team_role", "team_role IN ('lead_auditor','auditor','technical_expert')"],
      ["assigned_interval", "assigned_to IS NULL OR assigned_to > assigned_from"]
    ],
    "audit.audit_competencies": [
      ["version_positive", "version_number > 0"], ["competency_code_nonempty", "btrim(competency_code) <> ''"]
    ],
    "audit.auditor_competency_assertions": [
      ["assertion_status", "assertion_status IN ('verified','expired','revoked','superseded')"],
      ["independent_verifier", "verified_by_membership_id <> membership_id"]
    ],
    "audit.audit_competency_requirements": [
      ["team_role", "team_role IN ('lead_auditor','auditor','technical_expert')"],
      ["rationale_nonempty", "btrim(rationale) <> ''"]
    ],
    "audit.audit_competency_validations": [
      ["validation_outcome", "validation_outcome IN ('covered','not_covered','expired','evidence_missing')"],
      ["covered_assertion", "(validation_outcome = 'covered') = (auditor_competency_assertion_id IS NOT NULL)"]
    ],
    "audit.audit_agenda_items": [
      ["ordinal_nonnegative", "ordinal >= 0"], ["title_nonempty", "btrim(title) <> ''"]
    ],
    "audit.audit_test_requirement_links": [
      ["anchor_crosswalk", "NOT is_anchor OR requirement_crosswalk_mapping_id IS NULL"],
      ["link_rationale_nonempty", "btrim(link_rationale) <> ''"]
    ],
    "audit.audit_test_control_links": [["typed_target", "num_nonnulls(control_id, control_assessment_id) = 1"]]
  };
  for (const [key, expression] of auditChecks[row.name] ?? []) add(key, expression);
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
  if (row.name === "org.subjects") return [["tenant_id", "subject_id"]];
  const exact = {
    "regulatory.regulatory_pack_validation_provenances": [["regulatory_pack_version_id"], ["regulatory_pack_version_id", "regulatory_pack_validation_provenance_id"]],
    "platform.subscription_regulatory_packs": [["subscription_id", "regulatory_pack_version_id", "effective_from"]],
    "platform.plan_versions": [["plan_id", "version_number"]],
    "regulatory.regulatory_pack_versions": [["regulatory_pack_id", "version_number"]],
    "regulatory.normative_units": [["framework_version_id", "source_locator"]],
    "regulatory.requirement_control_mappings": [["requirement_id", "control_version_id", "mapping_type", "mapping_version"]],
    "regulatory.normative_unit_control_mappings": [["normative_unit_id", "control_version_id", "mapping_version"]],
    "platform.entitlements": [["plan_version_id", "capability_id"]],
    "iam.role_permissions": [["ownership_class", "tenant_id", "role_id", "permission_id"]],
    "iam.roles": [["role_id", "ownership_class"]],
    "risk.impact_scale_levels": [["impact_scale_definition_id", "level_value"]],
    "risk.likelihood_scale_levels": [["likelihood_scale_definition_id", "level_value"]],
    "ops_audit.lifecycle_transition_definitions": [["entity_type", "from_state", "command_code", "version_number"]],
    "ops_audit.lifecycle_transition_scopes": [["lifecycle_transition_definition_id", "scope_kind"]],
    "ops_audit.lifecycle_transition_side_effects": [["lifecycle_transition_definition_id", "event_code"], ["lifecycle_transition_definition_id", "ordinal"]],
    "regulatory.requirement_applicabilities": [["tenant_id", "requirement_id", "scope_subject_id", "applicability_version"]],
    "regulatory.statements_of_applicability": [["tenant_id", "framework_version_id", "soa_version"]],
    "regulatory.statement_of_applicability_items": [["tenant_id", "statement_of_applicability_id", "reference_control_version_id"]],
    "evidence.evidence_versions": [["tenant_id", "evidence_id", "version_number"]],
    "evidence.file_upload_intents": [["quarantine_object_key"], ["file_object_id"]],
    "audit.audit_objectives": [["audit_id", "objective_code"], ["audit_id", "ordinal"]],
    "audit.audit_criteria": [["audit_id", "ordinal"]],
    "audit.audit_scopes": [["audit_id", "framework_version_id", "subject_id"], ["audit_id", "scope_code"]],
    "audit.audit_team_assignments": [["audit_id", "membership_id", "team_role", "assigned_from"]],
    "audit.audit_competencies": [["competency_code", "version_number"]],
    "audit.auditor_competency_assertions": [["membership_id", "audit_competency_id", "valid_from"]],
    "audit.audit_competency_requirements": [["audit_id", "framework_version_id", "audit_competency_id", "team_role"]],
    "audit.audit_competency_validations": [["audit_competency_requirement_id", "audit_team_assignment_id", "validated_at"]],
    "audit.audit_agenda_items": [["audit_id", "agenda_code"], ["audit_id", "ordinal"]],
    "audit.audit_agenda_item_tests": [["audit_agenda_item_id", "audit_test_id"]],
    "audit.audit_agenda_item_scopes": [["audit_agenda_item_id", "audit_scope_id"]],
    "audit.audit_agenda_item_team_assignments": [["audit_agenda_item_id", "audit_team_assignment_id"]],
    "audit.audit_test_requirement_links": [["audit_test_id", "requirement_id"]],
    "audit.audit_test_requirement_assessment_links": [["audit_test_id", "requirement_assessment_id", "lineage_role"]]
  };
  if (row.name === "ops_audit.audit_events") {
    for (let index = uniques.length - 1; index >= 0; index--) {
      if (uniques[index].length === 1 && uniques[index][0] === "event_code") uniques.splice(index, 1);
    }
  }
  if (row.name === "regulatory.normative_units") {
    for (let index = uniques.length - 1; index >= 0; index--) {
      if (uniques[index].length === 1 && uniques[index][0] === "source_locator") uniques.splice(index, 1);
    }
  }
  if (row.name === "regulatory.requirement_control_mappings" || row.name === "regulatory.normative_unit_control_mappings") {
    for (let index = uniques.length - 1; index >= 0; index--) {
      const columns = uniques[index];
      if ((columns.length === 1 && columns[0] === "mapping_version")
        || columns.join("|") === "ownership_class|tenant_id|mapping_version") uniques.splice(index, 1);
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

function auditAmendmentForeignKeys(rows, allRows) {
  const byPk = new Map(allRows.map((row) => [row.pk, row]));
  const aliases = new Map([
    ["membership_id", "tenant_membership_id"],
    ["verified_by_membership_id", "tenant_membership_id"],
    ["validated_by_membership_id", "tenant_membership_id"]
  ]);
  const pkNames = [...byPk.keys()].sort((a, b) => b.length - a.length);
  const out = ["-- Typed and tenant-safe foreign keys for the approved Audit amendment.", ""];
  for (const row of rows) {
    const names = new Set(row.columns.map((column) => column[0]));
    for (const [column, type] of row.columns) {
      if (type !== "uuid" || column === row.pk) continue;
      let target;
      if (column === "tenant_id") target = allRows.find((item) => item.name === "platform.tenants");
      else if (column === "superseded_by_id") target = row;
      else {
        const aliasPk = aliases.get(column);
        const match = aliasPk ?? pkNames.find((pk) => column === pk || column.endsWith(`_${pk}`));
        if (match) target = byPk.get(match);
      }
      if (!target) throw new Error(`No FK target for approved Audit column ${row.name}.${column}`);
      const composite = column !== "tenant_id" && names.has("tenant_id") && ["TM", "TI", "TV"].includes(target.profile);
      const cols = composite ? ["tenant_id", column] : [column];
      const refs = composite ? ["tenant_id", target.pk] : [target.pk];
      const key = compactIdent(`fk_${row.table}__${column}`);
      out.push(`ALTER TABLE ${fq(row.name)} ADD CONSTRAINT ${quoteIdent(key)} FOREIGN KEY (${cols.map(quoteIdent).join(", ")}) REFERENCES ${fq(target.name)} (${refs.map(quoteIdent).join(", ")}) ON UPDATE NO ACTION ON DELETE RESTRICT;`);
    }
  }
  return `${out.join("\n")}\n`;
}

function auditAmendmentIndexes(rows) {
  const out = ["-- Integrity and authority-path indexes for the approved Audit amendment.", ""];
  for (const row of rows) {
    for (const [column, type] of row.columns) {
      if (type !== "uuid" || column === row.pk) continue;
      out.push(`CREATE INDEX ${quoteIdent(compactIdent(`ix_${row.table}__${column}`))} ON ${fq(row.name)} (${quoteIdent(column)});`);
    }
  }
  out.push(
    `CREATE INDEX "ix_audit_criteria__audit_framework_requirement" ON "audit"."audit_criteria" ("audit_id", "framework_version_id", "requirement_id");`,
    `CREATE INDEX "ix_audit_scopes__audit_framework_subject" ON "audit"."audit_scopes" ("audit_id", "framework_version_id", "subject_id");`,
    `CREATE INDEX "ix_audit_team_assignments__audit_state_role" ON "audit"."audit_team_assignments" ("audit_id", "lifecycle_state", "team_role");`,
    `CREATE INDEX "ix_auditor_competency_assertions__validity" ON "audit"."auditor_competency_assertions" ("tenant_id", "membership_id", "audit_competency_id", "valid_from", "valid_to");`,
    `CREATE INDEX "ix_audit_agenda_items__range" ON "audit"."audit_agenda_items" ("audit_id", "starts_at", "ends_at");`,
    `CREATE UNIQUE INDEX "uq_audit_criteria__framework_row" ON "audit"."audit_criteria" ("audit_id", "framework_version_id") WHERE "criterion_kind" = 'framework_version';`,
    `CREATE UNIQUE INDEX "uq_audit_criteria__requirement_row" ON "audit"."audit_criteria" ("audit_id", "requirement_id") WHERE "criterion_kind" = 'requirement';`,
    `CREATE UNIQUE INDEX "uq_audit_team_assignments__active_lead" ON "audit"."audit_team_assignments" ("audit_id") WHERE "team_role" = 'lead_auditor' AND "assigned_to" IS NULL AND "lifecycle_state" = 'active';`,
    `CREATE UNIQUE INDEX "uq_audit_test_requirement_links__anchor" ON "audit"."audit_test_requirement_links" ("audit_test_id") WHERE "is_anchor";`,
    `CREATE UNIQUE INDEX "uq_audit_test_control_links__control" ON "audit"."audit_test_control_links" ("audit_test_id", "control_id", "link_role") WHERE "control_id" IS NOT NULL;`,
    `CREATE UNIQUE INDEX "uq_audit_test_control_links__assessment" ON "audit"."audit_test_control_links" ("audit_test_id", "control_assessment_id", "link_role") WHERE "control_assessment_id" IS NOT NULL;`
  );
  return `${out.join("\n")}\n`;
}

function auditAmendmentTriggersSql() {
  return `-- Cross-row and cross-authority invariants for the approved integrated Audit model.
CREATE FUNCTION "audit"."enforce_plan_mutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_audit_id uuid; parent_state varchar(32);
BEGIN
  parent_audit_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.audit_id ELSE NEW.audit_id END;
  SELECT lifecycle_state INTO parent_state FROM audit.audits WHERE audit_id = parent_audit_id FOR KEY SHARE;
  IF parent_state NOT IN ('draft','planned') THEN
    RAISE EXCEPTION 'AUDIT_PLAN_IMMUTABLE_AFTER_APPROVAL';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE FUNCTION "audit"."validate_criterion"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE requirement_framework uuid; framework_count integer;
BEGIN
  IF NEW.requirement_id IS NOT NULL THEN
    SELECT framework_version_id INTO requirement_framework FROM regulatory.requirements WHERE requirement_id = NEW.requirement_id;
    IF requirement_framework IS DISTINCT FROM NEW.framework_version_id THEN
      RAISE EXCEPTION 'AUDIT_REQUIREMENT_FRAMEWORK_MISMATCH';
    END IF;
  END IF;
  SELECT count(DISTINCT framework_version_id) INTO framework_count
    FROM audit.audit_criteria
   WHERE audit_id = NEW.audit_id AND audit_criterion_id <> NEW.audit_criterion_id;
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE audit_id = NEW.audit_id AND audit_criterion_id <> NEW.audit_criterion_id AND framework_version_id = NEW.framework_version_id)
     AND framework_count >= 3 THEN
    RAISE EXCEPTION 'AUDIT_FRAMEWORK_VERSION_LIMIT_EXCEEDED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_scope"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE audit_id = NEW.audit_id AND framework_version_id = NEW.framework_version_id) THEN
    RAISE EXCEPTION 'AUDIT_SCOPE_FRAMEWORK_NOT_SELECTED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_team_assignment"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE member_state varchar(32); joined timestamptz; ended timestamptz;
BEGIN
  SELECT membership_state, joined_at, ended_at INTO member_state, joined, ended
    FROM iam.tenant_memberships
   WHERE tenant_id = NEW.tenant_id AND tenant_membership_id = NEW.membership_id FOR KEY SHARE;
  IF member_state IS DISTINCT FROM 'active' OR NEW.assigned_from < joined OR (ended IS NOT NULL AND (NEW.assigned_to IS NULL OR NEW.assigned_to > ended)) THEN
    RAISE EXCEPTION 'AUDIT_TEAM_MEMBERSHIP_NOT_ACTIVE_FOR_INTERVAL';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_competency_requirement"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE audit_id = NEW.audit_id AND framework_version_id = NEW.framework_version_id) THEN
    RAISE EXCEPTION 'AUDIT_COMPETENCY_FRAMEWORK_NOT_SELECTED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_competency_validation"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE req audit.audit_competency_requirements%ROWTYPE; assignment audit.audit_team_assignments%ROWTYPE;
        assertion audit.auditor_competency_assertions%ROWTYPE; audit_row audit.audits%ROWTYPE;
BEGIN
  SELECT * INTO req FROM audit.audit_competency_requirements WHERE tenant_id = NEW.tenant_id AND audit_competency_requirement_id = NEW.audit_competency_requirement_id FOR KEY SHARE;
  SELECT * INTO assignment FROM audit.audit_team_assignments WHERE tenant_id = NEW.tenant_id AND audit_team_assignment_id = NEW.audit_team_assignment_id FOR KEY SHARE;
  IF req.audit_id IS DISTINCT FROM assignment.audit_id OR req.team_role IS DISTINCT FROM assignment.team_role THEN
    RAISE EXCEPTION 'AUDIT_COMPETENCY_ASSIGNMENT_MISMATCH';
  END IF;
  IF NEW.auditor_competency_assertion_id IS NOT NULL THEN
    SELECT * INTO assertion FROM audit.auditor_competency_assertions WHERE tenant_id = NEW.tenant_id AND auditor_competency_assertion_id = NEW.auditor_competency_assertion_id FOR KEY SHARE;
    SELECT * INTO audit_row FROM audit.audits WHERE tenant_id = NEW.tenant_id AND audit_id = req.audit_id FOR KEY SHARE;
    IF assertion.membership_id IS DISTINCT FROM assignment.membership_id
       OR assertion.audit_competency_id IS DISTINCT FROM req.audit_competency_id
       OR assertion.assertion_status IS DISTINCT FROM 'verified'
       OR assertion.valid_from > NEW.validated_at
       OR (assertion.valid_to IS NOT NULL AND assertion.valid_to < NEW.validated_at)
       OR (audit_row.planned_start IS NOT NULL AND assertion.valid_from::date > audit_row.planned_start)
       OR (audit_row.planned_end IS NOT NULL AND assertion.valid_to IS NOT NULL AND assertion.valid_to::date < audit_row.planned_end) THEN
      RAISE EXCEPTION 'AUDIT_COMPETENCY_ASSERTION_NOT_EFFECTIVE';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_agenda_test_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE agenda_audit uuid; test_audit uuid;
BEGIN
  SELECT audit_id INTO agenda_audit FROM audit.audit_agenda_items WHERE tenant_id = NEW.tenant_id AND audit_agenda_item_id = NEW.audit_agenda_item_id;
  SELECT w.audit_id INTO test_audit FROM audit.audit_tests t JOIN audit.audit_workpapers w ON w.tenant_id = t.tenant_id AND w.audit_workpaper_id = t.audit_workpaper_id
   WHERE t.tenant_id = NEW.tenant_id AND t.audit_test_id = NEW.audit_test_id;
  IF agenda_audit IS DISTINCT FROM test_audit THEN RAISE EXCEPTION 'AUDIT_AGENDA_TEST_DIFFERENT_AUDIT'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_agenda_scope_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM audit.audit_agenda_items i JOIN audit.audit_scopes s ON s.tenant_id = i.tenant_id AND s.audit_id = i.audit_id
     WHERE i.tenant_id = NEW.tenant_id AND i.audit_agenda_item_id = NEW.audit_agenda_item_id AND s.audit_scope_id = NEW.audit_scope_id
  ) THEN RAISE EXCEPTION 'AUDIT_AGENDA_SCOPE_DIFFERENT_AUDIT'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_agenda_team_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM audit.audit_agenda_items i JOIN audit.audit_team_assignments a ON a.tenant_id = i.tenant_id AND a.audit_id = i.audit_id
     WHERE i.tenant_id = NEW.tenant_id AND i.audit_agenda_item_id = NEW.audit_agenda_item_id
       AND a.audit_team_assignment_id = NEW.audit_team_assignment_id AND a.assigned_from <= i.starts_at
       AND (a.assigned_to IS NULL OR a.assigned_to >= i.ends_at)
  ) THEN RAISE EXCEPTION 'AUDIT_AGENDA_TEAM_NOT_EFFECTIVE'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_test_requirement_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE test_audit uuid; target_framework uuid; anchor_requirement uuid; anchor_framework uuid;
BEGIN
  SELECT w.audit_id INTO test_audit FROM audit.audit_tests t JOIN audit.audit_workpapers w ON w.tenant_id = t.tenant_id AND w.audit_workpaper_id = t.audit_workpaper_id
   WHERE t.tenant_id = NEW.tenant_id AND t.audit_test_id = NEW.audit_test_id;
  SELECT framework_version_id INTO target_framework FROM regulatory.requirements WHERE requirement_id = NEW.requirement_id;
  IF NOT EXISTS (SELECT 1 FROM audit.audit_criteria WHERE tenant_id = NEW.tenant_id AND audit_id = test_audit AND requirement_id = NEW.requirement_id) THEN
    RAISE EXCEPTION 'AUDIT_TEST_REQUIREMENT_NOT_SELECTED_CRITERION';
  END IF;
  IF NEW.is_anchor THEN RETURN NEW; END IF;
  SELECT l.requirement_id, r.framework_version_id INTO anchor_requirement, anchor_framework
    FROM audit.audit_test_requirement_links l JOIN regulatory.requirements r ON r.requirement_id = l.requirement_id
   WHERE l.tenant_id = NEW.tenant_id AND l.audit_test_id = NEW.audit_test_id AND l.is_anchor;
  IF anchor_requirement IS NULL THEN RAISE EXCEPTION 'AUDIT_TEST_ANCHOR_REQUIRED_FIRST'; END IF;
  IF anchor_framework = target_framework THEN
    IF NEW.requirement_crosswalk_mapping_id IS NOT NULL THEN RAISE EXCEPTION 'AUDIT_TEST_SAME_FRAMEWORK_CROSSWALK_FORBIDDEN'; END IF;
  ELSIF NEW.requirement_crosswalk_mapping_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM regulatory.requirement_crosswalk_mappings m
    JOIN regulatory.framework_crosswalks x ON x.framework_crosswalk_id = m.framework_crosswalk_id
    WHERE m.requirement_crosswalk_mapping_id = NEW.requirement_crosswalk_mapping_id
      AND m.mapping_status = 'approved'
      AND m.relationship_type IN ('equivalent','partially_equivalent','overlaps','supports')
      AND ((m.source_requirement_id = anchor_requirement AND m.target_requirement_id = NEW.requirement_id)
        OR (m.target_requirement_id = anchor_requirement AND m.source_requirement_id = NEW.requirement_id))
      AND x.lifecycle_state IN ('approved','published')
      AND (x.effective_from IS NULL OR x.effective_from <= CURRENT_TIMESTAMP)
      AND (x.effective_to IS NULL OR x.effective_to > CURRENT_TIMESTAMP)
  ) THEN
    RAISE EXCEPTION 'AUDIT_TEST_APPROVED_EFFECTIVE_CROSSWALK_REQUIRED';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_test_control_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target_tenant uuid; target_origin varchar(32);
BEGIN
  IF NEW.control_id IS NOT NULL THEN
    SELECT tenant_id, control_origin INTO target_tenant, target_origin FROM controls.controls WHERE control_id = NEW.control_id;
    IF target_tenant IS DISTINCT FROM NEW.tenant_id OR target_origin NOT IN ('tenant_instantiated','tenant_defined') THEN
      RAISE EXCEPTION 'AUDIT_TEST_CONTROL_MUST_BE_TENANT_IMPLEMENTATION';
    END IF;
  ELSE
    SELECT tenant_id INTO target_tenant FROM controls.control_assessments WHERE control_assessment_id = NEW.control_assessment_id;
    IF target_tenant IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'AUDIT_TEST_CONTROL_ASSESSMENT_TENANT_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_test_requirement_assessment_link"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE linked_test uuid; linked_requirement uuid; assessed_requirement uuid;
BEGIN
  SELECT audit_test_id, requirement_id INTO linked_test, linked_requirement
    FROM audit.audit_test_requirement_links WHERE tenant_id = NEW.tenant_id AND audit_test_requirement_link_id = NEW.audit_test_requirement_link_id;
  SELECT a.requirement_id INTO assessed_requirement
    FROM regulatory.requirement_assessments r JOIN regulatory.requirement_applicabilities a
      ON a.tenant_id = r.tenant_id AND a.requirement_applicability_id = r.requirement_applicability_id
   WHERE r.tenant_id = NEW.tenant_id AND r.requirement_assessment_id = NEW.requirement_assessment_id;
  IF linked_test IS DISTINCT FROM NEW.audit_test_id OR linked_requirement IS DISTINCT FROM assessed_requirement THEN
    RAISE EXCEPTION 'AUDIT_TEST_REQUIREMENT_ASSESSMENT_LINEAGE_MISMATCH';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION "audit"."validate_audit_approval"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE framework_count integer;
BEGIN
  IF NEW.lifecycle_state = 'approved' AND OLD.lifecycle_state IS DISTINCT FROM 'approved' THEN
    SELECT count(DISTINCT framework_version_id) INTO framework_count FROM audit.audit_criteria WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id;
    IF framework_count NOT BETWEEN 1 AND 3
       OR NOT EXISTS (SELECT 1 FROM audit.audit_objectives WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR NOT EXISTS (SELECT 1 FROM audit.audit_scopes WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR (SELECT count(*) FROM audit.audit_team_assignments WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id AND team_role = 'lead_auditor' AND assigned_to IS NULL AND lifecycle_state = 'active') <> 1
       OR NOT EXISTS (SELECT 1 FROM audit.audit_competency_requirements WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR EXISTS (
         SELECT 1 FROM audit.audit_competency_requirements r WHERE r.tenant_id = NEW.tenant_id AND r.audit_id = NEW.audit_id
          AND NOT EXISTS (SELECT 1 FROM audit.audit_competency_validations v WHERE v.tenant_id = r.tenant_id AND v.audit_competency_requirement_id = r.audit_competency_requirement_id AND v.validation_outcome = 'covered')
       )
       OR NOT EXISTS (SELECT 1 FROM audit.audit_agenda_items WHERE tenant_id = NEW.tenant_id AND audit_id = NEW.audit_id)
       OR EXISTS (
         SELECT 1 FROM audit.audit_agenda_items i WHERE i.tenant_id = NEW.tenant_id AND i.audit_id = NEW.audit_id
          AND (NOT EXISTS (SELECT 1 FROM audit.audit_agenda_item_scopes s WHERE s.tenant_id = i.tenant_id AND s.audit_agenda_item_id = i.audit_agenda_item_id)
            OR NOT EXISTS (SELECT 1 FROM audit.audit_agenda_item_team_assignments t WHERE t.tenant_id = i.tenant_id AND t.audit_agenda_item_id = i.audit_agenda_item_id))
       ) THEN
      RAISE EXCEPTION 'AUDIT_APPROVAL_PRECONDITIONS_NOT_MET';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "trg_audit_objectives_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_objectives" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_criteria_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_criteria" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_scopes_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_scopes" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_team_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_team_assignments" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_agenda_plan_mutable" BEFORE INSERT OR UPDATE OR DELETE ON "audit"."audit_agenda_items" FOR EACH ROW EXECUTE FUNCTION "audit"."enforce_plan_mutable"();
CREATE TRIGGER "trg_audit_criteria_validate" BEFORE INSERT OR UPDATE ON "audit"."audit_criteria" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_criterion"();
CREATE TRIGGER "trg_audit_scopes_validate" BEFORE INSERT OR UPDATE ON "audit"."audit_scopes" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_scope"();
CREATE TRIGGER "trg_audit_team_validate" BEFORE INSERT OR UPDATE ON "audit"."audit_team_assignments" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_team_assignment"();
CREATE TRIGGER "trg_audit_competency_requirement_validate" BEFORE INSERT ON "audit"."audit_competency_requirements" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_competency_requirement"();
CREATE TRIGGER "trg_audit_competency_validation_validate" BEFORE INSERT ON "audit"."audit_competency_validations" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_competency_validation"();
CREATE TRIGGER "trg_audit_agenda_test_validate" BEFORE INSERT ON "audit"."audit_agenda_item_tests" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_agenda_test_link"();
CREATE TRIGGER "trg_audit_agenda_scope_validate" BEFORE INSERT ON "audit"."audit_agenda_item_scopes" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_agenda_scope_link"();
CREATE TRIGGER "trg_audit_agenda_team_validate" BEFORE INSERT ON "audit"."audit_agenda_item_team_assignments" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_agenda_team_link"();
CREATE TRIGGER "trg_audit_test_requirement_validate" BEFORE INSERT ON "audit"."audit_test_requirement_links" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_test_requirement_link"();
CREATE TRIGGER "trg_audit_test_control_validate" BEFORE INSERT ON "audit"."audit_test_control_links" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_test_control_link"();
CREATE TRIGGER "trg_audit_test_requirement_assessment_validate" BEFORE INSERT ON "audit"."audit_test_requirement_assessment_links" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_test_requirement_assessment_link"();
CREATE TRIGGER "trg_audits_integrated_approval_validate" BEFORE UPDATE OF "lifecycle_state" ON "audit"."audits" FOR EACH ROW EXECUTE FUNCTION "audit"."validate_audit_approval"();
`;
}

function auditAmendmentSql(rows, allRows) {
  const controlledSchemas = [...new Set(allRows.map((row) => row.schema))];
  const expectedLedger = ["20260916000100", "20260916000200", "20260916000300", "20260916000400", "20260916000500", "20260916000600", "20260916000700", "20260916000800", "20260916000900"];
  const preflight = `-- PRE-F4 approved integrated Audit model; PostgreSQL 16; transactional and fail-closed.
DO $$
DECLARE physical_table_count integer; ledger_count integer; existing_audits bigint;
BEGIN
  IF current_database() <> 'tcdx-grc' OR current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_TARGET_IDENTITY_MISMATCH';
  END IF;
  SELECT count(*) INTO ledger_count FROM platform.schema_migrations WHERE outcome = 'applied';
  IF ledger_count <> 9 OR EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id <> ALL (ARRAY[${expectedLedger.map(q).join(", ")}]::char(14)[])) THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_LEDGER_PRECONDITION_FAILED';
  END IF;
  SELECT count(*) INTO physical_table_count FROM pg_catalog.pg_tables WHERE schemaname = ANY (ARRAY[${controlledSchemas.map(q).join(", ")}]) AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_table_count <> 214 THEN RAISE EXCEPTION 'AUDIT_AMENDMENT_SCHEMA_COUNT_PRECONDITION_FAILED: %', physical_table_count; END IF;
  IF to_regclass('audit.audits') IS NULL OR to_regclass('audit.audit_tests') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'audit' AND table_name = 'audits' AND column_name = 'scope_text')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'audit' AND table_name = 'audits' AND column_name = 'lead_membership_id') THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_SCHEMA_SHAPE_PRECONDITION_FAILED';
  END IF;
  SELECT count(*) INTO existing_audits FROM audit.audits;
  RAISE NOTICE 'EXISTING_AUDITS=%', existing_audits;
  IF existing_audits <> 0 THEN RAISE EXCEPTION 'AUDIT_RECONCILIATION_REQUIRED_BEFORE_MUTATION: EXISTING_AUDITS=%', existing_audits; END IF;
END $$;
`;
  const dropLegacy = `DROP INDEX "audit"."ix_audits__lead_membership_id";
ALTER TABLE "audit"."audits" DROP COLUMN "scope_text", DROP COLUMN "lead_membership_id";

DO $$
DECLARE physical_table_count integer;
BEGIN
  SELECT count(*) INTO physical_table_count FROM pg_catalog.pg_tables WHERE schemaname = ANY (ARRAY[${controlledSchemas.map(q).join(", ")}]) AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');
  IF physical_table_count <> 229 THEN RAISE EXCEPTION 'AUDIT_AMENDMENT_POSTCONDITION_TABLE_COUNT_FAILED: %', physical_table_count; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'audit' AND table_name = 'audits' AND column_name IN ('scope_text','lead_membership_id')) THEN
    RAISE EXCEPTION 'AUDIT_AMENDMENT_POSTCONDITION_DUAL_AUTHORITY';
  END IF;
END $$;
`;
  return [preflight, createTablesSql(rows, ["audit"]), constraintsSql(rows), auditAmendmentForeignKeys(rows, allRows), auditAmendmentIndexes(rows), auditAmendmentTriggersSql(), dropLegacy].join("\n");
}

function deterministicUuid(stableKey, namespace = "TCDX_GRC_PHASE3_V1", instant = generatedAt) {
  const bytes = Buffer.from(sha256(`${namespace}:${stableKey}`), "hex");
  const timestamp = BigInt(Date.parse(instant));
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
  if (rows.length !== 100) throw new Error(`Expected 100 reconciled lifecycle edges, parsed ${rows.length}`);
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

function preF5cUuid(stableKey) {
  return deterministicUuid(stableKey, "TCDX_GRC_PRE_F5C_V1", preF5cGeneratedAt);
}

function preF5cMigrationSql(rows) {
  const lifecycle = parseLifecycle();
  const permissions = parsePermissions();
  const currentByKey = new Map(lifecycle.map((edge) => [`${edge.entity}|${edge.from}|${edge.command}`, edge]));
  const newKeys = new Set([
    ...lifecycle.filter((edge) => ["RequirementApplicability", "StatementOfApplicability", "EvidenceVersion"].includes(edge.entity)),
    lifecycle.find((edge) => edge.entity === "AssuranceTest" && edge.command === "assurance_test.execute")
  ].filter(Boolean).map((edge) => `${edge.entity}|${edge.from}|${edge.command}`));
  const revisedKeys = new Set(lifecycle.filter((edge) =>
    (edge.entity === "RequirementAssessment" && edge.command !== "requirement_assessment.supersede")
    || edge.entity === "ControlAssessment"
    || (edge.entity === "AssuranceTest" && ["assurance_test.start", "assurance_test.review", "assurance_test.approve"].includes(edge.command))
    || (edge.entity === "Issue" && ["issue.triage", "issue.start_remediation", "issue.request_verification", "issue.verify_close"].includes(edge.command))
    || (edge.entity === "Action" && ["action.start", "action.submit_review", "action.complete", "action.verify"].includes(edge.command))
  ).map((edge) => `${edge.entity}|${edge.from}|${edge.command}`));
  const activeEdges = [...newKeys, ...revisedKeys].map((key) => {
    const edge = currentByKey.get(key);
    if (!edge) throw new Error(`Missing PRE-F5C lifecycle edge ${key}`);
    return { ...edge, version: newKeys.has(key) ? 1 : 2 };
  });
  if (activeEdges.length !== 31) throw new Error(`Expected 31 PRE-F5C active lifecycle definitions, found ${activeEdges.length}`);

  const historicalSupersessions = [
    ["Evidence", "draft", "evidence.submit"],
    ["Evidence", "submitted", "evidence.start_review"],
    ["Evidence", "under_review", "evidence.approve"],
    ["Evidence", "under_review", "evidence.reject"],
    ["Evidence", "approved", "evidence.expire"],
    ["Evidence", "approved", "evidence.supersede"],
    ["Evidence", "rejected", "evidence.revise"],
    ["AssuranceTest", "in_progress", "assurance_test.complete"]
  ];
  const out = [
    "-- PRE-F5C executable/physical reconciliation; approved by DR-PRE-F5C-2026-09-21-005.",
    "-- Forward-only rollback is operational backup/restore; no destructive down migration is authorized.",
    "DO $$",
    "DECLARE ledger_rows integer; physical_rows integer;",
    "BEGIN",
    "  SELECT count(*) INTO ledger_rows FROM platform.schema_migrations WHERE outcome = 'applied';",
    "  IF ledger_rows <> 10 OR NOT EXISTS (SELECT 1 FROM platform.schema_migrations WHERE migration_id = '20260916001000') THEN",
    "    RAISE EXCEPTION 'PRE_F5C_PREFLIGHT_LEDGER_EXPECTED_10_APPLIED';",
    "  END IF;",
    `  SELECT count(*) INTO physical_rows FROM pg_catalog.pg_tables WHERE schemaname IN (${[...new Set(rows.map((row) => row.schema))].map(q).join(", ")}) AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');`,
    "  IF physical_rows <> 229 THEN RAISE EXCEPTION 'PRE_F5C_PREFLIGHT_EXPECTED_229_TABLES'; END IF;",
    "  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'regulatory' AND table_name = 'requirement_applicabilities' AND column_name = 'row_version') THEN",
    "    RAISE EXCEPTION 'PRE_F5C_PREFLIGHT_ALREADY_MATERIALIZED';",
    "  END IF;",
    "END $$;",
    ""
  ];

  const mutableTables = [
    "regulatory.requirement_applicabilities", "regulatory.requirement_assessments", "regulatory.statements_of_applicability",
    "controls.control_assessments", "controls.assurance_tests", "evidence.evidence_versions"
  ];
  for (const table of mutableTables) {
    const tableName = table.split(".")[1];
    out.push(
      `ALTER TABLE ${fq(table)} ADD COLUMN "updated_at" timestamptz, ADD COLUMN "updated_by_user_identity_id" uuid, ADD COLUMN "updated_by_service_principal_id" uuid, ADD COLUMN "row_version" bigint NOT NULL DEFAULT 1;`,
      `UPDATE ${fq(table)} SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;`,
      `ALTER TABLE ${fq(table)} ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "updated_at" SET NOT NULL;`,
      `ALTER TABLE ${fq(table)} ADD CONSTRAINT ${constraint(`ck_${tableName}__updated_actor_one`)} CHECK (num_nonnulls(updated_by_user_identity_id, updated_by_service_principal_id) <= 1), ADD CONSTRAINT ${constraint(`ck_${tableName}__row_version_positive`)} CHECK (row_version > 0);`,
      `ALTER TABLE ${fq(table)} ADD CONSTRAINT ${constraint(`fk_${tableName}__updated_by_user_identity_id`)} FOREIGN KEY ("updated_by_user_identity_id") REFERENCES "iam"."user_identities" ("user_identity_id") ON UPDATE NO ACTION ON DELETE RESTRICT, ADD CONSTRAINT ${constraint(`fk_${tableName}__updated_by_service_principal_id`)} FOREIGN KEY ("updated_by_service_principal_id") REFERENCES "iam"."service_principals" ("service_principal_id") ON UPDATE NO ACTION ON DELETE RESTRICT;`,
      ""
    );
  }
  out.push(
    `ALTER TABLE "regulatory"."requirement_applicabilities" ADD COLUMN "superseded_by_id" uuid;`,
    `ALTER TABLE "regulatory"."requirement_applicabilities" DROP CONSTRAINT "uq_requirement_applicabilities__tenant_id_requirement__c645d089";`,
    `ALTER TABLE "regulatory"."requirement_applicabilities" ADD CONSTRAINT ${constraint("uq_requirement_applicabilities__tenant_id_requirement_id_scope_subject_id_applicability_version")} UNIQUE NULLS NOT DISTINCT ("tenant_id", "requirement_id", "scope_subject_id", "applicability_version");`,
    `ALTER TABLE "regulatory"."requirement_applicabilities" ADD CONSTRAINT ${constraint("fk_requirement_applicabilities__superseded_by_id")} FOREIGN KEY ("tenant_id", "superseded_by_id") REFERENCES "regulatory"."requirement_applicabilities" ("tenant_id", "requirement_applicability_id") ON UPDATE NO ACTION ON DELETE RESTRICT;`,
    `ALTER TABLE "regulatory"."statements_of_applicability" DROP CONSTRAINT "uq_statements_of_applicability__tenant_id_soa_version";`,
    `ALTER TABLE "regulatory"."statements_of_applicability" ADD CONSTRAINT ${constraint("uq_statements_of_applicability__tenant_id_framework_version_id_soa_version")} UNIQUE NULLS NOT DISTINCT ("tenant_id", "framework_version_id", "soa_version");`,
    `ALTER TABLE "regulatory"."statement_of_applicability_items" ADD CONSTRAINT ${constraint("uq_statement_of_applicability_items__tenant_id_statement_of_applicability_id_reference_control_version_id")} UNIQUE NULLS NOT DISTINCT ("tenant_id", "statement_of_applicability_id", "reference_control_version_id");`,
    `ALTER TABLE "evidence"."evidence_versions" ADD CONSTRAINT ${constraint("uq_evidence_versions__tenant_id_evidence_id_version_number")} UNIQUE NULLS NOT DISTINCT ("tenant_id", "evidence_id", "version_number");`,
    ""
  );

  const permissionRows = [
    { code: "compliance.soa.create", domain: "compliance", resource: "soa", action: "create", roles: ["GRC_MANAGER", "COMPLIANCE_MANAGER"] },
    { code: "controls.assurance_test.create", domain: "controls", resource: "assurance_test", action: "create", roles: ["GRC_MANAGER", "AUDITOR_LEAD", "AUDITOR"] }
  ];
  for (const permission of permissionRows) {
    out.push(`INSERT INTO iam.permissions (permission_id, created_at, created_by_user_identity_id, created_by_service_principal_id, updated_at, updated_by_user_identity_id, updated_by_service_principal_id, row_version, permission_code, domain_code, resource_code, action_code, lifecycle_state) VALUES (${q(preF5cUuid(`permission:${permission.code}:v1`))}, ${q(preF5cGeneratedAt)}, NULL, NULL, ${q(preF5cGeneratedAt)}, NULL, NULL, 1, ${q(permission.code)}, ${q(permission.domain)}, ${q(permission.resource)}, ${q(permission.action)}, 'published') ON CONFLICT (permission_code) DO NOTHING;`);
    for (const roleCode of permission.roles) {
      out.push(`INSERT INTO iam.role_permissions (role_permission_id, created_at, created_by_user_identity_id, created_by_service_principal_id, ownership_class, tenant_id, role_id, permission_id) SELECT ${q(preF5cUuid(`grant:${roleCode}:${permission.code}:v1`))}, ${q(preF5cGeneratedAt)}, NULL, NULL, 'PLATFORM_CONTROL', NULL, r.role_id, p.permission_id FROM iam.roles r CROSS JOIN iam.permissions p WHERE r.role_code = ${q(roleCode)} AND r.tenant_id IS NULL AND p.permission_code = ${q(permission.code)} ON CONFLICT DO NOTHING;`);
    }
  }
  out.push("");

  const transitionColumns = "lifecycle_transition_definition_id, created_at, created_by_user_identity_id, created_by_service_principal_id, entity_type, version_number, from_state, command_code, to_state, precondition_policy_ref, permission_id, sod_policy_ref, audit_event_code, notification_policy_ref, recalculation_policy_ref, idempotency_semantics, concurrency_semantics, system_actor_allowed, lifecycle_state, published_at";
  for (const edge of activeEdges) {
    const stable = `transition:${edge.entity}:${edge.from}:${edge.command}:v${edge.version}`;
    const transitionId = preF5cUuid(stable);
    out.push(`INSERT INTO ops_audit.lifecycle_transition_definitions (${transitionColumns}) SELECT ${q(transitionId)}, ${q(preF5cGeneratedAt)}, NULL, NULL, ${q(edge.entity)}, ${edge.version}, ${q(edge.from)}, ${q(edge.command)}, ${q(edge.to)}, ${q(`contract:${stable}`)}, p.permission_id, 'contract:default-deny-sod:v1', ${q(edge.audit)}, 'NONE_CONTRACTUALLY_REQUIRED', 'NONE_CONTRACTUALLY_REQUIRED', 'IDEMPOTENCY_KEY_REQUIRED', 'ROW_VERSION_COMPARE_AND_SWAP', false, 'published', ${q(preF5cGeneratedAt)} FROM iam.permissions p WHERE p.permission_code = ${q(edge.permission)} ON CONFLICT DO NOTHING;`);
    const permission = permissions.find((item) => item.permissionCode === edge.permission);
    if (!permission) throw new Error(`No executable Permission seed for lifecycle permission ${edge.permission}`);
    for (const scope of permission.scopes) {
      out.push(`INSERT INTO ops_audit.lifecycle_transition_scopes (lifecycle_transition_scope_id, created_at, created_by_user_identity_id, created_by_service_principal_id, lifecycle_transition_definition_id, scope_kind) VALUES (${q(preF5cUuid(`${stable}:scope:${scope}`))}, ${q(preF5cGeneratedAt)}, NULL, NULL, ${q(transitionId)}, ${q(scope)}) ON CONFLICT DO NOTHING;`);
    }
    if (edge.event !== "NONE_CONTRACTUALLY_REQUIRED") {
      out.push(`INSERT INTO ops_audit.lifecycle_transition_side_effects (lifecycle_transition_side_effect_id, created_at, created_by_user_identity_id, created_by_service_principal_id, lifecycle_transition_definition_id, event_code, ordinal, is_required) VALUES (${q(preF5cUuid(`${stable}:event:${edge.event}`))}, ${q(preF5cGeneratedAt)}, NULL, NULL, ${q(transitionId)}, ${q(edge.event)}, 1, true) ON CONFLICT DO NOTHING;`);
    }
  }
  for (const [entity, from, command] of historicalSupersessions) {
    const stable = `transition:${entity}:${from}:${command}:v2:superseded`;
    out.push(`INSERT INTO ops_audit.lifecycle_transition_definitions (${transitionColumns}) SELECT ${q(preF5cUuid(stable))}, ${q(preF5cGeneratedAt)}, NULL, NULL, entity_type, 2, from_state, command_code, to_state, ${q(`contract:${stable}`)}, permission_id, sod_policy_ref, audit_event_code, notification_policy_ref, recalculation_policy_ref, idempotency_semantics, concurrency_semantics, system_actor_allowed, 'superseded', NULL FROM ops_audit.lifecycle_transition_definitions WHERE entity_type = ${q(entity)} AND from_state = ${q(from)} AND command_code = ${q(command)} AND version_number = 1 ON CONFLICT DO NOTHING;`);
  }
  out.push(
    "",
    "DO $$",
    "DECLARE physical_rows integer;",
    "BEGIN",
    `  SELECT count(*) INTO physical_rows FROM pg_catalog.pg_tables WHERE schemaname IN (${[...new Set(rows.map((row) => row.schema))].map(q).join(", ")}) AND NOT (schemaname = 'platform' AND tablename = 'schema_migrations');`,
    "  IF physical_rows <> 229 THEN RAISE EXCEPTION 'PRE_F5C_POSTCONDITION_EXPECTED_229_TABLES'; END IF;",
    "  IF (SELECT count(*) FROM iam.permissions WHERE permission_code IN ('compliance.soa.create','controls.assurance_test.create')) <> 2 THEN RAISE EXCEPTION 'PRE_F5C_POSTCONDITION_PERMISSIONS'; END IF;",
    "  IF (SELECT count(*) FROM ops_audit.lifecycle_transition_definitions WHERE created_at = '2026-09-21T00:00:00.000Z'::timestamptz) <> 39 THEN RAISE EXCEPTION 'PRE_F5C_POSTCONDITION_LIFECYCLE_DELTA'; END IF;",
    "END $$;",
    ""
  );
  return out.join("\n");
}

function expectedInventory(rows) {
  return {
    contract: "TCDX_GRC_MASTER_REGENT_BASELINE_v1.5_2026-09-16",
    rectorCandidate: phase5FinalRegentId,
    physicalModelCommit: "a822bb92d0d585edd84adc8a1c65ec280923cc8e",
    physicalModelAmendmentCommit: "6a31034ae1ecc1f9ee551431fb2a504a25fb52ce",
    preF5cDecision: "DR-PRE-F5C-2026-09-21-005",
    preF5eDecisionDate: "2026-09-23",
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

const baseRows = parsePhysicalModel();
const amendmentRows = auditAmendmentRows();
const preF5eRows = preF5eAmendmentRows();
const phase5FinalRows = phase5FinalAmendmentRows();
const phase5SubscriptionRegulatoryPackRows = phase5SubscriptionRegulatoryPackAmendmentRows();
const rows = [
  ...baseRows.map((row) => {
    if (row.name === "audit.audits") return { ...row, columns: row.columns.filter((column) => !["scope_text", "lead_membership_id"].includes(column[0])) };
    if (row.name === "platform.tenants") return { ...row, columns: row.columns.map((column) => column[0] === "lifecycle_state"
      ? [column[0], column[1], column[2], "active"]
      : column[0] === "data_classification" ? [column[0], column[1], column[2], "confidential"] : column) };
    if (row.name === "iam.tenant_memberships") return { ...row, columns: row.columns.map((column) => column[0] === "membership_state"
      ? [column[0], column[1], column[2], "active"] : column) };
    return phase5RegulatoryCatalogAmendment(phase5RetentionPolicyAmendment(row));
  }),
  ...amendmentRows,
  ...preF5eRows,
  ...phase5FinalRows,
  ...phase5SubscriptionRegulatoryPackRows,
  ...phase5PlusValidationRows()
];
const migrationDir = resolve(root, "database/migrations");
const historicalMigrations = [
  ["20260916000100_bootstrap_schemas_and_ledger.sql", "4f29910baacf82526fb06226c237024b7315038a4868baa7bbda56ced4779437"],
  ["20260916000200_platform_iam_organization.sql", "08fce9d08e729f097095a10cfdfbf093c43f9d8cbfbee97d39594691f4ad8f29"],
  ["20260916000300_normative_control_evidence.sql", "f300aac95b6fba36c09fc6ac77550bf574f953c0ee0ad374a8cbf6fdb338ef9f"],
  ["20260916000400_risk_operations_privacy.sql", "a38d2a7babbe77d79783d66e8ce909916e967be739d3712f303e51883d85a81b"],
  ["20260916000500_data_integration_reporting_ai.sql", "bac1e0a421a4d532eb2da27e4bc9453125cfa407a2e8da904c8749c726815764"],
  ["20260916000600_constraints_and_uniqueness.sql", "7d079aa1234050b6dde06d9fb3cad939144fcbccdf287cc31bbe863c68899bf5"],
  ["20260916000700_foreign_keys.sql", "d2112e4b402e8789312d5473969b615e6d7ab344a58a2211f790c4423dd4361f"],
  ["20260916000800_required_indexes.sql", "d3502b9de76209b54b40497e6b9fdf94d463335d1f5441fb0fb924786648336e"],
  ["20260916000900_canonical_seeds.sql", "94547ff1fa6a9accf56ff6f28be93afeb91b8c290ca9bb224667862c64c8c2e7"],
  ["20260916001000_pre_f4_integrated_audit_model.sql", "c4247051c223960eb5ca817a0f85650dbc828a7864e48f66a1a73b1d298a224d"]
].map(([filename, approvedSha256]) => {
  const content = readFileSync(resolve(migrationDir, filename), "utf8");
  if (sha256(content) !== approvedSha256) throw new Error(`Historical migration drift: ${filename}`);
  return [filename, content];
});
const preF5cMigrationFilename = "20260921000100_pre_f5c_executable_physical_reconciliation.sql";
const preF5cMigration = [preF5cMigrationFilename, readFileSync(resolve(migrationDir, preF5cMigrationFilename), "utf8")];
if (sha256(preF5cMigration[1]) !== "1181d7ab26718927124de880e351fbaba3f2daaca41267a1ef66d28ac2021680") {
  throw new Error(`Historical migration drift: ${preF5cMigrationFilename}`);
}
const phase5RuntimeMigrationFilename = "20260921000200_phase5_core_grc_runtime_permissions.sql";
const phase5RuntimeMigration = [phase5RuntimeMigrationFilename, readFileSync(resolve(migrationDir, phase5RuntimeMigrationFilename), "utf8")];
if (sha256(phase5RuntimeMigration[1]) !== "8cc3d1b2a64a5b00ffd55f93ccfbcdfcde5406ffa9c1fa7f2d2055f505048eb0") {
  throw new Error(`Phase 5 runtime migration drift: ${phase5RuntimeMigrationFilename}`);
}
const preF5eMigrationFilename = "20260923000100_pre_f5e_platform_authority.sql";
const preF5eMigration = [preF5eMigrationFilename, readFileSync(resolve(migrationDir, preF5eMigrationFilename), "utf8")];
const phase5FinalMigrationFilename = "20260923000200_phase5_final_closure.sql";
const phase5FinalMigration = [phase5FinalMigrationFilename, readFileSync(resolve(migrationDir, phase5FinalMigrationFilename), "utf8")];
if (sha256(phase5FinalMigration[1]) !== "96a56b5669cd6e6fd0d751dc12526e3fe6ad2c612e77a8a7e144c847775be96c") {
  throw new Error(`Phase 5 final migration drift: ${phase5FinalMigrationFilename}`);
}
const phase5SubscriptionCatalogFilename = "20260924000100_phase5_subscription_create_catalog.sql";
const phase5SubscriptionCatalogMigration = [phase5SubscriptionCatalogFilename, readFileSync(resolve(migrationDir, phase5SubscriptionCatalogFilename), "utf8")];
const phase5RetentionPolicyFilename = "20260924000200_phase5_retention_policy_lifecycle.sql";
const phase5RetentionPolicyMigration = [phase5RetentionPolicyFilename, readFileSync(resolve(migrationDir, phase5RetentionPolicyFilename), "utf8")];
const phase5MembershipInvitationFilename = "20260924000300_phase5_membership_invitation.sql";
const phase5MembershipInvitationMigration = [phase5MembershipInvitationFilename, readFileSync(resolve(migrationDir, phase5MembershipInvitationFilename), "utf8")];
if (sha256(phase5MembershipInvitationMigration[1]) !== "0942e5eb360f7157a444d7b04fbe7558312e8d782347e60a745a8d4365034806") {
  throw new Error(`Applied Phase 5 membership invitation migration drift: ${phase5MembershipInvitationFilename}`);
}
const phase5MembershipInvitationAuthorityFilename = "20260925000100_phase5_membership_invitation_platform_authority_reconciliation.sql";
const phase5MembershipInvitationAuthorityMigration = [phase5MembershipInvitationAuthorityFilename, readFileSync(resolve(migrationDir, phase5MembershipInvitationAuthorityFilename), "utf8")];
const phase5AdministrativeReadFilename = "20260928000100_phase5_administrative_read_permissions.sql";
const phase5AdministrativeReadMigration = [phase5AdministrativeReadFilename, readFileSync(resolve(migrationDir, phase5AdministrativeReadFilename), "utf8")];
const phase5MembershipRoleRevokeFilename = "20260928000200_phase5_membership_role_revoke_platform_grant.sql";
const phase5MembershipRoleRevokeMigration = [phase5MembershipRoleRevokeFilename, readFileSync(resolve(migrationDir, phase5MembershipRoleRevokeFilename), "utf8")];
const phase5ControlAssessmentStartFilename = "20260928000300_phase5_control_assessment_start_tenant_scope.sql";
const phase5ControlAssessmentStartMigration = [phase5ControlAssessmentStartFilename, readFileSync(resolve(migrationDir, phase5ControlAssessmentStartFilename), "utf8")];
const phase5RegulatoryCatalogFilename = "20260928000400_phase5_regulatory_catalog_contract_alignment.sql";
const phase5RegulatoryCatalogMigration = [phase5RegulatoryCatalogFilename, readFileSync(resolve(migrationDir, phase5RegulatoryCatalogFilename), "utf8")];
const phase5SubscriptionRegulatoryPackFilename = "20260929000100_phase5_subscription_regulatory_pack_authority.sql";
const phase5SubscriptionRegulatoryPackMigration = [phase5SubscriptionRegulatoryPackFilename, readFileSync(resolve(migrationDir, phase5SubscriptionRegulatoryPackFilename), "utf8")];
const phase5PlusFilename = "20260929000200_phase5_plus_permissions_applicability.sql";
const phase5PlusMigration = [phase5PlusFilename, readFileSync(resolve(migrationDir, phase5PlusFilename), "utf8")];
const phase5PlusValidationFilename = "20260929000300_phase5_plus_subject_validation_access.sql";
const phase5PlusValidationMigration = [phase5PlusValidationFilename, readFileSync(resolve(migrationDir, phase5PlusValidationFilename), "utf8")];
const managedIdentityPermissionsFilename = "20261001000100_managed_identity_permissions_publication.sql";
const managedIdentityPermissionsMigration = [managedIdentityPermissionsFilename, readFileSync(resolve(migrationDir, managedIdentityPermissionsFilename), "utf8")];
const platformRolePermissionFilename = "20261006000100_platform_role_administration_permission_publication.sql";
const platformRolePermissionMigration = [platformRolePermissionFilename, readFileSync(resolve(migrationDir, platformRolePermissionFilename), "utf8")];
const discoveryPermissionFilename = "20261006000200_user_identity_discovery_permission_publication.sql";
const discoveryPermissionMigration = [discoveryPermissionFilename, readFileSync(resolve(migrationDir, discoveryPermissionFilename), "utf8")];
const tenantUserOnboardingFilename = "20261007000100_platform_tenant_user_onboarding_permission_publication.sql";
const tenantUserOnboardingMigration = [tenantUserOnboardingFilename, readFileSync(resolve(migrationDir, tenantUserOnboardingFilename), "utf8")];
const methodologyFilename = "20261007000200_phase5_methodology_binding.sql";
const methodologyMigration = [methodologyFilename, readFileSync(resolve(migrationDir, methodologyFilename), "utf8")];
const migrations = [...historicalMigrations, preF5cMigration, phase5RuntimeMigration, preF5eMigration, phase5FinalMigration, phase5SubscriptionCatalogMigration, phase5RetentionPolicyMigration, phase5MembershipInvitationMigration, phase5MembershipInvitationAuthorityMigration, phase5AdministrativeReadMigration, phase5MembershipRoleRevokeMigration, phase5ControlAssessmentStartMigration, phase5RegulatoryCatalogMigration, phase5SubscriptionRegulatoryPackMigration, phase5PlusMigration, phase5PlusValidationMigration, managedIdentityPermissionsMigration, platformRolePermissionMigration, discoveryPermissionMigration, tenantUserOnboardingMigration, methodologyMigration];
const manifest = {
  manifestVersion: 1,
  runnerVersion: "1.0.0",
  databaseName: "tcdx-grc",
  postgresMajor: 16,
  advisoryLockSource: "tcdx-grc:platform.schema_migrations:v1",
  migrations: migrations.map(([filename, content]) => ({
    id: filename.slice(0, 14), filename, sha256: sha256(content), transactional: true,
    preconditions: filename.includes("phase5_methodology_binding")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=29", "latest_migration=20261007000100", "physical_tables=235", "published_permissions=170", "assessment_rows=0"]
      : filename.includes("platform_tenant_user_onboarding_permission_publication")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=28", "latest_migration=20261006000200", "physical_tables=235", "published_permissions=169", "tenant_user_onboard_permissions=0", "canonical_platform_admin_roles=1"]
      : filename.includes("user_identity_discovery_permission_publication")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=27", "latest_migration=20261006000100", "physical_tables=235", "published_permissions=168", "user_identity_read_permissions=0", "canonical_platform_and_tenant_admin_templates=2"]
      : filename.includes("platform_role_administration_permission_publication")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=26", "latest_migration=20261001000100", "physical_tables=235", "published_permissions=167", "platform_role_administer_permissions=0", "canonical_platform_admin_roles=1"]
      : filename.includes("managed_identity_permissions_publication")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=25", "latest_migration=20260929000300", "physical_tables=235", "published_permissions=163", "managed_identity_permissions=0", "canonical_platform_admin_roles=1"]
      : filename.includes("phase5_plus_subject_validation_access")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=24", "physical_tables=233", "published_permissions=158", "no_duplicate_active_subject_generation"]
      : filename.includes("phase5_plus_permissions_applicability")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=23", "physical_tables=233", "published_permissions=154"]
      : filename.includes("subscription_regulatory_pack_authority")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=22", "physical_tables=232", "published_permissions=154", "subscription_regulatory_packs=absent"]
      : filename.includes("regulatory_catalog_contract_alignment")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=21", "physical_tables=232", "published_permissions=154", "crosswalk_mapping_rows=0", "normative_unit_composite_duplicates=0", "existing_requirements_content_valid"]
      : filename.includes("control_assessment_start_tenant_scope")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=20", "physical_tables=232", "applied_role_revoke_grant_sha256=d47e4fa07250092c5b8c063a60713528627acee864f93278b3c5f0ed5dd57cdc", "control_assessment_start_v2=published", "control_owner_update_template_grant=1"]
      : filename.includes("membership_role_revoke_platform_grant")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=19", "physical_tables=232", "applied_administrative_read_sha256=d19c72ce...", "published_permissions=154", "platform_admin_role_assign_grant=absent"]
      : filename.includes("administrative_read_permissions")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=18", "physical_tables=232", "applied_membership_invitation_authority_sha256=b66f88a1...", "administrative_read_permissions=absent"]
      : filename.includes("platform_authority_reconciliation")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=17", "physical_tables=232", "applied_membership_invitation_sha256=0942e5eb...", "PLATFORM_ADMIN=exactly_1"]
      : filename.includes("phase5_membership_invitation")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=16", "physical_tables=231", "tenant_membership_invitations=absent", "membership_invitation_permissions=absent"]
      : filename.includes("phase5_retention_policy_lifecycle")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=15", "physical_tables=231", "retention_policy_lifecycle_state=present", "retention_policy_row_version=absent"]
      : filename.includes("phase5_subscription_create_catalog")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=14", "physical_tables=231", "platform.subscription.create=absent"]
      : filename.includes("phase5_final_closure")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=13", "physical_tables=230", "file_upload_intents=absent"]
      : filename.includes("pre_f5e")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=12", "physical_tables=229", "platform_role_assignments=absent"]
      : filename.includes("phase5_core_grc")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=11", "physical_tables=229"]
      : filename.includes("pre_f5c")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=10", "physical_tables=229", "pre_f5c_columns=absent"]
      : filename.includes("pre_f4")
      ? ["database_name=tcdx-grc", "postgres_major=16", "ledger_count=9", "physical_tables=214", "existing_audits=0_or_approved_reconciliation"]
      : ["database_name=tcdx-grc", "postgres_major=16"],
    postconditions: filename.includes("phase5_methodology_binding")
      ? ["ledger_outcome=applied", "physical_tables=237", "published_permissions=172", "methodologies=two_separate_published_versions", "assessment_methodology_fks=validated"]
      : filename.includes("platform_tenant_user_onboarding_permission_publication")
      ? ["ledger_outcome=applied", "physical_tables=235", "published_permissions=170", "tenant_user_onboard_permissions=1", "platform_admin_grant=1", "unauthorized_grants=0", "schema_delta=0"]
      : filename.includes("user_identity_discovery_permission_publication")
      ? ["ledger_outcome=applied", "physical_tables=235", "published_permissions=169", "user_identity_read_permissions=1", "platform_admin_grant=1", "tenant_admin_template_grant=1", "tenant_admin_grant_per_existing_instance=1", "unauthorized_grants=0", "schema_delta=0"]
      : filename.includes("platform_role_administration_permission_publication")
      ? ["ledger_outcome=applied", "physical_tables=235", "published_permissions=168", "platform_role_administer_permissions=1", "platform_admin_role_administer_grants=1", "other_role_role_administer_grants=0", "schema_delta=0"]
      : filename.includes("managed_identity_permissions_publication")
      ? ["ledger_outcome=applied", "physical_tables=235", "published_permissions=167", "managed_identity_permissions=4", "platform_admin_managed_identity_grants=4", "other_role_managed_identity_grants=0"]
      : filename.includes("phase5_plus_subject_validation_access")
      ? ["ledger_outcome=applied", "physical_tables=235", "published_permissions=163", "subject_active_interval_unique", "validation_access_separate_from_subscription"]
      : filename.includes("phase5_plus_permissions_applicability")
      ? ["ledger_outcome=applied", "physical_tables=233", "published_permissions=158", "applicability_decision=closed"]
      : filename.includes("subscription_regulatory_pack_authority")
      ? ["ledger_outcome=applied", "physical_tables=233", "published_permissions=154", "subscription_regulatory_packs=present", "no_active_overlap"]
      : filename.includes("regulatory_catalog_contract_alignment")
      ? ["ledger_outcome=applied", "physical_tables=232", "published_permissions=154", "normative_unit_business_key=composite", "requirement_editorial_summary=present", "crosswalk_mapping_metadata=present"]
      : filename.includes("control_assessment_start_tenant_scope")
      ? ["ledger_outcome=applied", "physical_tables=232", "published_permissions=154", "control_assessment_start_v3_tenant_scope=published", "direct_identity_grants=0"]
      : filename.includes("membership_role_revoke_platform_grant")
      ? ["ledger_outcome=applied", "physical_tables=232", "published_permissions=154", "platform_admin_role_assign_grant=1", "direct_identity_grants=0"]
      : filename.includes("administrative_read_permissions")
      ? ["ledger_outcome=applied", "physical_tables=232", "administrative_read_permissions=4", "unauthorized_grants=0", "direct_identity_grants=0"]
      : filename.includes("platform_authority_reconciliation")
      ? ["ledger_outcome=applied", "physical_tables=232", "membership_invitation_permissions=2", "PLATFORM_ADMIN_only_grants=2", "unauthorized_grants=0", "service_actor_fks=2"]
      : filename.includes("phase5_membership_invitation")
      ? ["ledger_outcome=applied", "physical_tables=232", "tenant_membership_invitations=present", "membership_invitation_permissions=2", "PLATFORM_ADMIN_only_grants=2"]
      : filename.includes("phase5_retention_policy_lifecycle")
      ? ["ledger_outcome=applied", "physical_tables=231", "retention_effective_from_nullable=yes", "retention_effective_to_nullable=yes", "retention_row_version=bigint_not_null_default_1", "retention_lifecycle_edges=3"]
      : filename.includes("phase5_subscription_create_catalog")
      ? ["ledger_outcome=applied", "physical_tables=231", "platform.subscription.create=published", "PLATFORM_ADMIN_grant=1"]
      : filename.includes("phase5_final_closure")
      ? ["ledger_outcome=applied", "physical_tables=231", "file_upload_intents=present", "active_lifecycle_amendments=2", "secret_or_blob_columns=0"]
      : filename.includes("pre_f5e")
      ? ["ledger_outcome=applied", "physical_tables=230", "platform_role_assignments=present", "person_specific_grants=0"]
      : filename.includes("phase5_core_grc")
      ? ["ledger_outcome=applied", "physical_tables=229", "phase5_runtime_permissions=11"]
      : filename.includes("pre_f5c")
      ? ["ledger_outcome=applied", "physical_tables=229", "mutable_f5_rows=row_version", "pre_f5c_lifecycle_delta=39", "pre_f5c_permissions=2"]
      : filename.includes("pre_f4")
      ? ["ledger_outcome=applied", "physical_tables=229", "audit_scope_and_lead_dual_authority=0"]
      : ["ledger_outcome=applied"]
  }))
};

writeOrCheck(resolve(root, "database/migrations/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeOrCheck(resolve(root, "database/expected-schema.json"), `${JSON.stringify(extendMethodologyInventory(expectedInventory(rows)), null, 2)}\n`);
const canonicalSeedSql = historicalMigrations.find(([filename]) => filename === "20260916000900_canonical_seeds.sql")[1];
writeOrCheck(resolve(root, "database/seed-manifest.json"), `${JSON.stringify({
  manifestVersion: 2,
  source: "docs/executable-contracts/09_SEED_MANIFESTS.md",
  entries: ["SEED-001", "SEED-002", "SEED-003", "SEED-004", "SEED-005", "SEED-006", "SEED-007", "SEED-008", "SEED-009", "SEED-011", "SEED-012", "PRE-F5C-INCREMENTAL"],
  permissionRows: 136,
  lifecycleEdges: 103,
  rawLifecycleDefinitionRows: 139,
  configurationDefaults: 0,
  protectedRegulatoryContents: 0,
  contentSha256: sha256(canonicalSeedSql),
  incrementalMigration: preF5cMigration[0],
  incrementalSha256: sha256(preF5cMigration[1]),
  phase5RuntimePermissions: {
    migrationId: "20260921000200",
    permissionRows: 11,
    rolePermissionRows: 136,
    permissionCodes: [
      "compliance.applicability.read",
      "compliance.requirement_assessment.read",
      "compliance.soa.read",
      "controls.control.read",
      "controls.control_assessment.read",
      "controls.assurance_test.read",
      "evidence.evidence_request.read",
      "evidence.evidence.read",
      "remediation.issue.read",
      "remediation.action.read",
      "evidence.evidence.create"
    ]
  },
  phase5SubscriptionPermission: {
    migrationId: "20260924000100",
    permissionRows: 1,
    rolePermissionRows: 1,
    permissionCodes: ["platform.subscription.create"]
  },
  phase5RetentionPolicyLifecycle: {
    migrationId: "20260924000200",
    lifecycleEdges: 3,
    commands: ["retention_policy.review", "retention_policy.approve", "retention_policy.publish"],
    rowVersionAuthority: "privacy.retention_policies.row_version"
  },
  phase5MembershipInvitationPermissions: {
    migrationId: "20260924000300",
    authorityReconciliationMigrationId: "20260925000100",
    permissionRows: 2,
    rolePermissionRows: 2,
    rolePermissionPolicy: "PLATFORM_ADMIN_ONLY",
    permissionCodes: ["platform.membership_invitation.create", "platform.membership_invitation.update"]
  },
  phase5AdministrativeReadPermissions: {
    migrationId: "20260928000100",
    permissionRows: 4,
    permissionCodes: ["platform.tenant.read", "platform.membership.read", "platform.membership_invitation.read", "platform.role.read"],
    platformAdminGrantRows: 4,
    tenantAdminTemplateGrantRows: 2,
    tenantAdminGrantRowsPerTenant: 2
  },
  phase5ControlAssessmentStart: {
    migrationId: "20260928000300",
    lifecycleDefinitionDelta: 1,
    authoritativeScope: "tenant",
    permissionCode: "controls.control_assessment.update"
  },
  phase5PlusPermissions: {
    migrationId: "20260929000200",
    permissionRows: 4,
    permissionCodes: [
      "platform.subscription_regulatory_pack.read",
      "platform.subscription_regulatory_pack.create",
      "platform.subscription_regulatory_pack.archive",
      "organization.subject.read"
    ]
  },
  phase5PlusValidation: {
    migrationId: "20260929000300",
    permissionRows: 5,
    configurationDefaults: 1,
    permissionCodes: [
      "organization.subject.create",
      "platform.regulatory_pack_validation_access.read",
      "platform.regulatory_pack_validation_access.create",
      "platform.regulatory_pack_validation_access.archive",
      "platform.tenant_account_classification.update"
    ]
  },
  phase5Methodologies: { migrationId: "20261007000200", permissionRows: 2, permissionCodes: ["compliance.methodology.read", "controls.methodology.read"], methodologyRows: 2, formulaRows: 2, methodologyIds: ["01a11900-0000-7001-8000-000000000001", "01a11900-0000-7001-8000-000000000002"] },
  tenantUserOnboardingPermission: {
    migrationId: "20261007000100", permissionRows: 1, platformAdminGrantRows: 1,
    permissionCodes: ["platform.tenant_user.onboard"]
  },
  userIdentityDiscoveryPermission: {
    migrationId: "20261006000200", permissionRows: 1, platformAdminGrantRows: 1,
    tenantAdminTemplateGrantRows: 1, tenantAdminGrantRowsPerTenant: 1,
    permissionCodes: ["platform.user_identity.read"]
  },
  platformRoleAdministrationPermission: {
    migrationId: "20261006000100", permissionRows: 1, platformAdminGrantRows: 1,
    permissionCodes: ["platform.role.administer"]
  },
  managedIdentityPermissions: {
    migrationId: "20261001000100",
    permissionRows: 4,
    platformAdminGrantRows: 4,
    permissionCodes: [
      "platform.managed_identity.read",
      "platform.managed_identity.create",
      "platform.managed_identity.update",
      "platform.managed_identity.administer"
    ]
  }
}, null, 2)}\n`);

const openApiPath = resolve(root, "docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml");
const operationMatrixPath = resolve(root, "docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md");
const openApiSource = readFileSync(openApiPath, "utf8");
const matrixSource = readFileSync(operationMatrixPath, "utf8");
const operationIds = [...openApiSource.matchAll(/^      operationId: ([A-Za-z0-9]+)$/gm)].map((match) => match[1]);
const operationRows = [...matrixSource.matchAll(/^\| ([A-Za-z0-9]+) \| (GET|POST|PUT) `[^`]+` \|/gm)];
if (new Set(operationIds).size !== operationIds.length || operationRows.length !== operationIds.length ||
    operationRows.some((match) => !operationIds.includes(match[1]))) throw new Error("OpenAPI/matrix operation drift");
const readCount = operationRows.filter((match) => match[2] === "GET").length;
const mutatingCount = operationRows.length - readCount;
const openApiWithCount = openApiSource.replace(/Publica \d+ operaciones que cierran/,
  `Publica ${operationIds.length} operaciones que cierran`);
const matrixWithCount = matrixSource.replace(/`CONTRACTUAL_OPERATIONS=\d+`; `PUBLIC_READ_OPERATIONS=\d+`; `PUBLIC_MUTATING_OPERATIONS=\d+`/,
  `\`CONTRACTUAL_OPERATIONS=${operationIds.length}\`; \`PUBLIC_READ_OPERATIONS=${readCount}\`; \`PUBLIC_MUTATING_OPERATIONS=${mutatingCount}\``);
if (openApiWithCount === openApiSource && !openApiSource.includes(`Publica ${operationIds.length} operaciones que cierran`))
  throw new Error("OpenAPI operation summary missing");
if (matrixWithCount === matrixSource && !matrixSource.includes(`\`CONTRACTUAL_OPERATIONS=${operationIds.length}\``))
  throw new Error("Matrix operation summary missing");
writeOrCheck(openApiPath, openApiWithCount);
writeOrCheck(operationMatrixPath, matrixWithCount);

console.log(JSON.stringify({ mode: checkOnly ? "check" : "write", physicalTables: extendMethodologyInventory(expectedInventory(rows)).tableCount, publishedPermissions: 172, permissionsAfterCatalogRelease: 163, lifecycleEdges: 103, rawLifecycleDefinitionRows: 140, migrations: migrations.length, operations: operationIds.length, readOperations: readCount }, null, 2));
