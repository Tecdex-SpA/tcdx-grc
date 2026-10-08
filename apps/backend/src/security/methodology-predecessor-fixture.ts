import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../database.js";

export async function restorePreMethodologyFixture(tx: Transaction<FoundationDatabase>): Promise<void> {
  if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" || process.env.TCDX_ISOLATED_REBUILD !== "true") throw new Error("HISTORICAL_FIXTURE_REQUIRES_ISOLATED_DATABASE");
  await sql`DELETE FROM iam.role_permissions WHERE permission_id IN (SELECT permission_id FROM iam.permissions WHERE permission_code IN ('compliance.methodology.read','controls.methodology.read'))`.execute(tx);
  await sql`DELETE FROM iam.permissions WHERE permission_code IN ('compliance.methodology.read','controls.methodology.read')`.execute(tx);
  await sql`DELETE FROM platform.schema_migrations WHERE migration_id='20261007000200'`.execute(tx);
  await sql`ALTER TABLE regulatory.requirement_assessments DROP CONSTRAINT fk_cm_assessment_method`.execute(tx);
  await sql`ALTER TABLE controls.control_assessments DROP CONSTRAINT fk_cem_assessment_method`.execute(tx);
  await sql`DROP TRIGGER phase5_method_formula_immutable ON data.formula_definitions`.execute(tx);
  await sql`DROP FUNCTION data.preserve_phase5_published_method_formula()`.execute(tx);
  await sql`DROP TABLE regulatory.compliance_methodologies`.execute(tx);
  await sql`DROP TABLE controls.control_effectiveness_methodologies`.execute(tx);
  await sql`DROP FUNCTION regulatory.cm_preserve_published_methodology()`.execute(tx);
  await sql`DROP FUNCTION controls.cem_preserve_published_methodology()`.execute(tx);
}
