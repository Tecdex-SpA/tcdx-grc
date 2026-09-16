export type OwnershipClass = "GLOBAL_REFERENCE" | "PLATFORM_CONTROL" | "TENANT_OWNED" | "TENANT_DERIVED";
export type PrincipalClass = "HUMAN_INTERACTIVE" | "MACHINE_TO_MACHINE";
export type ScopeKind = "platform" | "tenant" | "organizational_unit" | "process" | "service" | "audit_engagement" | "assigned_object" | "owned_object";

export type Principal = {
  principalClass: PrincipalClass;
  principalId: string;
};

export type RequestContext = {
  correlationId: string;
  requestId: string;
  principal: Principal | null;
  tenantId: string | null;
};
