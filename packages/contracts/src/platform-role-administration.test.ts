import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import openapi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import catalog from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import audit from "../../../docs/executable-contracts/08_AUDIT_EVENT_CATALOG.md?raw";
import contract from "../../../docs/executable-contracts/24_PLATFORM_ROLE_ADMINISTRATION_CONTRACT.md?raw";
import migration from "../../../database/migrations/20261006000100_platform_role_administration_permission_publication.sql?raw";
import manifest from "../../../database/migrations/manifest.json?raw";

const api = parse(openapi);
const ajv = new Ajv2020({ strict: false, allErrors: true });
const installFormats = addFormats as unknown as (instance: Ajv2020) => void; installFormats(ajv);
describe("human-approved P2A platform role administration contracts", () => {
  it.each([
    ["platformRoleAssign", "/platform/user-identities/{user_identity_id}/platform-roles", "assign"],
    ["platformRoleRevoke", "/platform/user-identities/{user_identity_id}/platform-roles/{platform_role_assignment_id}:revoke", "revoke"]
  ])("binds %s to the approved permission, scope, material audit and idempotency", (operation, path, action) => {
    const op = api.paths[path].post;
    expect(op.operationId).toBe(operation);
    expect(op['x-tcdx-permission']).toBe('`platform.role.administer`');
    expect(op['x-tcdx-scope']).toBe('platform');
    expect(op['x-tcdx-idempotency-class']).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect(op['x-tcdx-audit-event']).toBe(`\`audit.iam.platform_role_assignment.${action}.v1\``);
    expect(matrix).toContain(`| ${operation} | POST \`${path}\``);
    expect(audit).toContain(`audit.iam.platform_role_assignment.${action}.v1`);
    expect(op.parameters.some((p: { $ref?: string }) => p.$ref?.endsWith('/IdempotencyKey'))).toBe(true);
  });
  it("closes exact request shapes, nonempty reason and UUID authority exclusion", () => {
    const assign = ajv.compile(api.components.schemas.PlatformRoleAssignRequest);
    const revoke = ajv.compile(api.components.schemas.PlatformRoleRevokeRequest);
    expect(assign({ role_code: 'PLATFORM_ADMIN', reason: 'Approved change' })).toBe(true);
    for (const body of [{ role_code: 'PLATFORM_ADMIN' }, { role_code: 'PLATFORM_ADMIN', reason: ' ' },
      { role_code: 'PLATFORM_ADMIN', reason: 'Approved', tenant_id: 'foreign' }, { role_id: 'uuid', reason: 'Approved' }]) expect(assign(body)).toBe(false);
    expect(revoke({ reason: 'Approved revoke' })).toBe(true);
    expect(revoke({ reason: 'Approved', role_code: 'PLATFORM_ADMIN' })).toBe(false);
  });
  it("preserves tenant permission semantics and canonical independent authority", () => {
    const tenantRow = catalog.split('\n').find(row => row.startsWith('| `platform.role.assign`'))!;
    expect(tenantRow).toContain('tenant'); expect(tenantRow).toContain('never PlatformRoleAssignment');
    expect(catalog).toContain('<code>platform.role.administer</code> | CORE_PLATFORM');
    for (const invariant of ['PLATFORM_SUPPORT', 'distinct active UserIdentities', 'No identity creation', 'No If-Match', 'never a caller-supplied role UUID', 'F5D-007 remains permanently one-time']) {
      expect(contract.toLowerCase()).toContain(invariant.toLowerCase());
    }
    expect(Object.values(api.paths).flatMap((path: unknown) => Object.values(path as object)).filter((op: any) => op.operationId?.startsWith('managedIdentity'))).toHaveLength(8);
  });
  it("registers exact DATA-ONLY bytes without modifying historical migration26 or the schema", async () => {
    const migrations = JSON.parse(manifest).migrations;
    expect(migrations.find((row: { id: string }) => row.id === "20261006000100")).toMatchObject({ id: '20261006000100', transactional: true, sha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(migration))), byte => byte.toString(16).padStart(2, '0')).join('') });
    expect(migrations.find((m: any) => m.id === '20261001000100').sha256).toBe('90503ed1cf626c7d8a3529d323670322e180efde90257ee8bb99efe2736eef07');
    expect(migration).not.toMatch(/\b(?:CREATE|ALTER|DROP|TRUNCATE|DELETE|UPDATE)\s+(?:TABLE|SCHEMA|INDEX|iam\.)/i);
    expect(migration).toContain("r.role_code='PLATFORM_ADMIN'");
    expect(migration).not.toContain('platform_role_assignments');
  });
});
