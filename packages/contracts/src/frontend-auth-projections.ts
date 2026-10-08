/** Type-only consumption of executable contracts 02/23; never RBAC authority. */
export type AuthenticationProvider =
  | "ZOHO"
  | "MICROSOFT_ENTRA_ID"
  | "GOOGLE_WORKSPACE"
  | "TCDX_MANAGED_IDENTITY";

export type AuthenticationProviderAvailability = {
  providers: { provider: AuthenticationProvider; available: boolean }[];
};

type StructuralScopeFields = {
  organizational_unit_id?: never;
  process_id?: never;
  service_id?: never;
  audit_id?: never;
};

export type TenantPermissionScope =
  | (StructuralScopeFields & { scope_kind: "tenant" | "assigned_object" | "owned_object" })
  | (Omit<StructuralScopeFields, "organizational_unit_id"> & { scope_kind: "organizational_unit"; organizational_unit_id: string })
  | (Omit<StructuralScopeFields, "process_id"> & { scope_kind: "process"; process_id: string })
  | (Omit<StructuralScopeFields, "service_id"> & { scope_kind: "service"; service_id: string })
  | (Omit<StructuralScopeFields, "audit_id"> & { scope_kind: "audit_engagement"; audit_id: string });

export type CurrentPrincipalAuthorization = {
  evaluated_at: string;
  platform_permissions: string[];
  tenant_permissions: null | {
    tenant_id: string;
    permissions: Record<string, TenantPermissionScope[]>;
  };
};
