import { describe, expect, it, vi } from "vitest";
import { ManagedIdentityService, reconcileProvisionMarker } from "./managed-identity-service.js";
import type { PlatformActor } from "./platform-authority.js";
import type { ManagedUser, ManagedUserAdminPort } from "./keycloak-managed-user-adapter.js";

const target = "018f47f2-6170-7bd0-9d43-12f644a2b211";
const identity = { principalClass: "HUMAN_INTERACTIVE" as const,
  principalId: "018f47f2-6170-7bd0-9d43-12f644a2b212", tokenId: "test-token",
  expiresAt: new Date(Date.now() + 60_000) };

const calls = [
  (service: ManagedIdentityService, actor: PlatformActor) => service.list(actor, {}),
  (service: ManagedIdentityService, actor: PlatformActor) => service.read(actor, target),
  (service: ManagedIdentityService, actor: PlatformActor) => service.provision(actor,
    { display_name: "Named person", username: "person", person_verification_ref: "verified" }, "key", target),
  (service: ManagedIdentityService, actor: PlatformActor) => service.disable(actor, target, { reason: "Security" }, "key", target),
  (service: ManagedIdentityService, actor: PlatformActor) => service.enable(actor, target, { reason: "Security" }, "key", target),
  (service: ManagedIdentityService, actor: PlatformActor) => service.passwordReset(actor, target,
    { reason: "Security", person_verification_ref: "verified" }, "key", target),
  (service: ManagedIdentityService, actor: PlatformActor) => service.mfaReset(actor, target, { reason: "Security" }, "key", target),
  (service: ManagedIdentityService, actor: PlatformActor) => service.sessionRevoke(actor, target, { reason: "Security" }, "key", target)
];

describe("Managed Identity Platform authorization", () => {
  it.each(["TENANT_ADMIN", "PLATFORM_SUPPORT"])("denies %s on every command before provider or database access", async (role) => {
    const admin = { listManagedUsers: vi.fn(), getManagedUser: vi.fn(), createManagedUser: vi.fn() };
    const database = { executeQuery: vi.fn() };
    const service = new ManagedIdentityService(database as never, admin as never, vi.fn());
    const actor: PlatformActor = { identity, roles: [role], permissions: new Set([
      "platform.managed_identity.read", "platform.managed_identity.create", "platform.managed_identity.administer"
    ]) };
    for (const call of calls) await expect(call(service, actor)).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
    expect(admin.listManagedUsers).not.toHaveBeenCalled();
    expect(admin.getManagedUser).not.toHaveBeenCalled();
    expect(admin.createManagedUser).not.toHaveBeenCalled();
    expect(database.executeQuery).not.toHaveBeenCalled();
  });

  it("denies a Platform Admin missing the exact operation permission", async () => {
    const service = new ManagedIdentityService({} as never, {} as never, vi.fn());
    const actor: PlatformActor = { identity, roles: ["PLATFORM_ADMIN"], permissions: new Set() };
    for (const call of calls) await expect(call(service, actor)).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
  });
});

const marker = "opaqueMarkerFromCSPRNG0123456789";
const facts = { username: "named-person", displayName: "Named Person", email: null, marker };
const matchingUser: ManagedUser = {
  id: target, username: facts.username, firstName: facts.displayName, enabled: true,
  requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"],
  attributes: { tcdx_provision_reconciliation_marker: [marker] }, mfaEnrolled: false
};

function markerAdmin(pages: ManagedUser[][]) {
  let calls = 0;
  const listManagedUsers = vi.fn(async (first: number, max: number, searched?: string) => {
    expect(max).toBe(2);
    expect(searched).toBe(marker);
    expect(first).toBe(calls === 0 ? 0 : 1);
    calls += 1;
    return pages.shift() ?? [];
  });
  const getManagedUser = vi.fn();
  return { admin: { listManagedUsers, getManagedUser } as unknown as ManagedUserAdminPort,
    listManagedUsers, getManagedUser };
}

describe("Provision marker reconciliation is the only adoption proof", () => {
  it("returns no identity for zero marker matches, even if a username or email lookup could match", async () => {
    const { admin, getManagedUser, listManagedUsers } = markerAdmin([[]]);
    await expect(reconcileProvisionMarker(admin, facts)).resolves.toBeNull();
    expect(listManagedUsers).toHaveBeenCalledTimes(1);
    expect(getManagedUser).not.toHaveBeenCalled();
  });

  it("recovers the stable subject from exactly one fully compatible marker match", async () => {
    const { admin, listManagedUsers } = markerAdmin([[matchingUser], []]);
    await expect(reconcileProvisionMarker(admin, facts)).resolves.toMatchObject({ id: target });
    expect(listManagedUsers).toHaveBeenCalledTimes(2);
  });

  it.each([[[matchingUser, matchingUser]], [[matchingUser], [matchingUser]]])
    ("fails closed for ambiguous matches on the first or next page", async (...pages) => {
      const { admin } = markerAdmin(pages);
      await expect(reconcileProvisionMarker(admin, facts)).rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
    });

  it.each([
    [{ ...matchingUser, username: "other-person" }, "username"],
    [{ ...matchingUser, email: "other@example.test" }, "email"],
    [{ ...matchingUser, firstName: "Other Person" }, "display name"],
    [{ ...matchingUser, attributes: {} }, "username without marker"],
    [{ ...matchingUser, attributes: { tcdx_provision_reconciliation_marker: ["other-marker"] } }, "email without marker"]
  ])("fails closed for contradictory %s (%s)", async (candidate) => {
    const { admin } = markerAdmin([[candidate], []]);
    await expect(reconcileProvisionMarker(admin, facts)).rejects.toMatchObject({ code: "TCDX.CONFLICT.RECOVERY_REQUIRED" });
  });

  it("fails closed if a marker page cannot be read completely", async () => {
    const admin = { listManagedUsers: vi.fn().mockResolvedValueOnce([matchingUser])
      .mockRejectedValueOnce(new Error("query unavailable")) } as unknown as ManagedUserAdminPort;
    await expect(reconcileProvisionMarker(admin, facts)).rejects.toThrow("query unavailable");
  });
});
