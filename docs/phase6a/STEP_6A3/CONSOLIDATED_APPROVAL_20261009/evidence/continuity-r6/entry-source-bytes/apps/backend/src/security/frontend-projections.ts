import type { FastifyInstance, FastifyRequest } from "fastify";
import { sql, type Kysely } from "kysely";
import { validate as validateUuid, version as uuidVersion } from "uuid";
import type { CurrentPrincipalAuthorization, TenantPermissionScope } from "@tcdx-grc/contracts";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { resolveAuthenticatedIdentity } from "../core-grc/security.js";
import type { IdentityVerifier } from "./authentication.js";
import { permissionProjectionCatalog } from "./permission-projection-catalog.generated.js";
import { resolvePlatformActor } from "./platform-authority.js";

type ProviderComposition = { zohoConfigured: boolean; zohoRegistered: boolean; managedConfigured: boolean; managedRegistered: boolean };
type TenantGrant = { permission_code: string; scope_kind: string; organizational_unit_id: string | null;
  process_id: string | null; service_id: string | null; audit_id: string | null; scope_valid: boolean };

function rejectUnexpectedRequest(request: FastifyRequest, tenantAllowed: boolean): void {
  if (Object.keys(request.query as Record<string, unknown>).length || request.body !== undefined
    || (!tenantAllowed && request.headers["x-tcdx-tenant-id"] !== undefined)) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  }
}

function dependencyUnavailable(): FoundationError {
  return new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Dependency unavailable", 503, true);
}

function scopeFor(row: TenantGrant): TenantPermissionScope | null {
  if (!row.scope_valid) return null;
  const { scope_kind: kind } = row;
  if (kind === "tenant" || kind === "assigned_object" || kind === "owned_object") return { scope_kind: kind };
  if (kind === "organizational_unit" && row.organizational_unit_id) return { scope_kind: kind, organizational_unit_id: row.organizational_unit_id };
  if (kind === "process" && row.process_id) return { scope_kind: kind, process_id: row.process_id };
  if (kind === "service" && row.service_id) return { scope_kind: kind, service_id: row.service_id };
  if (kind === "audit_engagement" && row.audit_id) return { scope_kind: kind, audit_id: row.audit_id };
  return null;
}

export function registerFrontendProjectionRoutes(app: FastifyInstance, dependencies: {
  database: Kysely<FoundationDatabase> | undefined; identityVerifier: IdentityVerifier | undefined; providers: ProviderComposition;
}): void {
  app.get("/api/v1/auth/providers", async (request) => {
    rejectUnexpectedRequest(request, false);
    const p = dependencies.providers;
    if (![p.zohoConfigured, p.zohoRegistered, p.managedConfigured, p.managedRegistered]
      .every((value) => typeof value === "boolean")) throw dependencyUnavailable();
    return { providers: [
      { provider: "ZOHO", available: p.zohoConfigured && p.zohoRegistered },
      { provider: "MICROSOFT_ENTRA_ID", available: false },
      { provider: "GOOGLE_WORKSPACE", available: false },
      { provider: "TCDX_MANAGED_IDENTITY", available: p.managedConfigured && p.managedRegistered }
    ] };
  });

  if (!dependencies.database || !dependencies.identityVerifier) return;
  const database = dependencies.database;
  const verifier = dependencies.identityVerifier;
  app.get("/api/v1/auth/me/authorization", async (request) => {
    rejectUnexpectedRequest(request, true);
    const tenantHeader = request.headers["x-tcdx-tenant-id"];
    if (tenantHeader !== undefined && (typeof tenantHeader !== "string" || !validateUuid(tenantHeader)
      || uuidVersion(tenantHeader) !== 7)) {
      throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
    }
    const identity = await resolveAuthenticatedIdentity(verifier, request);
    if (identity.principalClass !== "HUMAN_INTERACTIVE") {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    try {
      return await database.transaction().setIsolationLevel("repeatable read").execute(async (transaction): Promise<CurrentPrincipalAuthorization> => {
        await sql`SET TRANSACTION READ ONLY`.execute(transaction);
        const evaluated = await sql<{ evaluated_at: Date }>`SELECT transaction_timestamp() AS evaluated_at`.execute(transaction);
        const actor = await resolvePlatformActor(transaction, identity);
        const platform_permissions = [...actor.permissions].filter((code) =>
          permissionProjectionCatalog[code]?.scopes.includes("platform")).sort();
        let tenant_permissions: CurrentPrincipalAuthorization["tenant_permissions"] = null;
        if (tenantHeader) {
          const contexts = await sql<{ membership_state: string; tenant_state: string; ended_at: Date | null }>`
            SELECT m.membership_state,t.lifecycle_state AS tenant_state,m.ended_at
              FROM iam.tenant_memberships m JOIN platform.tenants t ON t.tenant_id=m.tenant_id
             WHERE m.tenant_id=${tenantHeader}::uuid AND m.user_identity_id=${identity.principalId}::uuid
          `.execute(transaction);
          if (contexts.rows.length !== 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
          const context = contexts.rows[0]!;
          if (context.membership_state !== "active" || context.tenant_state !== "active"
            || (context.ended_at && context.ended_at <= evaluated.rows[0]!.evaluated_at)) {
            throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
          }
          const capabilities = await sql<{ capability_group: string }>`
            SELECT DISTINCT c.capability_group FROM platform.subscriptions s
              JOIN platform.plan_versions pv ON pv.plan_version_id=s.plan_version_id AND pv.lifecycle_state='published'
                AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
                AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
              JOIN platform.entitlements e ON e.plan_version_id=s.plan_version_id AND e.is_enabled=TRUE
              JOIN platform.capabilities c ON c.capability_id=e.capability_id AND c.lifecycle_state='published'
             WHERE s.tenant_id=${tenantHeader}::uuid AND s.lifecycle_state='active'
               AND s.starts_at<=transaction_timestamp() AND (s.ends_at IS NULL OR s.ends_at>transaction_timestamp())
          `.execute(transaction);
          const enabled = new Set(capabilities.rows.map((row) => row.capability_group));
          const grants = await sql<TenantGrant>`
            SELECT DISTINCT p.permission_code,mr.scope_kind,mr.organizational_unit_id,mr.process_id,mr.service_id,mr.audit_id,
              CASE mr.scope_kind
                WHEN 'tenant' THEN num_nonnulls(mr.organizational_unit_id,mr.process_id,mr.service_id,mr.audit_id)=0
                WHEN 'assigned_object' THEN num_nonnulls(mr.organizational_unit_id,mr.process_id,mr.service_id,mr.audit_id)=0
                WHEN 'owned_object' THEN num_nonnulls(mr.organizational_unit_id,mr.process_id,mr.service_id,mr.audit_id)=0
                WHEN 'organizational_unit' THEN ou.organizational_unit_id IS NOT NULL AND num_nonnulls(mr.process_id,mr.service_id,mr.audit_id)=0
                WHEN 'process' THEN pr.process_id IS NOT NULL AND num_nonnulls(mr.organizational_unit_id,mr.service_id,mr.audit_id)=0
                WHEN 'service' THEN sv.service_id IS NOT NULL AND num_nonnulls(mr.organizational_unit_id,mr.process_id,mr.audit_id)=0
                WHEN 'audit_engagement' THEN au.audit_id IS NOT NULL AND num_nonnulls(mr.organizational_unit_id,mr.process_id,mr.service_id)=0
                ELSE FALSE END AS scope_valid
              FROM iam.tenant_memberships m
              JOIN iam.membership_roles mr ON mr.tenant_id=m.tenant_id AND mr.tenant_membership_id=m.tenant_membership_id
              JOIN iam.roles r ON r.role_id=mr.role_id AND r.tenant_id=mr.tenant_id
                AND r.ownership_class='TENANT_OWNED' AND r.lifecycle_state='published'
              JOIN iam.role_permissions rp ON rp.role_id=r.role_id AND rp.tenant_id=r.tenant_id AND rp.ownership_class='TENANT_OWNED'
              JOIN iam.permissions p ON p.permission_id=rp.permission_id AND p.lifecycle_state='published'
              LEFT JOIN org.organizational_units ou ON ou.organizational_unit_id=mr.organizational_unit_id AND ou.tenant_id=mr.tenant_id
              LEFT JOIN org.processes pr ON pr.process_id=mr.process_id AND pr.tenant_id=mr.tenant_id
              LEFT JOIN org.services sv ON sv.service_id=mr.service_id AND sv.tenant_id=mr.tenant_id
              LEFT JOIN audit.audits au ON au.audit_id=mr.audit_id AND au.tenant_id=mr.tenant_id
             WHERE m.tenant_id=${tenantHeader}::uuid AND m.user_identity_id=${identity.principalId}::uuid
               AND m.membership_state='active' AND (m.ended_at IS NULL OR m.ended_at>transaction_timestamp())
               AND mr.valid_from<=transaction_timestamp() AND (mr.valid_to IS NULL OR mr.valid_to>transaction_timestamp())
          `.execute(transaction);
          const permissionScopes = new Map<string, Map<string, TenantPermissionScope>>();
          for (const row of grants.rows) {
            const binding = permissionProjectionCatalog[row.permission_code];
            if (!binding?.scopes.includes(row.scope_kind) || !binding.capabilities.some((value) => enabled.has(value))) continue;
            const scope = scopeFor(row);
            if (!scope) continue;
            const scopes = permissionScopes.get(row.permission_code) ?? new Map<string, TenantPermissionScope>();
            scopes.set(JSON.stringify(scope), scope);
            permissionScopes.set(row.permission_code, scopes);
          }
          const permissions = Object.fromEntries([...permissionScopes].sort(([a], [b]) => a.localeCompare(b))
            .map(([code, scopes]) => [code, [...scopes.values()].sort((a, b) =>
              JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
          tenant_permissions = { tenant_id: tenantHeader, permissions };
        }
        return { evaluated_at: evaluated.rows[0]!.evaluated_at.toISOString(), platform_permissions, tenant_permissions };
      });
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw dependencyUnavailable();
    }
  });
}
