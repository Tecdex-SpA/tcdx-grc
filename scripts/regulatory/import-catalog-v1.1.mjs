import pg from "pg";
import { resolve } from "node:path";
import { loadCatalogV11, materializeCatalogV11 } from "../../apps/backend/dist/regulatory/catalog-v1.1.js";

const actorId = process.env.CATALOG_IMPORT_ACTOR_USER_IDENTITY_ID;
if (!actorId) throw new Error("CATALOG_IMPORT_ACTOR_USER_IDENTITY_ID is required");
const directory = resolve("data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1");
const catalog = loadCatalogV11(directory);
const client = new pg.Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL_MODE === "require" ? { rejectUnauthorized: true } : false
});
await client.connect();
try {
  const result = await materializeCatalogV11(client, catalog, actorId);
  process.stdout.write(`${JSON.stringify({ catalog: "v1.1", files_verified: catalog.manifest.files.length, ...result })}\n`);
} finally {
  await client.end();
}
