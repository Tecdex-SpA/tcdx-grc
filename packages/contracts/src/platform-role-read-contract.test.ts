import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import openapi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import catalog from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import manifest from "../../../database/migrations/manifest.json?raw";
const api = parse(openapi);
const ajv = new Ajv2020({ strict: false, allErrors: true });
(addFormats as unknown as (instance: Ajv2020) => void)(ajv);
for (const [name, schema] of Object.entries(api.components.schemas)) ajv.addSchema(schema as object, `#/components/schemas/${name}`);
describe("P2E canonical platform administrative read contracts", () => {
  it("reuses exact existing assignment administration authority without tenant or mutation semantics", () => {
    const op = api.paths['/platform/user-identities/{user_identity_id}/platform-roles'].get;
    expect(op.operationId).toBe('platformRoleAssignmentList');
    expect(op.security).toEqual([{ bearerAuth: [] }]);
    expect(op['x-tcdx-permission']).toBe('`platform.role.administer`');
    expect(op['x-tcdx-scope']).toBe('platform');
    expect(op['x-tcdx-tenant-header-policy']).toBe('REJECT_403');
    expect(op['x-tcdx-tenant-id-input-policy']).toBe('REJECT_400');
    expect(op['x-tcdx-transaction-boundary']).toBe('RO');
    expect(op['x-tcdx-audit-event']).toBe('NONE');
    expect(op['x-tcdx-idempotency-class']).toBe('NATURALLY_IDEMPOTENT');
    expect(op.parameters).toHaveLength(2);
    for (const status of ['200','400','401','403','404','409']) expect(op.responses[status]).toBeDefined();
    expect(matrix).toContain('| platformRoleAssignmentList | GET');
    expect(catalog).toContain('platformRoleAssignmentList reuses `platform.role.administer`');
    expect(api.paths['/platform/user-identities/{user_identity_id}/platform-roles'].post.operationId).toBe('platformRoleAssign');
  });
  it("validates empty and active temporal projections, exact revoke identifier and closed fields", () => {
    const validate = ajv.getSchema('#/components/schemas/PlatformRoleAssignmentList')!;
    const item = { platform_role_assignment_id: '0199bf70-2890-75c4-9563-a7c128d014ca',
      user_identity_id: '0199bf70-2891-75c4-9563-a7c128d014ca', role_code: 'PLATFORM_SUPPORT', role_name: 'Platform Support',
      valid_from: '2026-10-06T00:00:00Z', valid_to: null };
    expect(validate({ items: [] })).toBe(true);
    expect(validate({ items: [item] })).toBe(true);
    for (const bad of [{ ...item, role_code: 'TENANT_ADMIN' }, { ...item, tenant_id: 'foreign' },
      { ...item, identity_key: 'provider' }, { ...item, password: 'secret' }, { ...item, platform_role_assignment_id: undefined }]) {
      expect(validate({ items: [bad] })).toBe(false);
    }
    expect(validate({ items: [item,item,item] })).toBe(false);
  });
  it("integrates the existing roleList source and permission without a parallel endpoint or permission API", () => {
    const op = api.paths['/roles'].get;
    expect(op.operationId).toBe('roleList');
    expect(op['x-tcdx-permission']).toBe('`platform.role.read`');
    expect(op.parameters.find((p: { name?: string }) => p.name === 'assignable_family').schema.enum).toEqual(['platform']);
    expect(api.components.schemas.PlatformRoleCode.enum).toEqual(['PLATFORM_ADMIN','PLATFORM_SUPPORT']);
    expect(openapi).not.toContain('operationId: platformRoleList');
    expect(openapi).not.toContain('operationId: permissionList');
    expect(JSON.parse(manifest).migrations.slice(0, 27)).toHaveLength(27);
    expect(JSON.parse(manifest).migrations[26].id).toBe('20261006000100');
  });
});
