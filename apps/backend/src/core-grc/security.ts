import { sql, type Kysely, type Transaction } from "kysely";
import type { ScopeKind } from "@tcdx-grc/shared-types";
import type { FastifyRequest } from "fastify";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { IdentityVerifier } from "../security/authentication.js";
import { resolveTenantContext } from "../security/tenant-context.js";
import type { CoreActor } from "./model.js";

function bearer(request: FastifyRequest): string {
  const value = request.headers.authorization;
  if (!value?.startsWith("Bearer ") || value.length < 8) {
    throw new FoundationError("TCDX.AUTHENTICATION.REQUIRED", "Authentication required", 401);
  }
  return value.slice(7);
}

export async function resolveCoreActor(database: Kysely<FoundationDatabase>, verifier: IdentityVerifier, request: FastifyRequest): Promise<CoreActor> {
  const identity = await verifier.verifyBearerToken(bearer(request));
  const header = request.headers["x-tcdx-tenant-id"];
  const tenant = await resolveTenantContext(database, identity, typeof header === "string" ? header : undefined);
  const access = await sql<{ permission_code: string; scope_kind: ScopeKind; role_code: string }>`
    SELECT DISTINCT p.permission_code, mr.scope_kind, r.role_code
      FROM iam.membership_roles mr
      JOIN iam.roles r ON r.role_id=mr.role_id
      JOIN iam.role_permissions rp ON rp.role_id=r.role_id
      JOIN iam.permissions p ON p.permission_id=rp.permission_id AND p.lifecycle_state='published'
     WHERE mr.tenant_id=${tenant.tenantId}::uuid
       AND mr.tenant_membership_id=${tenant.membershipId}::uuid
       AND mr.valid_from <= CURRENT_TIMESTAMP
       AND (mr.valid_to IS NULL OR mr.valid_to > CURRENT_TIMESTAMP)
       AND r.lifecycle_state='published'
       AND (r.tenant_id IS NULL OR r.tenant_id=${tenant.tenantId}::uuid)
       AND (rp.tenant_id IS NULL OR rp.tenant_id=${tenant.tenantId}::uuid)
  `.execute(database);
  const capabilities = await sql<{ capability_group: string }>`
    SELECT DISTINCT c.capability_group
      FROM platform.subscriptions s
      JOIN platform.entitlements e ON e.plan_version_id=s.plan_version_id AND e.is_enabled=TRUE
      JOIN platform.capabilities c ON c.capability_id=e.capability_id AND c.lifecycle_state='published'
     WHERE s.tenant_id=${tenant.tenantId}::uuid
       AND s.lifecycle_state='active'
       AND s.starts_at <= CURRENT_TIMESTAMP
       AND (s.ends_at IS NULL OR s.ends_at > CURRENT_TIMESTAMP)
  `.execute(database);
  const permissionScopes = new Map<string, Set<ScopeKind>>();
  for (const row of access.rows) {
    const scopes = permissionScopes.get(row.permission_code) ?? new Set<ScopeKind>();
    scopes.add(row.scope_kind);
    permissionScopes.set(row.permission_code, scopes);
  }
  return {
    tenantId: tenant.tenantId,
    membershipId: tenant.membershipId,
    userIdentityId: identity.principalId,
    permissions: new Set(access.rows.map((row) => row.permission_code)),
    scopes: new Set(access.rows.map((row) => row.scope_kind)),
    permissionScopes,
    capabilityGroups: new Set(capabilities.rows.map((row) => row.capability_group)),
    roles: [...new Set(access.rows.map((row) => row.role_code))]
  };
}

export function grantedScopes(actor: CoreActor, permission: string): ReadonlySet<ScopeKind> {
  return actor.permissionScopes.get(permission) ?? new Set<ScopeKind>();
}

export function requireAccess(actor: CoreActor, permission: string, capability: string, scopes: readonly ScopeKind[]): void {
  const grants = grantedScopes(actor, permission);
  if (!actor.capabilityGroups.has(capability) || !actor.permissions.has(permission) || !scopes.some((scope) => grants.has(scope))) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
}

export async function assertLifecycleEdge(transaction: Transaction<FoundationDatabase>, actor: CoreActor, input: {
  entityType: string; fromState: string; commandCode: string; permission: string;
}): Promise<{ toState: string; auditEventCode: string; sodPolicyRef: string }> {
  const edge = await sql<{ to_state: string; audit_event_code: string; sod_policy_ref: string; scope_kind: ScopeKind }>`
    WITH current_edges AS (
      SELECT DISTINCT ON (entity_type,from_state,command_code)
             lifecycle_transition_definition_id,to_state,audit_event_code,sod_policy_ref,permission_id
        FROM ops_audit.lifecycle_transition_definitions
       WHERE lifecycle_state='published'
       ORDER BY entity_type,from_state,command_code,version_number DESC
    )
    SELECT e.to_state,e.audit_event_code,e.sod_policy_ref,s.scope_kind
      FROM current_edges e
      JOIN iam.permissions p ON p.permission_id=e.permission_id
      JOIN ops_audit.lifecycle_transition_scopes s ON s.lifecycle_transition_definition_id=e.lifecycle_transition_definition_id
     WHERE e.entity_type=${input.entityType} AND e.from_state=${input.fromState}
       AND e.command_code=${input.commandCode} AND p.permission_code=${input.permission}
  `.execute(transaction);
  const grants = grantedScopes(actor, input.permission);
  if (edge.rows.length === 0 || !edge.rows.some((row) => grants.has(row.scope_kind))) {
    throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Lifecycle transition denied", 409);
  }
  return { toState: edge.rows[0]!.to_state, auditEventCode: edge.rows[0]!.audit_event_code, sodPolicyRef: edge.rows[0]!.sod_policy_ref };
}
