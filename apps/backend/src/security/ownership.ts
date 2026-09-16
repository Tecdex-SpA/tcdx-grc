export type OwnershipClass = "GLOBAL_REFERENCE" | "PLATFORM_CONTROL" | "TENANT_OWNED" | "TENANT_DERIVED";

export type OwnedReference = {
  ownershipClass: OwnershipClass;
  tenantId: string | null;
};

export class ConcealedReferenceError extends Error {
  readonly code = "TCDX.RESOURCE.NOT_FOUND";

  constructor() {
    super("Resource not found");
  }
}

export function assertOwnershipShape(reference: OwnedReference): void {
  const tenantRequired = reference.ownershipClass === "TENANT_OWNED" || reference.ownershipClass === "TENANT_DERIVED";
  if (tenantRequired !== (reference.tenantId !== null)) throw new ConcealedReferenceError();
}

export function assertCompatibleReference(childTenantId: string, parent: OwnedReference): void {
  assertOwnershipShape(parent);
  if (parent.ownershipClass === "GLOBAL_REFERENCE" || parent.ownershipClass === "PLATFORM_CONTROL") return;
  if (parent.tenantId !== childTenantId) throw new ConcealedReferenceError();
}
