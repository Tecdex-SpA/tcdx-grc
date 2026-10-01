import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import pg from "pg";
import { loadCatalogV11, materializeCatalogV11, catalogHeaderDirection } from "../../apps/backend/dist/regulatory/catalog-v1.1.js";
import { newUuidV7 } from "../../apps/backend/dist/uuid.js";

if (process.env.TCDX_ISOLATED_REBUILD !== "true" || process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_NAME !== "tcdx-grc") {
  throw new Error("Catalog PostgreSQL integration test requires isolated localhost rebuild");
}
const catalog = loadCatalogV11("data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1");
const client = new pg.Client({
  host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD, ssl: false
});
const tables = [
  ["regulatory", "regulatory_sources", "regulatory_source_id", 9],
  ["regulatory", "regulatory_packs", "regulatory_pack_id", 5],
  ["regulatory", "regulatory_pack_versions", "regulatory_pack_version_id", 5],
  ["regulatory", "frameworks", "framework_id", 5],
  ["regulatory", "framework_versions", "framework_version_id", 5],
  ["regulatory", "regulatory_pack_framework_versions", "regulatory_pack_framework_version_id", 5],
  ["regulatory", "normative_units", "normative_unit_id", 260],
  ["regulatory", "requirements", "requirement_id", 118],
  ["controls", "controls", "control_id", 212],
  ["controls", "control_versions", "control_version_id", 212],
  ["regulatory", "normative_unit_control_mappings", "normative_unit_control_mapping_id", 131],
  ["regulatory", "requirement_control_mappings", "requirement_control_mapping_id", 333],
  ["regulatory", "framework_crosswalks", "framework_crosswalk_id", 6],
  ["regulatory", "normative_unit_crosswalk_mappings", "normative_unit_crosswalk_mapping_id", 28],
  ["regulatory", "requirement_crosswalk_mappings", "requirement_crosswalk_mapping_id", 188],
  ["regulatory", "control_crosswalk_mappings", "control_crosswalk_mapping_id", 278],
  ["regulatory", "regulatory_coverage_manifests", "regulatory_coverage_manifest_id", 5],
  ["regulatory", "regulatory_import_manifests", "regulatory_import_manifest_id", 5]
];
const scalar = async (sql, params = []) => Number((await client.query(sql, params)).rows[0].value);
const count = (schema, table) => scalar(`SELECT count(*)::integer AS value FROM ${schema}.${table}`);
async function snapshot() {
  const hash = createHash("sha256");
  for (const [schema, table, id] of tables) {
    const rows = (await client.query(`SELECT * FROM ${schema}.${table} ORDER BY ${id}`)).rows;
    hash.update(JSON.stringify([schema, table, rows]));
  }
  return hash.digest("hex");
}
async function expectConstraint(sql, params, name) {
  await client.query("SAVEPOINT negative_check");
  try {
    await client.query(sql, params);
    assert.fail(`Expected constraint ${name}`);
  } catch (error) {
    assert.equal(error.constraint, name);
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT negative_check");
  }
}

await client.connect();
try {
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM platform.schema_migrations WHERE outcome='applied'"), 25);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM iam.permissions"), 163);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')"), 236);
  for (const [schema, table] of tables) if (!(schema === "regulatory" && table === "regulatory_packs")) assert.equal(await count(schema, table), 0, `pre-import ${schema}.${table}`);
  assert.equal(await count("regulatory", "regulatory_packs"), 5);

  const actor = newUuidV7();
  await client.query("INSERT INTO iam.user_identities(user_identity_id,identity_key,display_name,lifecycle_state) VALUES ($1,$2,$3,'active')", [actor, `catalog-local-test-${actor}`, "Catalog local integration actor"]);
  const first = await materializeCatalogV11(client, catalog, actor);
  assert.equal(first.replayed, false);
  for (const [schema, table, id, expected] of tables) {
    assert.equal(await count(schema, table), expected, `${schema}.${table}`);
    assert.equal(await scalar(`SELECT count(*)::integer AS value FROM ${schema}.${table} WHERE ${id}::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`), 0, `${table} UUIDv7`);
  }
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.normative_units u JOIN regulatory.framework_versions fv USING(framework_version_id) JOIN regulatory.frameworks f USING(framework_id) WHERE f.framework_code='ISO_IEC_42001_2023' AND u.effective_from='2023-12-18T00:00:00Z'"), 55);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.requirements r JOIN regulatory.framework_versions fv USING(framework_version_id) JOIN regulatory.frameworks f USING(framework_id) WHERE f.framework_code='ISO_IEC_42001_2023' AND r.effective_from='2023-12-18T00:00:00Z'"), 7);
  const isoControlCodes = catalog.rows.regulatory_reference_controls.filter((row) => row.source_framework_code === "ISO_IEC_42001_2023").map((row) => row.control_code);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM controls.control_versions cv JOIN controls.controls c USING(control_id) WHERE c.control_code=ANY($1::text[]) AND cv.effective_from='2023-12-18T00:00:00Z'", [isoControlCodes]), 38);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.framework_versions fv JOIN regulatory.frameworks f USING(framework_id) WHERE f.framework_code='ISO_IEC_42001_2023' AND fv.effective_from='2023-12-18T00:00:00Z'"), 1);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.normative_units WHERE (framework_version_id,source_locator) IN (SELECT framework_version_id,source_locator FROM regulatory.normative_units GROUP BY 1,2 HAVING count(*)>1)"), 0);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM (SELECT source_locator FROM regulatory.normative_units GROUP BY 1 HAVING count(DISTINCT framework_version_id)>1) s"), 60);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.requirements WHERE editorial_summary IS NULL OR btrim(editorial_summary)='' OR licensed_statement IS NOT NULL OR licensed_content_ref IS NOT NULL OR provenance_ref IS NULL OR statement_locator IS NULL"), 0);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM controls.controls WHERE ownership_class='GLOBAL_REFERENCE' AND control_origin='regulatory_reference' AND tenant_id IS NULL"), 131);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM controls.controls WHERE ownership_class='PLATFORM_CONTROL' AND control_origin='tcdx_baseline' AND tenant_id IS NULL"), 81);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM controls.controls WHERE tenant_id IS NOT NULL"), 0);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.requirement_control_mappings WHERE mapping_version=1"), 333);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.normative_unit_control_mappings WHERE mapping_version=1"), 131);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM (SELECT 1 FROM regulatory.requirement_control_mappings GROUP BY requirement_id,control_version_id,mapping_type,mapping_version HAVING count(*)>1) duplicate"), 0);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM (SELECT 1 FROM regulatory.normative_unit_control_mappings GROUP BY normative_unit_id,control_version_id,mapping_version HAVING count(*)>1) duplicate"), 0);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.framework_crosswalks WHERE direction='source_to_target' AND effective_from='2026-09-28T00:00:00Z' AND effective_to IS NULL"), 5);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.framework_crosswalks WHERE direction='bidirectional' AND effective_from='2026-09-28T00:00:00Z' AND effective_to IS NULL"), 1);
  const crosswalk = await client.query(`WITH m AS (
    SELECT framework_crosswalk_id,direction,provenance_ref,confidence,effective_from,effective_to,mapping_version_number FROM regulatory.normative_unit_crosswalk_mappings
    UNION ALL SELECT framework_crosswalk_id,direction,provenance_ref,confidence,effective_from,effective_to,mapping_version_number FROM regulatory.requirement_crosswalk_mappings
    UNION ALL SELECT framework_crosswalk_id,direction,provenance_ref,confidence,effective_from,effective_to,mapping_version_number FROM regulatory.control_crosswalk_mappings)
    SELECT count(*)::integer AS total,
      count(*) FILTER (WHERE m.direction<>h.direction)::integer AS direction_diff,
      count(*) FILTER (WHERE m.provenance_ref<>h.provenance_ref)::integer AS provenance_diff,
      count(*) FILTER (WHERE m.confidence=0.750000)::integer AS medium,
      count(*) FILTER (WHERE m.confidence=0.900000)::integer AS high,
      count(*) FILTER (WHERE m.effective_from='2026-09-28T00:00:00Z' AND m.effective_to IS NULL AND m.mapping_version_number=1)::integer AS temporal_version
    FROM m JOIN regulatory.framework_crosswalks h USING(framework_crosswalk_id)`);
  const result = crosswalk.rows[0];
  const sourceHeaders = new Map(catalog.rows.framework_crosswalks.map((row) => [row.crosswalk_code, row]));
  const sourceMappings = ["normative_unit_crosswalk_mappings", "requirement_crosswalk_mappings", "control_crosswalk_mappings"].flatMap((name) => catalog.rows[name]);
  assert.equal(result.total, 494);
  assert.equal(sourceMappings.filter((row) => row.direction !== sourceHeaders.get(row.crosswalk_code).direction).length, 427);
  assert.equal(result.direction_diff, sourceMappings.filter((row) => row.direction !== catalogHeaderDirection(sourceHeaders.get(row.crosswalk_code).direction)).length);
  assert.equal(result.provenance_diff, 28);
  assert.equal(result.medium, 490);
  assert.equal(result.high, 4);
  assert.equal(result.temporal_version, 494);
  assert.equal(catalog.rows.quarantined_relations.length, 1213);
  const beforeReplay = await snapshot();
  const second = await materializeCatalogV11(client, catalog, actor);
  assert.equal(second.replayed, true);
  assert.equal(await snapshot(), beforeReplay, "second import mutated persisted rows");
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.requirement_control_mappings WHERE mapping_version=2"), 0);
  assert.equal(await scalar("SELECT count(*)::integer AS value FROM regulatory.normative_unit_control_mappings WHERE mapping_version=2"), 0);
  await client.query("BEGIN");
  try {
    await expectConstraint(`INSERT INTO regulatory.normative_units
      (normative_unit_id,created_by_user_identity_id,ownership_class,tenant_id,framework_version_id,parent_normative_unit_id,unit_type,unit_code,title,display_order,source_locator,content_language,content_hash,license_classification,provenance_ref)
      SELECT $1,created_by_user_identity_id,ownership_class,tenant_id,framework_version_id,parent_normative_unit_id,unit_type,unit_code,title,display_order,source_locator,content_language,content_hash,license_classification,provenance_ref
      FROM regulatory.normative_units ORDER BY normative_unit_id LIMIT 1`, [newUuidV7()], "uq_normative_units__framework_version_id_source_locator");
    await expectConstraint(`INSERT INTO regulatory.requirements
      (requirement_id,created_by_user_identity_id,ownership_class,tenant_id,framework_version_id,normative_unit_id,requirement_code,requirement_kind,statement_locator,content_language,licensed_statement,licensed_content_ref,editorial_summary,content_hash,is_mandatory,provenance_ref)
      SELECT $1,created_by_user_identity_id,ownership_class,tenant_id,framework_version_id,normative_unit_id,$2,requirement_kind,statement_locator,content_language,NULL,NULL,'   ',content_hash,is_mandatory,provenance_ref
      FROM regulatory.requirements ORDER BY requirement_id LIMIT 1`, [newUuidV7(), `NEGATIVE-${newUuidV7()}`], "ck_requirements__content_representation");
    await expectConstraint(`INSERT INTO regulatory.requirement_control_mappings
      (requirement_control_mapping_id,created_by_user_identity_id,ownership_class,tenant_id,requirement_id,control_version_id,mapping_version,mapping_type,coverage_contribution,rationale,lifecycle_state,provenance_ref)
      SELECT $1,created_by_user_identity_id,ownership_class,tenant_id,requirement_id,control_version_id,mapping_version,mapping_type,coverage_contribution,rationale,lifecycle_state,provenance_ref
      FROM regulatory.requirement_control_mappings ORDER BY requirement_control_mapping_id LIMIT 1`, [newUuidV7()], "uq_requirement_control_mappings__business_version");
    await expectConstraint(`INSERT INTO regulatory.normative_unit_control_mappings
      (normative_unit_control_mapping_id,created_by_user_identity_id,ownership_class,tenant_id,normative_unit_id,control_version_id,mapping_version,source_locator,rationale,lifecycle_state,provenance_ref)
      SELECT $1,created_by_user_identity_id,ownership_class,tenant_id,normative_unit_id,control_version_id,mapping_version,source_locator,rationale,lifecycle_state,provenance_ref
      FROM regulatory.normative_unit_control_mappings ORDER BY normative_unit_control_mapping_id LIMIT 1`, [newUuidV7()], "uq_normative_unit_control_mappings__business_version");
    for (const [column, value, constraint] of [
      ["direction", "invalid", "ck_nu_xwalk_direction"],
      ["provenance_ref", "   ", "ck_nu_xwalk_provenance"],
      ["mapping_version_number", 0, "ck_nu_xwalk_mapping_version"]
    ]) {
      await expectConstraint(`UPDATE regulatory.normative_unit_crosswalk_mappings SET ${column}=$1 WHERE normative_unit_crosswalk_mapping_id=(SELECT normative_unit_crosswalk_mapping_id FROM regulatory.normative_unit_crosswalk_mappings ORDER BY 1 LIMIT 1)`, [value], constraint);
    }
    await expectConstraint(`UPDATE regulatory.normative_unit_crosswalk_mappings SET effective_to=effective_from WHERE normative_unit_crosswalk_mapping_id=(SELECT normative_unit_crosswalk_mapping_id FROM regulatory.normative_unit_crosswalk_mappings ORDER BY 1 LIMIT 1)`, [], "ck_nu_xwalk_effective_interval");
  } finally {
    await client.query("ROLLBACK");
  }
  assert.equal(await snapshot(), beforeReplay, "negative constraint tests mutated persisted rows");
  const counts = {};
  for (const [schema, table] of tables) counts[table] = await count(schema, table);
  process.stdout.write(`${JSON.stringify({ first, second, counts, source_direction_differences: 427, canonical_direction_differences: result.direction_diff, provenance_differences: 28, confidence_medium: 490, confidence_high: 4, iso_dates: { units: 55, requirements: 7, control_versions: 38 }, quarantine_source: 1213, quarantine_materialized: 0, snapshot: beforeReplay })}\n`);
} finally {
  await client.end();
}
