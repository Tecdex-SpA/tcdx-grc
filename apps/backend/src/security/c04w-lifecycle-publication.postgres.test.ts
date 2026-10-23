import {readFile,mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,dirname} from "node:path";
import {tmpdir} from "node:os";
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
    // Exact historical snapshot verified against the sealed manifest hash. The
    // operational loader still rejects the current 36-row dependency unchanged.
    const root=await mkdtemp(join(tmpdir(),'tcdx-c04w-authority-'));
    const path='docs/executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10/PUBLICATION_MANIFEST.json';
    const manifest=JSON.parse(await readFile(path,'utf8'));
    const paths=new Set<string>([path,...manifest.human_decisions.map((d:{path:string})=>d.path),...manifest.files.flatMap((f:{source:string;successor_path:string})=>[f.source,f.successor_path]),'docs/physical-data-model/amendments/STEP_6A3_C04W_v1.10/CONTRACT_PUBLICATION_RECEIPT.json','docs/executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10/CONTRACT_PUBLICATION_RECEIPT.json']);
    for(const file of paths){await mkdir(dirname(join(root,file)),{recursive:true});await writeFile(join(root,file),await readFile(file));}
    const ledger=JSON.parse(await readFile('database/migrations/manifest.json','utf8'));ledger.migrations=ledger.migrations.slice(0,34);
    const bytes=JSON.stringify(ledger,null,2)+'\n';expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.dependencies.find((d:{path:string})=>d.path==='database/migrations/manifest.json').sha256);
    await mkdir(join(root,'database/migrations'),{recursive:true});await writeFile(join(root,'database/migrations/manifest.json'),bytes);
    const config=await loadC04wLifecyclePublication(root,"e7f30ded29f213fa33a8648466b5c7bbfcc6bb520e6cdf2b11968a41d9f6e944");
    try {
      await expect(db.transaction().execute(async tx => {
        const principal = (await sql<{ id: string }>`SELECT service_principal_id::text AS id FROM iam.service_principals
          WHERE lifecycle_state='active' LIMIT 1`.execute(tx)).rows[0];
        if (!principal) throw Error("ISOLATED_PRINCIPAL_MISSING");
        const before = (await sql`SELECT role_permission_id FROM iam.role_permissions ORDER BY role_permission_id`.execute(tx)).rows;
        const service = new IamPublicationService(db, {} as never, {} as never, async () => "");
        const a = service as unknown as { auditOnce: (transaction: typeof tx, sp: string, correlation: string, input: any) => Promise<boolean> };
        const audit = (input: Parameters<Parameters<typeof publishC04wLifecycle>[3]>[0]) => a.auditOnce(tx, principal.id, newUuidV7(), input);
        // Real migration 34 is applied by the runner; a mismatched configuration must fail closed.
        await expect(publishC04wLifecycle(tx, principal.id, {...config,migrations:config.migrations.slice(0,-1)}, audit)).rejects.toMatchObject({statusCode:403});
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
    } finally { await db.destroy();await rm(root,{recursive:true,force:true}); }
  });
});
