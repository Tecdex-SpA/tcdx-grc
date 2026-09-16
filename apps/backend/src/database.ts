import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { BackendConfig } from "./config.js";

export type FoundationDatabase = Record<string, never>;

export function createDatabase(config: BackendConfig): Kysely<FoundationDatabase> {
  const pool = new pg.Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    ...(config.database.password ? { password: config.database.password } : {}),
    ssl: config.database.sslMode === "disable" ? false : { rejectUnauthorized: config.database.sslMode !== "no-verify" },
    max: 20
  });
  return new Kysely<FoundationDatabase>({ dialect: new PostgresDialect({ pool }) });
}

export async function databaseReady(database: Kysely<FoundationDatabase>): Promise<boolean> {
  try {
    const result = await sql<{ database_name: string; major: number }>`
      SELECT current_database() AS database_name,
             current_setting('server_version_num')::integer / 10000 AS major
    `.execute(database);
    return result.rows[0]?.database_name === "tcdx-grc" && result.rows[0]?.major === 16;
  } catch {
    return false;
  }
}
