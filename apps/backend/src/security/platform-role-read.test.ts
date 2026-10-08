import { describe, expect, it } from "vitest";
import { PostgresQueryCompiler, type Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { buildApp } from "../app.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { platformRoleFamilyCodes } from "./platform-role-family.js";
const actorId = newUuidV7(), target = newUuidV7(), assignmentId = newUuidV7();
const url = `/api/v1/platform/user-identities/${target}/platform-roles`;
const catalogUrl = '/api/v1/roles?assignable_family=platform';
const headers = { authorization: 'Bearer isolated-test-token' };
const row = { platform_role_assignment_id: assignmentId, user_identity_id: target, role_code: 'PLATFORM_SUPPORT',
  role_name: 'Platform Support', valid_from: new Date('2026-10-06T00:00:00Z'), valid_to: null };
type Query = { sql: string; parameters: readonly unknown[] };
function setup(options: { permissions?: string[]; items?: Record<string, unknown>[]; missing?: boolean; nonhuman?: boolean; ambiguous?: boolean } = {}) {
  const queries: Query[] = [];
  const compiler = new PostgresQueryCompiler();
  const executeQuery = async (query: Query) => {
    queries.push(query);
    if (query.sql.includes('SELECT DISTINCT p.permission_code')) return { rows: (options.permissions ?? ['platform.role.administer','platform.role.read']).map(permission_code => ({ permission_code, role_code: 'PLATFORM_ADMIN' })) };
    if (query.sql.includes('SELECT lifecycle_state FROM iam.user_identities')) return { rows: [{ lifecycle_state: 'active' }] };
    if (query.sql.includes('SELECT user_identity_id FROM iam.user_identities')) return { rows: options.missing ? [] : [{ user_identity_id: target }] };
    if (query.sql.includes('SELECT pa.platform_role_assignment_id')) return { rows: options.items ?? [row] };
    if (query.sql.includes('HAVING count(*)>1')) return { rows: options.ambiguous ? [{ role_code: 'PLATFORM_SUPPORT' }] : [] };
    if (query.sql.includes('SELECT r.role_id')) return { rows: [{ role_id: newUuidV7(), role_code: 'PLATFORM_SUPPORT', name: 'Platform Support', tenant_id: null,
      ownership_class: 'PLATFORM_CONTROL', lifecycle_state: 'published', is_baseline: true, created_at: new Date() }] };
    return { rows: [] };
  };
  const transaction = { executeQuery, getExecutor: () => ({ transformQuery: (node: unknown) => node,
    compileQuery: compiler.compileQuery.bind(compiler), executeQuery }) };
  const database = { ...transaction, transaction: () => ({ setIsolationLevel: (isolation: string) => {
    expect(isolation).toBe('repeatable read'); return { execute: (fn: (tx: unknown) => unknown) => fn(transaction) };
  } }) } as unknown as Kysely<FoundationDatabase>;
  const app = buildApp(async () => true, { database, fileStorage: new UnavailableFileStoragePort(), identityVerifier: {
    verifyBearerToken: async () => ({ principalClass: options.nonhuman ? 'SERVICE' as never : 'HUMAN_INTERACTIVE',
      principalId: actorId, tokenId: 'test', expiresAt: new Date(Date.now()+60000),
      username: 'andres.grc', email: 'admin@example.test', roles: ['PLATFORM_ADMIN'] })
  } });
  return { app, queries };
}
async function read(options: Parameters<typeof setup>[0] = {}, path = url, requestHeaders: Record<string,string> = headers) {
  const { app, queries } = setup(options);
  try { return { response: await app.inject({ url: path, headers: requestHeaders }), queries }; }
  finally { await app.close(); }
}
describe('P2E platform assignment read boundary', () => {
  it('exposes canonical exact revoke ID and role name only, at a read-only snapshot', async () => {
    const { response, queries } = await read({ items: [{ ...row, password: 'not projected', identity_key: 'not projected', tenant_id: 'not projected' }] });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual({ items: [{ ...row, valid_from: row.valid_from.toISOString() }] });
    expect(queries[0]?.sql).toBe('SET TRANSACTION READ ONLY');
    const projection = queries.find(q => q.sql.includes('SELECT pa.platform_role_assignment_id'))!;
    expect(projection.parameters).toEqual([target,...platformRoleFamilyCodes]);
    expect(projection.sql).toContain('r.tenant_id IS NULL');
    expect(projection.sql).toContain("pa.ownership_class='PLATFORM_CONTROL'");
    expect(projection.sql).toContain('pa.valid_to>transaction_timestamp()');
    expect(projection.sql).toContain('ORDER BY r.role_code ASC,pa.platform_role_assignment_id ASC');
    expect(JSON.stringify(queries)).not.toMatch(/membership_roles|tenant_memberships|INSERT|UPDATE|DELETE|FOR UPDATE|keycloak/i);
    expect(response.headers).not.toHaveProperty('etag');
    expect(response.headers).not.toHaveProperty('idempotency-replayed');
  });
  it('supports empty and multiple active canonical assignments', async () => {
    expect((await read({ items: [] })).response.json()).toEqual({ items: [] });
    expect((await read({ items: [{ ...row, role_code: 'PLATFORM_ADMIN' },row] })).response.json().items).toHaveLength(2);
  });
  it('represents a nonnull future validity end without inventing a revoked status', async () => {
    const end = new Date('2030-01-01T00:00:00Z');
    expect((await read({ items: [{ ...row, valid_to: end }] })).response.json().items[0].valid_to).toBe(end.toISOString());
  });
  it('returns canonical 404 for missing target and 409 for duplicate active role intervals', async () => {
    expect((await read({ missing: true })).response.statusCode).toBe(404);
    expect((await read({ items: [row,row] })).response.statusCode).toBe(409);
    expect((await read({},'/api/v1/platform/user-identities/not-a-uuid/platform-roles')).response.statusCode).toBe(400);
  });
  it.each([{ permissions: [] }, { permissions: ['platform.role.assign'] }, { permissions: ['platform.role.read'] }])('denies without exact administer permission even with provider role/name claims: %j', async options => {
    expect((await read(options)).response.statusCode).toBe(403);
  });
  it('requires authentication and human interactive identity', async () => {
    expect((await read({},url,{} as typeof headers)).response.statusCode).toBe(401);
    expect((await read({ nonhuman: true })).response.statusCode).toBe(403);
  });
  it('rejects tenant header, tenant_id and all query/body input with canonical errors', async () => {
    expect((await read({},url,{ ...headers,'x-tcdx-tenant-id': newUuidV7() })).response.statusCode).toBe(403);
    for (const suffix of ['?tenant_id=x','?username=andres.grc','?page[size]=1']) expect((await read({},url+suffix)).response.statusCode).toBe(400);
    const { app } = setup();
    try { expect((await app.inject({ method: 'GET', url, headers, payload: { tenant_id: newUuidV7() } })).statusCode).toBe(400); }
    finally { await app.close(); }
  });
});
describe('P2E existing roleList assignable catalog mode', () => {
  it('filters published baseline functional platform roles from the same canonical catalog', async () => {
    const { response, queries } = await read({},catalogUrl);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json().items[0].role_code).toBe('PLATFORM_SUPPORT');
    const query = queries.find(q => q.sql.includes('SELECT r.role_id'))!;
    expect(query.sql).toContain("r.is_baseline AND r.lifecycle_state='published'");
    expect(query.sql).toContain('r.role_code=ANY($1::text[])');
    expect(query.parameters[0]).toEqual(platformRoleFamilyCodes);
    expect(JSON.stringify(queries)).not.toMatch(/membership_roles|tenant_memberships|INSERT|UPDATE|DELETE|keycloak/i);
  });
  it('requires existing catalog permission and rejects tenant or malformed modes', async () => {
    expect((await read({ permissions: ['platform.role.administer'] },catalogUrl)).response.statusCode).toBe(403);
    expect((await read({},catalogUrl,{} as typeof headers)).response.statusCode).toBe(401);
    expect((await read({},catalogUrl,{ ...headers,'x-tcdx-tenant-id': newUuidV7() })).response.statusCode).toBe(403);
    expect((await read({},catalogUrl+'&tenant_id='+newUuidV7())).response.statusCode).toBe(400);
    expect((await read({},'/api/v1/roles?assignable_family=tenant')).response.statusCode).toBe(400);
    expect((await read({ ambiguous: true },catalogUrl)).response.statusCode).toBe(409);
    const { app } = setup();
    try { expect((await app.inject({ method: 'GET', url: catalogUrl, headers, payload: { tenant_id: newUuidV7() } })).statusCode).toBe(400); }
    finally { await app.close(); }
  });
});
