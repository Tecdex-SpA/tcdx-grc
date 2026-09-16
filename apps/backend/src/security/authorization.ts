import type { ScopeKind } from "@tcdx-grc/shared-types";
import { FoundationError } from "../errors.js";

export type AuthorizationFacts = {
  authenticated: boolean;
  tenantMembershipActive: boolean;
  capabilityEnabled: boolean;
  permissions: ReadonlySet<string>;
  scopes: ReadonlySet<ScopeKind>;
  objectAccessible: boolean;
  sodAllowed: boolean;
};

export type AuthorizationRequest = { permission: string; allowedScopes: ReadonlySet<ScopeKind> };

export function authorize(facts: AuthorizationFacts, request: AuthorizationRequest): void {
  const allowed = facts.authenticated
    && facts.tenantMembershipActive
    && facts.capabilityEnabled
    && facts.permissions.has(request.permission)
    && [...request.allowedScopes].some((scope) => facts.scopes.has(scope))
    && facts.objectAccessible
    && facts.sodAllowed;
  if (!allowed) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
}
