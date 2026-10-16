import { describe, expect, it } from "vitest";
import { sql, createDatabase } from "../database.js";
import { loadConfig } from "../config.js";
import { newUuidV7 } from "../uuid.js";
import { loadC04wLifecyclePublication, publishC04wLifecycle } from "./c04w-lifecycle-publication.js";
import { IamPublicationService } from "./iam-publication.js";
const enabled = process.env.TCDX_C04W_LIFECYCLE_INTEGRATION === "true";
class RollbackProof extends Error {}
describe.skipIf(!enabled)("C04W canonical lifecycle publication on isolated PG16", () => {
  it("publishes five audited tenant edges, replays exactly and rejects ledger or registry corruption with no grants", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55437"
      || process.env.TCDX_C04W_ISOLATED_REBUILD !== "true") throw Error("C04W_ISOLATED_R2_ONLY");
    const db = createDatabase(loadConfig(process.env));
    const config = await loadC04wLifecyclePublication(process.cwd(), "e7f30ded29f213fa33a8648466b5c7bbfcc6bb520e6cdf2b11968a41d9f6e944");
    try {
      await expect(db.transaction().execute(async tx => {
        const principal = (await sql<{ id: string }>`SELECT service_principal_id::text AS id FROM iam.service_principals
          WHERE lifecycle_state='active' LIMIT 1`.execute(tx)).rows[0];
        if (!principal) throw Error("ISOLATED_PRINCIPAL_MISSING");
        const before = (await sql`SELECT role_permission_id FROM iam.role_permissions ORDER BY role_permission_id`.execute(tx)).rows;
        const service = new IamPublicationService(db, {} as never, {} as never, async () => "");
        const a = service as unknown as { auditOnce: (transaction: typeof tx, sp: string, correlation: string, input: any) => Promise<boolean> };
        const audit = (input: Parameters<Parameters<typeof publishC04wLifecycle>[3]>[0]) => a.auditOnce(tx, principal.id, newUuidV7(), input);
        // The real isolated ledger is 33; fail closed, then model the already-applied QA R2 receipt only inside rollback.
        await expect(publishC04wLifecycle(tx, principal.id, config, audit)).rejects.toMatchObject({ statusCode: 403 });
        const r2 = config.migrations.at(-1)!;
        await sql`INSERT INTO platform.schema_migrations
          (migration_id,filename,content_sha256,transactional,runner_version,started_at,applied_at,duration_ms,outcome)
          VALUES (${r2.id},${r2.filename},${r2.sha256},TRUE,'isolated-rollback-only',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,0,'applied')`.execute(tx);
        expect(await publishC04wLifecycle(tx, principal.id, config, audit)).toEqual({ c04w_lifecycle_registry_rows: 5, c04w_lifecycle_created: 5, c04w_lifecycle_audited: 5 });
        expect(await publishC04wLifecycle(tx, principal.id, config, audit)).toEqual({ c04w_lifecycle_registry_rows: 5, c04w_lifecycle_created: 0, c04w_lifecycle_audited: 0 });
        const edges = (await sql<{ id: string; scope: string; effect_count: number }>`SELECT d.lifecycle_transition_definition_id::text AS id,
          s.scope_kind AS scope,(SELECT count(*)::integer FROM ops_audit.lifecycle_transition_side_effects e
            WHERE e.lifecycle_transition_definition_id=d.lifecycle_transition_definition_id) AS effect_count
          FROM ops_audit.lifecycle_transition_definitions d JOIN ops_audit.lifecycle_transition_scopes s USING(lifecycle_transition_definition_id)
          WHERE d.command_code IN (${sql.join(config.bindings.map(b => b.command_code))})`.execute(tx)).rows;
        expect(edges).toHaveLength(5); expect(edges.every(e => e.scope === "tenant" && e.effect_count === 0)).toBe(true);
        expect((await sql`SELECT role_permission_id FROM iam.role_permissions ORDER BY role_permission_id`.execute(tx)).rows).toEqual(before);
        await sql`UPDATE ops_audit.lifecycle_transition_scopes SET scope_kind='platform'
          WHERE lifecycle_transition_definition_id=${edges[0]!.id}::uuid`.execute(tx);
        await expect(publishC04wLifecycle(tx, principal.id, config, audit)).rejects.toMatchObject({ statusCode: 409 });
        await sql`UPDATE ops_audit.lifecycle_transition_scopes SET scope_kind='tenant'
          WHERE lifecycle_transition_definition_id=${edges[0]!.id}::uuid`.execute(tx);
        await sql`UPDATE ops_audit.audit_events SET after_payload='{}'::jsonb
          WHERE command_code='step6a3C04wLifecyclePublication' AND aggregate_id=${edges[0]!.id}::uuid`.execute(tx);
        await expect(publishC04wLifecycle(tx, principal.id, config, audit)).rejects.toMatchObject({ statusCode: 409 });
        throw new RollbackProof();
      })).rejects.toBeInstanceOf(RollbackProof);
    } finally { await db.destroy(); }
  });
});
