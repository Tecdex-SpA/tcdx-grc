import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, readJson, repositoryRoot } from "./db.ts";

type ExpectedColumn = { name: string; type: string; nullable: boolean; default: string | null };
type ExpectedTable = { name: string; profile: string; primaryKey: string[]; columns: ExpectedColumn[]; checks: string[]; uniqueConstraints: string[][] };
type Inventory = { tableCount: number; tables: ExpectedTable[] };

const expected = readJson<Inventory>("database/expected-schema.json");
const controlledSchemas = [...new Set(expected.tables.map((table) => table.name.split(".")[0]))];

function normalizedType(value: string): string {
  return value
    .replace(/^character varying/, "varchar")
    .replace(/^character\((\d+)\)$/, "char($1)")
    .replace(/^timestamp with time zone$/, "timestamptz")
    .replace(/^timestamp without time zone$/, "timestamp")
    .replace(/^time without time zone$/, "time")
    .replace(/^numeric\((\d+),(\d+)\)$/, "numeric($1,$2)");
}

function normalizedDefault(value: string | null): string | null {
  if (value === null) return null;
  if (value === "empty_object") return "{}";
  return value
    .replace(/::(?:character varying|text|jsonb|boolean|bigint|integer)$/g, "")
    .replace(/^'(.*)'$/, "$1");
}

function expectedNames(pattern: RegExp, relativePath: string): Set<string> {
  const sql = readFileSync(resolve(repositoryRoot, relativePath), "utf8");
  return new Set([...sql.matchAll(pattern)].map((match) => match[1]));
}

const expectedConstraints = new Set([
  ...expectedNames(/ADD CONSTRAINT "([^"]+)" (?:CHECK|UNIQUE|FOREIGN KEY)/g, "database/migrations/20260916000600_constraints_and_uniqueness.sql"),
  ...expectedNames(/ADD CONSTRAINT "([^"]+)" (?:CHECK|UNIQUE|FOREIGN KEY)/g, "database/migrations/20260916000700_foreign_keys.sql"),
  ...expectedNames(/ADD CONSTRAINT "([^"]+)" (?:CHECK|UNIQUE|FOREIGN KEY)/g, "database/migrations/20260916001000_pre_f4_integrated_audit_model.sql")
]);
expectedConstraints.delete("fk_audits__lead_membership_id");
const expectedIndexes = new Set([
  ...expectedNames(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g, "database/migrations/20260916000800_required_indexes.sql"),
  ...expectedNames(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g, "database/migrations/20260916001000_pre_f4_integrated_audit_model.sql")
]);
expectedIndexes.delete("ix_audits__lead_membership_id");

const client = createClient();
await client.connect();
const mismatches: string[] = [];
try {
  const identity = await client.query<{ database_name: string; major: number }>("SELECT current_database() AS database_name, current_setting('server_version_num')::integer / 10000 AS major");
  const actualDatabaseName = identity.rows[0]?.database_name ?? "";
  const isolatedRestoreTarget = process.env.TCDX_ISOLATED_RESTORE_TEST === "true"
    && process.env.DATABASE_HOST === "127.0.0.1"
    && process.env.DATABASE_PORT === "55432"
    && actualDatabaseName.startsWith("tcdx_grc_restore_");
  if (actualDatabaseName !== "tcdx-grc" && !isolatedRestoreTarget) mismatches.push("database-name");
  if (identity.rows[0]?.major !== 16) mismatches.push("postgres-major");

  const schemaRows = await client.query<{ schema_name: string }>("SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1::text[])", [controlledSchemas]);
  const actualSchemas = new Set(schemaRows.rows.map((row) => row.schema_name));
  for (const schema of controlledSchemas) if (!actualSchemas.has(schema)) mismatches.push(`missing-schema:${schema}`);

  const tableRows = await client.query<{ name: string }>("SELECT schemaname || '.' || tablename AS name FROM pg_catalog.pg_tables WHERE schemaname = ANY($1::text[]) ORDER BY 1", [controlledSchemas]);
  const actualTables = new Set(tableRows.rows.map((row) => row.name));
  const allowedTables = new Set([...expected.tables.map((table) => table.name), "platform.schema_migrations"]);
  for (const table of allowedTables) if (!actualTables.has(table)) mismatches.push(`missing-table:${table}`);
  for (const table of actualTables) if (!allowedTables.has(table)) mismatches.push(`unexpected-table:${table}`);

  const columns = await client.query<{ table_name: string; column_name: string; data_type: string; not_null: boolean; column_default: string | null }>(`
    SELECT n.nspname || '.' || c.relname AS table_name, a.attname AS column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type, a.attnotnull AS not_null,
           pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS column_default
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE c.relkind = 'r' AND n.nspname = ANY($1::text[]) AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY 1, a.attnum`, [controlledSchemas]);
  const byTable = new Map<string, Map<string, { type: string; nullable: boolean; default: string | null }>>();
  for (const row of columns.rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Map());
    byTable.get(row.table_name)!.set(row.column_name, { type: normalizedType(row.data_type), nullable: !row.not_null, default: normalizedDefault(row.column_default) });
  }
  for (const table of expected.tables) {
    const actual = byTable.get(table.name) ?? new Map();
    for (const column of table.columns) {
      const found = actual.get(column.name);
      if (!found) mismatches.push(`missing-column:${table.name}.${column.name}`);
      else {
        if (found.type !== normalizedType(column.type)) mismatches.push(`type:${table.name}.${column.name}:${found.type}:${column.type}`);
        if (found.nullable !== column.nullable) mismatches.push(`nullability:${table.name}.${column.name}`);
        if (found.default !== normalizedDefault(column.default)) mismatches.push(`default:${table.name}.${column.name}:${found.default}:${column.default}`);
      }
    }
    for (const column of actual.keys()) if (!table.columns.some((item) => item.name === column)) mismatches.push(`unexpected-column:${table.name}.${column}`);
  }

  const constraints = await client.query<{ constraint_name: string }>(`
    SELECT con.conname AS constraint_name
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = ANY($1::text[])`, [controlledSchemas]);
  const actualConstraints = new Set(constraints.rows.map((row) => row.constraint_name));
  for (const name of expectedConstraints) if (!actualConstraints.has(name)) mismatches.push(`missing-constraint:${name}`);

  const keyedConstraints = await client.query<{ table_name: string; constraint_type: string; columns: string[]; nulls_not_distinct: boolean }>(`
    SELECT n.nspname || '.' || c.relname AS table_name, con.contype AS constraint_type,
           array_agg(a.attname ORDER BY key.ord)::text[] AS columns,
           COALESCE(i.indnullsnotdistinct, false) AS nulls_not_distinct
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class c ON c.oid=con.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_catalog.pg_index i ON i.indexrelid=con.conindid
      JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS key(attnum,ord) ON true
      JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum
     WHERE n.nspname=ANY($1::text[]) AND con.contype IN ('p','u')
     GROUP BY n.nspname,c.relname,con.oid,con.contype,i.indnullsnotdistinct`, [controlledSchemas]);
  const keysByTable = new Map<string, typeof keyedConstraints.rows>();
  for (const row of keyedConstraints.rows) {
    if (!keysByTable.has(row.table_name)) keysByTable.set(row.table_name, []);
    keysByTable.get(row.table_name)!.push(row);
  }
  for (const table of expected.tables) {
    const actualKeys = keysByTable.get(table.name) ?? [];
    if (!actualKeys.some((key) => key.constraint_type === "p" && JSON.stringify(key.columns) === JSON.stringify(table.primaryKey)))
      mismatches.push(`primary-key:${table.name}`);
    for (const expectedUnique of table.uniqueConstraints) {
      const actualUnique = actualKeys.find((key) => key.constraint_type === "u" && JSON.stringify(key.columns) === JSON.stringify(expectedUnique));
      if (!actualUnique) mismatches.push(`unique:${table.name}:${expectedUnique.join(",")}`);
      else if (expectedUnique.includes("tenant_id") && !actualUnique.nulls_not_distinct)
        mismatches.push(`unique-null-semantics:${table.name}:${expectedUnique.join(",")}`);
    }
  }

  const constraintCounts = await client.query<{ constraint_type: string; count: string }>(`
    SELECT contype AS constraint_type, count(*)::text AS count
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class c ON c.oid=con.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=ANY($1::text[]) GROUP BY contype`, [controlledSchemas]);
  const countsByType = Object.fromEntries(constraintCounts.rows.map((row) => [row.constraint_type, Number(row.count)]));

  const indexes = await client.query<{ indexname: string }>("SELECT indexname FROM pg_catalog.pg_indexes WHERE schemaname = ANY($1::text[])", [controlledSchemas]);
  const actualIndexes = new Set(indexes.rows.map((row) => row.indexname));
  for (const name of expectedIndexes) if (!actualIndexes.has(name)) mismatches.push(`missing-index:${name}`);

  const cascade = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class c ON c.oid=con.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE con.contype='f' AND con.confdeltype='c' AND n.nspname=ANY($1::text[])", [controlledSchemas]);
  if (Number(cascade.rows[0]?.count) !== 0) mismatches.push("forbidden-on-delete-cascade");

  const tenantTables = expected.tables.filter((table) => table.columns.some((column) => column.name === "tenant_id") && table.name !== "platform.tenants");
  const tenantFks = await client.query<{ table_name: string }>(`
    SELECT n.nspname || '.' || c.relname AS table_name
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class c ON c.oid=con.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_catalog.pg_class p ON p.oid=con.confrelid
      JOIN pg_catalog.pg_namespace pn ON pn.oid=p.relnamespace
     WHERE con.contype='f' AND pn.nspname='platform' AND p.relname='tenants'`, []);
  const tenantFkTables = new Set(tenantFks.rows.map((row) => row.table_name));
  for (const table of tenantTables) if (!tenantFkTables.has(table.name)) mismatches.push(`missing-tenant-fk:${table.name}`);

  const tenantRelationFks = await client.query<{ child_table: string; parent_table: string; child_columns: string[]; parent_columns: string[] }>(`
    SELECT cn.nspname||'.'||c.relname AS child_table, pn.nspname||'.'||p.relname AS parent_table,
           array_agg(ca.attname ORDER BY key.ord)::text[] AS child_columns,
           array_agg(pa.attname ORDER BY key.ord)::text[] AS parent_columns
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class c ON c.oid=con.conrelid
      JOIN pg_catalog.pg_namespace cn ON cn.oid=c.relnamespace
      JOIN pg_catalog.pg_class p ON p.oid=con.confrelid
      JOIN pg_catalog.pg_namespace pn ON pn.oid=p.relnamespace
      JOIN LATERAL unnest(con.conkey,con.confkey) WITH ORDINALITY AS key(child_attnum,parent_attnum,ord) ON true
      JOIN pg_catalog.pg_attribute ca ON ca.attrelid=c.oid AND ca.attnum=key.child_attnum
      JOIN pg_catalog.pg_attribute pa ON pa.attrelid=p.oid AND pa.attnum=key.parent_attnum
     WHERE con.contype='f' AND cn.nspname=ANY($1::text[])
     GROUP BY cn.nspname,c.relname,pn.nspname,p.relname,con.oid`, [controlledSchemas]);
  const expectedByName = new Map(expected.tables.map((table) => [table.name, table]));
  for (const fk of tenantRelationFks.rows) {
    const child = expectedByName.get(fk.child_table);
    const parent = expectedByName.get(fk.parent_table);
    if (!child?.columns.some((column) => column.name === "tenant_id") || !parent || !["TM", "TI", "TV"].includes(parent.profile)) continue;
    if (fk.child_columns[0] !== "tenant_id" || fk.parent_columns[0] !== "tenant_id")
      mismatches.push(`non-composite-tenant-fk:${fk.child_table}:${fk.parent_table}:${fk.child_columns.join(",")}`);
  }

  const owners = await client.query<{ owner_name: string }>(`
    SELECT DISTINCT pg_catalog.pg_get_userbyid(c.relowner) AS owner_name
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE c.relkind='r' AND n.nspname=ANY($1::text[])`, [controlledSchemas]);
  if (owners.rows.length !== 1) mismatches.push(`table-owner-divergence:${owners.rows.map((row) => row.owner_name).join(",")}`);

  const summary = {
    database: identity.rows[0]?.database_name,
    postgresMajor: identity.rows[0]?.major,
    expectedPhysicalTables: expected.tableCount,
    actualPhysicalTables: [...actualTables].filter((name) => name !== "platform.schema_migrations").length,
    expectedColumns: expected.tables.reduce((sum, table) => sum + table.columns.length, 0),
    expectedConstraints: expectedConstraints.size,
    expectedRequiredIndexes: expectedIndexes.size,
    tenantScopedTables: tenantTables.length,
    primaryKeys: countsByType.p ?? 0,
    uniqueConstraints: countsByType.u ?? 0,
    checkConstraints: countsByType.c ?? 0,
    foreignKeys: countsByType.f ?? 0,
    compositeTenantForeignKeys: tenantRelationFks.rows.filter((fk) => fk.child_columns[0] === "tenant_id" && fk.parent_columns[0] === "tenant_id").length,
    tableOwners: owners.rows.map((row) => row.owner_name),
    forbiddenDeleteCascades: Number(cascade.rows[0]?.count ?? 0),
    schemaMismatches: mismatches.length,
    mismatches
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (mismatches.length) process.exitCode = 1;
} finally {
  await client.end();
}
