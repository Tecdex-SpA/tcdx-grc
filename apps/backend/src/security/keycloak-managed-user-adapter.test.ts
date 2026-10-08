import { describe, expect, it, vi } from "vitest";
import { KeycloakManagedUserAdapter, PROVISION_RECONCILIATION_ATTRIBUTE } from "./keycloak-managed-user-adapter.js";

const marker = "abcdefghijklmnopqrstuvwxyz012345";
const userId = "018f47f2-6170-7bd0-9d43-12f644a2b211";
const config = { baseUrl: new URL("http://192.168.2.46:8180"),
  issuer: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity",
  clientId: "tcdx-grc-managed-identity-provisioner", clientSecret: "fixture" };
const user = { id: userId, username: "named-person", firstName: "Named Person", enabled: true,
  attributes: { [PROVISION_RECONCILIATION_ATTRIBUTE]: [marker] } };

describe("Keycloak Managed User adapter reconciliation", () => {
  it("includes the marker in the single create-user payload", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/token")) return Response.json({ access_token: "test-token" });
      if (url.endsWith("/users/profile")) return Response.json({ attributes: [{ name: PROVISION_RECONCILIATION_ATTRIBUTE,
        permissions: { view: ["admin"], edit: ["admin"] } }] });
      expect(url).toBe("http://192.168.2.46:8180/admin/realms/tcdx-managed-identity/users");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({ username: "named-person",
        requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"],
        attributes: { [PROVISION_RECONCILIATION_ATTRIBUTE]: [marker] } });
      return new Response(null, { status: 201, headers: { location: `${url}/${userId}` } });
    });
    const adapter = new KeycloakManagedUserAdapter(config, fetcher as typeof fetch);
    await expect(adapter.createManagedUser({ username: "named-person", displayName: "Named Person", marker })).resolves.toBe(userId);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("refuses create before mutation when the realm profile ignores the marker", async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith("/token")
      ? Response.json({ access_token: "test-token" })
      : Response.json({ attributes: [{ name: "username" }, { name: "email" }] }));
    const adapter = new KeycloakManagedUserAdapter(config, fetcher as typeof fetch);
    await expect(adapter.createManagedUser({ username: "named-person", displayName: "Named Person", marker }))
      .rejects.toMatchObject({ code: "TCDX.PROVIDER.FAILURE" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([url]) => !String(url).endsWith("/admin/realms/tcdx-managed-identity/users"))).toBe(true);
  });

  it("refuses create if the technical marker becomes required for ordinary users", async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith("/token")
      ? Response.json({ access_token: "test-token" })
      : Response.json({ attributes: [{ name: PROVISION_RECONCILIATION_ATTRIBUTE,
        permissions: { view: ["admin"], edit: ["admin"] }, required: { roles: ["user"] } }] }));
    await expect(new KeycloakManagedUserAdapter(config, fetcher as typeof fetch)
      .createManagedUser({ username: "named-person", displayName: "Named Person", marker }))
      .rejects.toMatchObject({ code: "TCDX.PROVIDER.FAILURE" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("queries a fixed marker filter without exposing an eighth adapter method", async () => {
    const offsets: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("/token")) return Response.json({ access_token: "test-token" });
      const query = new URL(url).searchParams;
      expect(query.get("q")).toBe(`${PROVISION_RECONCILIATION_ATTRIBUTE}:${marker}`);
      offsets.push(query.get("first") ?? "");
      return Response.json(query.get("first") === "0" ? [user] : []);
    });
    const adapter = new KeycloakManagedUserAdapter(config, fetcher as typeof fetch);
    await expect(adapter.listManagedUsers(0, 2, marker)).resolves.toMatchObject([user]);
    await expect(adapter.listManagedUsers(1, 2, marker)).resolves.toEqual([]);
    expect(offsets).toEqual(["0", "1"]);
    expect(Object.getOwnPropertyNames(KeycloakManagedUserAdapter.prototype).filter((name) => name !== "constructor"
      && !name.startsWith("_") && !["token", "authHeaders", "expect", "call"].includes(name)).sort()).toEqual([
      "createManagedUser", "getManagedUser", "listManagedUsers", "removeManagedUserTotpCredential",
      "revokeManagedUserSessions", "setManagedUserEnabled", "setTemporaryPassword"
    ]);
  });

  it("fails closed when the marker query returns contradictory metadata", async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith("/token")
      ? Response.json({ access_token: "test-token" })
      : Response.json([{ ...user, attributes: { [PROVISION_RECONCILIATION_ATTRIBUTE]: ["other-marker"] } }]));
    const adapter = new KeycloakManagedUserAdapter(config, fetcher as typeof fetch);
    await expect(adapter.listManagedUsers(0, 2, marker)).rejects.toMatchObject({ code: "TCDX.PROVIDER.FAILURE" });
  });

  it("sets only a temporary password on the fixed user credential endpoint", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/token")) return Response.json({ access_token: "test-token" });
      expect(url).toBe(`http://192.168.2.46:8180/admin/realms/tcdx-managed-identity/users/${userId}/reset-password`);
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(String(init?.body))).toEqual({ type: "password", value: "fixture-only", temporary: true });
      return new Response(null, { status: 204 });
    });
    await new KeycloakManagedUserAdapter(config, fetcher as typeof fetch).setTemporaryPassword(userId, "fixture-only");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("removes only OTP credentials and preserves other required actions", async () => {
    const deleted: string[] = [];
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/token")) return Response.json({ access_token: "test-token" });
      if (url.endsWith(`/users/${userId}`) && init?.method !== "PUT") return Response.json({
        ...user, requiredActions: ["UPDATE_PASSWORD"]
      });
      if (url.endsWith(`/users/${userId}/credentials`)) return Response.json([
        { id: "password-credential", type: "password" }, { id: "otp-credential", type: "otp" }
      ]);
      if (init?.method === "DELETE") {
        deleted.push(url);
        return new Response(null, { status: 204 });
      }
      expect(init?.method).toBe("PUT");
      expect(url).toBe(`http://192.168.2.46:8180/admin/realms/tcdx-managed-identity/users/${userId}`);
      expect(JSON.parse(String(init?.body))).toEqual({ requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"] });
      return new Response(null, { status: 204 });
    });
    await new KeycloakManagedUserAdapter(config, fetcher as typeof fetch).removeManagedUserTotpCredential(userId);
    expect(deleted).toEqual([`http://192.168.2.46:8180/admin/realms/tcdx-managed-identity/users/${userId}/credentials/otp-credential`]);
  });
});
