import { readFileSync } from "node:fs";
import { sql, type Transaction } from "kysely";
import type { FoundationDatabase } from "../../database.js";

/** Test-only predecessor catalog fixture, enclosed by the caller's rollback transaction.
 * Later published permissions/ledger rows must be peeled before replaying an immutable
 * DATA-ONLY historical migration. The production migration's exact gates remain intact.
 * Configuration constraints are unchanged on both sides of these catalog-only tests.
 */
export async function predecessorReferenceCatalog(transaction:Transaction<FoundationDatabase>):Promise<void> {
 const manifest=JSON.parse(readFileSync(new URL("../../../../../docs/executable-contracts/29_PHASE6A3_RBAC_MANIFEST.json",import.meta.url),"utf8")) as {permission_codes:string[]};
 const ids=["20261009000100","20261009000200"];
 const applied=await sql<{n:string}>`SELECT count(*)::text AS n FROM platform.schema_migrations WHERE migration_id=ANY(${ids}::text[]) AND outcome='applied'`.execute(transaction);
 if(applied.rows[0]?.n==='0') return;
 if(applied.rows[0]?.n!=='2' || manifest.permission_codes.length!==3) throw new Error('Unexpected successor catalog fixture');
 await sql`DELETE FROM iam.role_permissions WHERE permission_id IN(SELECT permission_id FROM iam.permissions WHERE permission_code=ANY(${manifest.permission_codes}::text[]))`.execute(transaction);
 await sql`DELETE FROM iam.permissions WHERE permission_code=ANY(${manifest.permission_codes}::text[])`.execute(transaction);
 await sql`DELETE FROM platform.schema_migrations WHERE migration_id=ANY(${ids}::text[])`.execute(transaction);
}
