import { describe, expect, it } from "vitest";
import { sql, createDatabase } from "../database.js";
import { loadConfig } from "../config.js";
import { newUuidV7 } from "../uuid.js";
import { IamPublicationService } from "./iam-publication.js";

const enabled = process.env.TCDX_C04W_RBAC_INTEGRATION === "true";
class RollbackProof extends Error {}

describe.skipIf(!enabled)("C-04W approved tenant role publication on isolated PostgreSQL", () => {
  it("creates only approved tenant grants, audits them, and replays without duplication", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55437"
      || process.env.TCDX_C04W_ISOLATED_REBUILD !== "true") throw new Error("C04W_ISOLATED_R2_ONLY");
    const db = createDatabase(loadConfig(process.env));
    try {
      await expect(db.transaction().execute(async tx => {
        const tenant = (await sql<{ id: string }>`SELECT tenant_id::text AS id FROM platform.tenants ORDER BY tenant_id LIMIT 1`.execute(tx)).rows[0];
        const principal = (await sql<{ id: string }>`SELECT service_principal_id::text AS id FROM iam.service_principals
          WHERE lifecycle_state='active' LIMIT 1`.execute(tx)).rows[0];
        if (!tenant || !principal) throw new Error("ISOLATED_FIXTURE_MISSING");
        const roleIds = { TENANT_ADMIN: newUuidV7(), LEGAL_REVIEWER: newUuidV7() };
        for (const [code, id] of Object.entries(roleIds)) {
          await sql`INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
            VALUES (${id}::uuid,'TENANT_OWNED',${tenant.id}::uuid,${code},${code},TRUE,'published')`.execute(tx);
        }
        expect((await sql<{n:number}>`SELECT count(*)::int AS n FROM platform.schema_migrations WHERE outcome='applied'`.execute(tx)).rows[0]?.n).toBe(34);
        const service = new IamPublicationService(db, {} as never, {} as never, async () => "");
        const publish = service as unknown as { publishC04wRolePermissions: (
          transaction: typeof tx, principalId: string, correlationId: string
        ) => Promise<{ c04w_tenants: number; c04w_permission_created: number;
          c04w_grants_created: number; c04w_grants_audited: number }> };
        const first = await publish.publishC04wRolePermissions(tx, principal.id, newUuidV7());
        expect(first).toEqual({ c04w_tenants: 1, c04w_permission_created: 1,
          c04w_grants_created: 10, c04w_grants_audited: 10 });
        const second = await publish.publishC04wRolePermissions(tx, principal.id, newUuidV7());
        expect(second).toEqual({ c04w_tenants: 1, c04w_permission_created: 0,
          c04w_grants_created: 0, c04w_grants_audited: 0 });
        const rows = (await sql<{ role_code: string; count: number }>`SELECT r.role_code,count(*)::integer AS count
          FROM iam.role_permissions rp JOIN iam.roles r USING(role_id)
          WHERE rp.tenant_id=${tenant.id}::uuid AND r.role_id IN (${roleIds.TENANT_ADMIN}::uuid,${roleIds.LEGAL_REVIEWER}::uuid)
          GROUP BY r.role_code ORDER BY r.role_code`.execute(tx)).rows;
        expect(rows).toEqual([{ role_code: "LEGAL_REVIEWER", count: 1 }, { role_code: "TENANT_ADMIN", count: 9 }]);
        const forbidden = (await sql<{ count: number }>`SELECT count(*)::integer AS count FROM iam.role_permissions rp
          JOIN iam.permissions p USING(permission_id) WHERE p.permission_code='privacy.retention_policy.legal_hold.release'
            AND (rp.ownership_class<>'TENANT_OWNED' OR rp.role_id<>${roleIds.LEGAL_REVIEWER}::uuid)`.execute(tx)).rows[0];
        expect(forbidden?.count).toBe(0);
        throw new RollbackProof();
      })).rejects.toBeInstanceOf(RollbackProof);
    } finally { await db.destroy(); }
  });
});
