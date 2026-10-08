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

export async function resolveAuthenticatedIdentity(verifier: IdentityVerifier, request: FastifyRequest) {
  return verifier.verifyBearerToken(bearer(request));
}

export async function resolveCoreActor(database: Kysely<FoundationDatabase>, verifier: IdentityVerifier, request: FastifyRequest): Promise<CoreActor> {
  const identity = await resolveAuthenticatedIdentity(verifier, request);
  return resolveTenantActor(database, identity, request.headers["x-tcdx-tenant-id"]);
}

export async function resolveTenantActor(database: Kysely<FoundationDatabase>, identity: Awaited<ReturnType<IdentityVerifier["verifyBearerToken"]>>, candidateTenant: string | string[] | undefined): Promise<CoreActor> {
  const tenant = await resolveTenantContext(database, identity, typeof candidateTenant === "string" ? candidateTenant : undefined);
  const access = await sql<{ permission_code: string; scope_kind: ScopeKind; role_code: string }>`
    SELECT DISTINCT p.permission_code, mr.scope_kind, r.role_code
      FROM iam.membership_roles mr
      JOIN iam.roles r ON r.role_id=mr.role_id
        AND r.ownership_class='TENANT_OWNED' AND r.tenant_id=mr.tenant_id
      JOIN iam.role_permissions rp ON rp.role_id=r.role_id
        AND rp.ownership_class='TENANT_OWNED' AND rp.tenant_id=mr.tenant_id
      JOIN iam.permissions p ON p.permission_id=rp.permission_id AND p.lifecycle_state='published'
     WHERE mr.tenant_id=${tenant.tenantId}::uuid
       AND mr.tenant_membership_id=${tenant.membershipId}::uuid
       AND mr.valid_from <= CURRENT_TIMESTAMP
       AND (mr.valid_to IS NULL OR mr.valid_to > CURRENT_TIMESTAMP)
       AND r.lifecycle_state='published'
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
    runtimeEnvironment: ["development", "test", "qa"].includes(process.env.NODE_ENV ?? "")
      ? process.env.NODE_ENV as "development" | "test" | "qa" : "production",
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

export async function availableTenantContexts(database: Kysely<FoundationDatabase>, identity: Awaited<ReturnType<IdentityVerifier["verifyBearerToken"]>>): Promise<Array<{
  tenant_id: string;
  tenant_display_name: string;
  tenant_membership_id: string;
  membership_state: string;
  effective_role_codes: string[];
}>> {
  if (identity.principalClass !== "HUMAN_INTERACTIVE") return [];
  const contexts = await sql<{
    tenant_id: string;
    tenant_display_name: string;
    tenant_membership_id: string;
    membership_state: string;
    effective_role_codes: string[] | null;
  }>`
    SELECT t.tenant_id,t.display_name AS tenant_display_name,m.tenant_membership_id,m.membership_state,
           COALESCE(array_agg(DISTINCT r.role_code ORDER BY r.role_code) FILTER (WHERE r.role_code IS NOT NULL),'{}'::text[]) AS effective_role_codes
      FROM iam.tenant_memberships m
      JOIN platform.tenants t ON t.tenant_id=m.tenant_id AND t.lifecycle_state='active'
      LEFT JOIN iam.membership_roles mr ON mr.tenant_id=m.tenant_id AND mr.tenant_membership_id=m.tenant_membership_id
        AND mr.valid_from <= transaction_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to > transaction_timestamp())
      LEFT JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=m.tenant_id
        AND r.ownership_class='TENANT_OWNED' AND r.lifecycle_state='published'
     WHERE m.user_identity_id=${identity.principalId}::uuid
       AND m.membership_state='active'
       AND (m.ended_at IS NULL OR m.ended_at > transaction_timestamp())
     GROUP BY t.tenant_id,t.display_name,m.tenant_membership_id,m.membership_state
     ORDER BY t.display_name ASC,t.tenant_id ASC
  `.execute(database);
  return contexts.rows.map((row) => ({ ...row, effective_role_codes: row.effective_role_codes ?? [] }));
}

export async function availablePlatformRoleCodes(
  database: Kysely<FoundationDatabase>,
  identity: Awaited<ReturnType<IdentityVerifier["verifyBearerToken"]>>
): Promise<string[]> {
  if (identity.principalClass !== "HUMAN_INTERACTIVE") return [];
  const roles = await sql<{ role_code: string }>`
    SELECT DISTINCT r.role_code
      FROM iam.platform_role_assignments pa
      JOIN iam.roles r ON r.role_id=pa.role_id
       AND r.ownership_class='PLATFORM_CONTROL' AND r.tenant_id IS NULL AND r.lifecycle_state='published'
     WHERE pa.user_identity_id=${identity.principalId}::uuid
       AND pa.ownership_class='PLATFORM_CONTROL'
       AND pa.valid_from<=transaction_timestamp()
       AND (pa.valid_to IS NULL OR pa.valid_to>transaction_timestamp())
     ORDER BY r.role_code ASC
  `.execute(database);
  return roles.rows.map(({ role_code }) => role_code);
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
             lifecycle_transition_definition_id,entity_type,from_state,command_code,to_state,audit_event_code,sod_policy_ref,permission_id
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
