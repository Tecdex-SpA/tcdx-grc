import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { PlatformRoleService } from "./platform-role-service.js";

describe.skipIf(process.env.TCDX_SECURITY_INTEGRATION !== 'true')('P2E isolated PostgreSQL target/canonical catalog projections', () => {
  it('proves lifecycle, server refresh, exact revoke ID, catalog eligibility, default DENY and zero read side effects', async () => {
    if (process.env.DATABASE_HOST !== '127.0.0.1' || process.env.DATABASE_PORT !== '55432'
      || process.env.TCDX_ISOLATED_REBUILD !== 'true' || process.env.DATABASE_NAME !== 'tcdx-grc') throw new Error('P2E_REQUIRES_ISOLATED_LOCAL_POSTGRES');
    const db = createDatabase(loadConfig(process.env));
    const ids = { actor: newUuidV7(), target: newUuidV7(), empty: newUuidV7(), outsider: newUuidV7(),
      tenant: newUuidV7(), membership: newUuidV7(), memberRole: newUuidV7(), tenantRole: newUuidV7(), customRole: newUuidV7() };
    const identity = (principalId: string) => ({ principalClass: 'HUMAN_INTERACTIVE' as const, principalId,
      tokenId: newUuidV7(), expiresAt: new Date(Date.now()+60000) });
    const service = new PlatformRoleService(db);
    let app: ReturnType<typeof buildApp> | undefined;
    const url = `/api/v1/platform/user-identities/${ids.target}/platform-roles`;
    const catalog = '/api/v1/roles?assignable_family=platform';
    const headers = { authorization: 'Bearer actor-fixture' };
    try {
      const roles = await sql<{ role_id: string; role_code: string; name: string }>`SELECT role_id,role_code,name FROM iam.roles
        WHERE ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL AND is_baseline
          AND role_code IN ('PLATFORM_ADMIN','PLATFORM_SUPPORT','TENANT_ADMIN')`.execute(db);
      const ref = (code: string) => roles.rows.find(r => r.role_code===code)!;
      await sql`INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
        VALUES (${ids.actor}::uuid,${'local-p2e:'+ids.actor},'Local P2E actor','active'),
          (${ids.target}::uuid,${'local-p2e:'+ids.target},'Local P2E target','active'),
          (${ids.empty}::uuid,${'local-p2e:'+ids.empty},'Local P2E empty','inactive'),
          (${ids.outsider}::uuid,${'local-p2e:'+ids.outsider},'Local P2E tenant actor','active')`.execute(db);
      await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
        VALUES (${ids.tenant}::uuid,${'P2E-'+ids.tenant},'Local P2E','Local P2E','America/Santiago','active','confidential')`.execute(db);
      await sql`INSERT INTO iam.roles (role_id,ownership_class,tenant_id,role_code,name,is_baseline,lifecycle_state)
        VALUES (${ids.tenantRole}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,'TENANT_ADMIN','Tenant Admin',false,'published'),
        (${ids.customRole}::uuid,'PLATFORM_CONTROL',NULL,${'P2E_OTHER_'+ids.customRole},'Nonfamily catalog fixture',true,'published')`.execute(db);
      await sql`INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at)
        VALUES (${ids.membership}::uuid,${ids.tenant}::uuid,${ids.outsider}::uuid,'active',transaction_timestamp())`.execute(db);
      await sql`INSERT INTO iam.membership_roles (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
        VALUES (${ids.memberRole}::uuid,${ids.tenant}::uuid,${ids.membership}::uuid,${ids.tenantRole}::uuid,'tenant',transaction_timestamp())`.execute(db);
      // Even tenant-owned grants to the same permission cannot supply platform authority.
      await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
        SELECT ${newUuidV7()}::uuid,'TENANT_OWNED',${ids.tenant}::uuid,${ids.tenantRole}::uuid,permission_id
        FROM iam.permissions WHERE permission_code='platform.role.administer'`.execute(db);
      const adminAssignment = newUuidV7(), activeAdmin = newUuidV7(), activeSupport = newUuidV7(), revoked = newUuidV7();
      await sql`INSERT INTO iam.platform_role_assignments (platform_role_assignment_id,ownership_class,user_identity_id,role_id,valid_from,valid_to)
        VALUES (${adminAssignment}::uuid,'PLATFORM_CONTROL',${ids.actor}::uuid,${ref('PLATFORM_ADMIN').role_id}::uuid,transaction_timestamp()-interval '1 hour',NULL),
          (${activeAdmin}::uuid,'PLATFORM_CONTROL',${ids.target}::uuid,${ref('PLATFORM_ADMIN').role_id}::uuid,transaction_timestamp()-interval '1 hour',NULL),
          (${activeSupport}::uuid,'PLATFORM_CONTROL',${ids.target}::uuid,${ref('PLATFORM_SUPPORT').role_id}::uuid,transaction_timestamp()-interval '1 hour',transaction_timestamp()+interval '1 day'),
          (${revoked}::uuid,'PLATFORM_CONTROL',${ids.target}::uuid,${ref('PLATFORM_SUPPORT').role_id}::uuid,transaction_timestamp()-interval '2 days',transaction_timestamp()-interval '1 day'),
          (${newUuidV7()}::uuid,'PLATFORM_CONTROL',${ids.target}::uuid,${ref('PLATFORM_SUPPORT').role_id}::uuid,transaction_timestamp()+interval '2 days',transaction_timestamp()+interval '3 days'),
          (${newUuidV7()}::uuid,'PLATFORM_CONTROL',${ids.target}::uuid,${ref('TENANT_ADMIN').role_id}::uuid,transaction_timestamp()-interval '1 hour',NULL),
          (${newUuidV7()}::uuid,'PLATFORM_CONTROL',${ids.target}::uuid,${ids.customRole}::uuid,transaction_timestamp()-interval '1 hour',NULL)`.execute(db);
      app = buildApp(async () => true, { database: db, fileStorage: new UnavailableFileStoragePort(), identityVerifier: {
        verifyBearerToken: async token => identity(token==='actor-fixture' ? ids.actor : ids.outsider)
      } });
      // Fingerprint every canonical table, including grants/history/audit/idempotency.
      const snapshot = async () => {
        const tables = await sql<{ table_schema: string; table_name: string }>`SELECT table_schema,table_name FROM information_schema.tables
          WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2`.execute(db);
        const hashes: Record<string,string> = {};
        for (const table of tables.rows) {
          const key = `${table.table_schema}.${table.table_name}`;
          const fingerprint = await sql<{ hash: string }>`SELECT md5(coalesce(string_agg(value,E'\n' ORDER BY value),'')) AS hash
            FROM (SELECT row_to_json(t)::text AS value FROM ${sql.table(key)} t) rows`.execute(db);
          hashes[key] = fingerprint.rows[0]!.hash;
        }
        return hashes;
      };
      const before = await snapshot();
      const response = await app.inject({ url, headers });
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.json().items.map((r: { role_code: string }) => r.role_code)).toEqual(['PLATFORM_ADMIN','PLATFORM_SUPPORT']);
      expect(response.json().items[1]).toMatchObject({ platform_role_assignment_id: activeSupport,
        user_identity_id: ids.target, role_code: 'PLATFORM_SUPPORT', role_name: ref('PLATFORM_SUPPORT').name });
      expect(response.json().items[1].valid_to).not.toBeNull();
      expect(response.json().items.map((r: { platform_role_assignment_id: string }) => r.platform_role_assignment_id)).toEqual([activeAdmin,activeSupport]);
      expect((await sql`SELECT valid_to FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${revoked}::uuid`.execute(db)).rows).toHaveLength(1);
      expect(Object.keys(response.json().items[1]).sort()).toEqual(['platform_role_assignment_id','user_identity_id','role_code','role_name','valid_from','valid_to'].sort());
      expect(response.body).not.toMatch(/TENANT_ADMIN|P2E_OTHER|membership|secret|identity_key|keycloak/i);
      expect((await app.inject({ url: url.replace(ids.target,ids.empty), headers })).json()).toEqual({ items: [] });
      expect((await app.inject({ url: url.replace(ids.target,newUuidV7()), headers })).statusCode).toBe(404);
      expect((await app.inject({ url, headers: { authorization: 'Bearer tenant-fixture' } })).statusCode).toBe(403);
      expect((await app.inject({ url })).statusCode).toBe(401);
      expect((await app.inject({ url, headers: { ...headers,'x-tcdx-tenant-id': ids.tenant } })).statusCode).toBe(403);
      expect((await app.inject({ url: url+'?tenant_id='+ids.tenant, headers })).statusCode).toBe(400);
      expect((await app.inject({ method:'GET',url,headers,payload:{ tenant_id: ids.tenant } })).statusCode).toBe(400);
      const catalogResponse = await app.inject({ url: catalog, headers });
      expect(catalogResponse.statusCode).toBe(200);
      expect(catalogResponse.json().items.map((r: { role_code: string })=>r.role_code).sort()).toEqual(['PLATFORM_ADMIN','PLATFORM_SUPPORT']);
      expect(catalogResponse.json().items.every((r: Record<string,unknown>)=>r.is_baseline && r.lifecycle_state==='published' && r.tenant_id===null && r.ownership_class==='PLATFORM_CONTROL')).toBe(true);
      expect((await app.inject({ url:catalog, headers: { authorization: 'Bearer tenant-fixture' } })).statusCode).toBe(403);
      expect((await app.inject({ url:catalog, headers: { ...headers,'x-tcdx-tenant-id':ids.tenant } })).statusCode).toBe(403);
      expect((await app.inject({ url:catalog+'&tenant_id='+ids.tenant, headers })).statusCode).toBe(400);
      const page = await app.inject({ url: catalog+'&page[size]=1',headers });
      expect(page.json().items).toHaveLength(1); expect(page.json().page.has_more).toBe(true);
      const next = await app.inject({ url: catalog+'&page[size]=1&page[cursor]='+page.json().page.next_cursor,headers });
      expect(next.statusCode).toBe(200); expect(next.json().page.has_more).toBe(false);
      expect(next.json().items[0].role_code).not.toBe(page.json().items[0].role_code);
      expect((await app.inject({ url:'/api/v1/roles?page[cursor]='+page.json().page.next_cursor,headers })).statusCode).toBe(400);
      expect((await app.inject({ url:'/api/v1/roles',headers })).json().items.some((r:{role_code:string})=>r.role_code==='TENANT_ADMIN')).toBe(true);
      expect(await snapshot()).toEqual(before);
      // Eligibility comes from canonical runtime publication metadata, not a hardcoded option.
      await sql`UPDATE iam.roles SET lifecycle_state='draft' WHERE role_id=${ref('PLATFORM_SUPPORT').role_id}::uuid`.execute(db);
      expect((await app.inject({ url:catalog,headers })).json().items.map((r:{role_code:string})=>r.role_code)).toEqual(['PLATFORM_ADMIN']);
      // Still report active interval when metadata changes, not silently hide the assignment.
      expect((await app.inject({url,headers})).json().items).toHaveLength(2);
      await sql`UPDATE iam.roles SET lifecycle_state='published',is_baseline=false WHERE role_id=${ref('PLATFORM_SUPPORT').role_id}::uuid`.execute(db);
      expect((await app.inject({ url:catalog,headers })).json().items.map((r:{role_code:string})=>r.role_code)).toEqual(['PLATFORM_ADMIN']);
      await sql`UPDATE iam.roles SET is_baseline=true WHERE role_id=${ref('PLATFORM_SUPPORT').role_id}::uuid`.execute(db);
      const actor = await resolvePlatformActor(db,identity(ids.actor));
      const exact = response.json().items[1].platform_role_assignment_id;
      await service.revoke(actor,ids.target,exact,{reason:'Isolated P2E exact projection revoke verification'},newUuidV7(),newUuidV7());
      expect((await app.inject({url,headers})).json().items.map((r:{role_code:string})=>r.role_code)).toEqual(['PLATFORM_ADMIN']);
      expect((await sql`SELECT valid_to FROM iam.platform_role_assignments WHERE platform_role_assignment_id=${exact}::uuid`.execute(db)).rows).toHaveLength(1);
      const created = await service.assign(actor,ids.empty,{role_code:'PLATFORM_SUPPORT',reason:'Isolated P2E refresh verification'},newUuidV7(),newUuidV7()).catch(error=>{
        // Read supports inactive targets; assign lifecycle must remain unchanged.
        expect(error.code).toBe('TCDX.LIFECYCLE.TRANSITION_DENIED'); return undefined;
      });
      expect(created).toBeUndefined();
      await sql`UPDATE iam.user_identities SET lifecycle_state='active' WHERE user_identity_id=${ids.empty}::uuid`.execute(db);
      const assigned = await service.assign(actor,ids.empty,{role_code:'PLATFORM_SUPPORT',reason:'Isolated P2E refresh verification'},newUuidV7(),newUuidV7());
      expect((await app.inject({url:url.replace(ids.target,ids.empty),headers})).json().items[0].platform_role_assignment_id).toBe(assigned.assignment.platform_role_assignment_id);
      await sql`UPDATE iam.platform_role_assignments SET valid_to=statement_timestamp() WHERE platform_role_assignment_id=${adminAssignment}::uuid`.execute(db);
      expect((await app.inject({url,headers})).statusCode).toBe(403);
      expect((await app.inject({url:catalog,headers})).statusCode).toBe(403);
    } finally {
      if (app) await app.close();
      await sql`UPDATE iam.roles SET lifecycle_state='published',is_baseline=true WHERE role_code='PLATFORM_SUPPORT' AND ownership_class='PLATFORM_CONTROL' AND tenant_id IS NULL`.execute(db);
      await sql`DELETE FROM ops_audit.audit_events WHERE actor_user_identity_id=${ids.actor}::uuid`.execute(db);
      await sql`DELETE FROM ops_audit.idempotency_records WHERE actor_user_identity_id=${ids.actor}::uuid`.execute(db);
      await sql`DELETE FROM iam.platform_role_assignments WHERE user_identity_id IN (${ids.actor}::uuid,${ids.target}::uuid,${ids.empty}::uuid)`.execute(db);
      await sql`DELETE FROM iam.role_permissions WHERE role_id=${ids.tenantRole}::uuid`.execute(db);
      await sql`DELETE FROM iam.membership_roles WHERE membership_role_id=${ids.memberRole}::uuid`.execute(db);
      await sql`DELETE FROM iam.tenant_memberships WHERE tenant_membership_id=${ids.membership}::uuid`.execute(db);
      await sql`DELETE FROM iam.roles WHERE role_id IN (${ids.tenantRole}::uuid,${ids.customRole}::uuid)`.execute(db);
      await sql`DELETE FROM platform.tenants WHERE tenant_id=${ids.tenant}::uuid`.execute(db);
      await sql`DELETE FROM iam.user_identities WHERE user_identity_id IN (${ids.actor}::uuid,${ids.target}::uuid,${ids.empty}::uuid,${ids.outsider}::uuid)`.execute(db);
      await db.destroy();
    }
  },30000);
});
