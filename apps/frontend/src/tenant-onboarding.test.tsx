import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CurrentPrincipalAuthorization } from "@tcdx-grc/contracts";
import { ApiClient, ApiProblem } from "./api-client.js";
import { AddTenantUser, InitialCompanyWizard, TenantUserIntent, addUserPermissions, discoverIdentity, initialOnboardingPermissions, onboardingError, tenantPresentationPermission, tenantRoleCatalog } from "./tenant-onboarding.js";
import source from "./tenant-onboarding.tsx?raw";
const tenant = "tenant-fixture", person = "person-fixture", memberId = "membership-fixture";
const identity = { user_identity_id: person, display_name: "Persona controlada", provider_display: "Proveedor controlado", lifecycle_state: "active" as const };
const projection = (codes: readonly string[], id = tenant): CurrentPrincipalAuthorization => ({ evaluated_at: new Date().toISOString(), platform_permissions: [], tenant_permissions: { tenant_id: id, permissions: Object.fromEntries(codes.map(code => [code, [{ scope_kind: "tenant" }]])) } });
const fakeApi = (functions: Record<string, unknown>) => functions as unknown as ApiClient;
const page = (items: unknown[], cursor: string | null = null) => ({ items, page: { has_more: cursor !== null, next_cursor: cursor } });
afterEach(() => vi.restoreAllMocks());
describe("D3 permission and transport boundaries", () => {
  it("requires exact permission, own context and tenant scope, without platform promotion", () => {
    expect(tenantPresentationPermission(projection(["platform.user_identity.read"]), tenant, "platform.user_identity.read")).toBe(true);
    for (const value of [null, projection([], tenant), projection(["platform.user_identity.read"], "foreign"), { ...projection([]), platform_permissions: ["platform.user_identity.read"] }]) expect(tenantPresentationPermission(value, tenant, "platform.user_identity.read")).toBe(false);
    const narrow = projection([]); narrow.tenant_permissions!.permissions["platform.user_identity.read"] = [{ scope_kind: "owned_object" }];
    expect(tenantPresentationPermission(narrow, tenant, "platform.user_identity.read")).toBe(false);
  });
  it("shows the wizard only for both effective platform codes", () => {
    const render = (codes: string[]) => renderToStaticMarkup(<InitialCompanyWizard api={fakeApi({})} permissions={new Set(codes)} authorizeFresh={async () => false} refetch={async () => {}}/>);
    expect(render([...initialOnboardingPermissions])).toContain("Crear empresa");
    for (const codes of [[], ["platform.tenant.create"], ["PLATFORM_ADMIN"], ["platform.user_identity.read"]]) expect(render(codes)).not.toContain("Crear empresa");
  });
  it("does not promote role names or platform codes to tenant add eligibility", () => {
    const render = (p: CurrentPrincipalAuthorization | null) => renderToStaticMarkup(<AddTenantUser api={fakeApi({})} tenantId={tenant} projection={p} authorizeFresh={async () => false} refetch={async () => {}}/>);
    expect(render(projection(addUserPermissions))).toContain("Agregar usuario");
    expect(render({ ...projection([]), platform_permissions: [...addUserPermissions] })).not.toContain("Agregar usuario");
    expect(render(projection(["TENANT_ADMIN"]))).not.toContain("Agregar usuario");
    expect(render({ ...projection(addUserPermissions), platform_permissions: [...addUserPermissions] })).toContain("Agregar usuario");
    expect(render({ ...projection(addUserPermissions, "foreign"), platform_permissions: [...addUserPermissions] })).not.toContain("Agregar usuario");
  });
  it("tenant exact uses authenticated context, safe projection and no pagination or secrets", async () => {
    const request = vi.fn(async () => ({ items: [{ ...identity, issuer: "internal", temporary_credential: "synthetic-value" }], meta: { has_more: false, next_cursor: null } }));
    const result = await discoverIdentity(fakeApi({ request }), "tenant_exact", "email", "person@example.test");
    expect(request).toHaveBeenCalledWith("/api/v1/user-identities?mode=tenant_exact&criterion=email&value=person%40example.test", { cache: "no-store" });
    expect(result.items).toEqual([identity]);
  });
  it("platform search omits selected tenant and keeps lookup metadata only", async () => {
    const platformGet = vi.fn(async () => ({ items: [{ ...identity, username: "persona", email_normalized: null }], meta: { has_more: false, next_cursor: null } }));
    expect((await discoverIdentity(fakeApi({ platformGet }), "platform_search", "display_name", "Persona")).items[0]).toMatchObject({ username: "persona" });
    expect(platformGet).toHaveBeenCalledTimes(1);
  });
  it.each([["display_name", "Persona"], ["username", "persona*"], ["username", "persona?"], ["email", ""]])("rejects tenant directory/prefix/empty criterion %s", async (criterion, value) => {
    const request = vi.fn(); await expect(discoverIdentity(fakeApi({ request }), "tenant_exact", criterion!, value!)).rejects.toThrow(); expect(request).not.toHaveBeenCalled();
  });
  it.each([{ items: [identity, identity], meta: { has_more: false, next_cursor: null } }, { items: [identity], meta: { has_more: true, next_cursor: "cursor" } }, { items: [{ ...identity, lifecycle_state: "inactive" }], meta: { has_more: false, next_cursor: null } }])("fails closed on invalid tenant response", async result => {
    await expect(discoverIdentity(fakeApi({ request: async () => result }), "tenant_exact", "username", "persona")).rejects.toThrow();
  });
  it("loads server catalog pages and rejects foreign roles and cursor cycles", async () => {
    const role = { role_id: "server-role", name: "Rol del servidor", ownership_class: "TENANT_OWNED", tenant_id: tenant, lifecycle_state: "published" };
    const request = vi.fn().mockResolvedValueOnce(page([role], "next")).mockResolvedValueOnce(page([{ ...role, role_id: "second" }]));
    expect(await tenantRoleCatalog(fakeApi({ request }), tenant)).toHaveLength(2);
    expect(request.mock.calls[1]![0]).toContain("page%5Bcursor%5D=next");
    await expect(tenantRoleCatalog(fakeApi({ request: async () => page([{ ...role, tenant_id: "foreign" }]) }), tenant)).rejects.toThrow();
    await expect(tenantRoleCatalog(fakeApi({ request: async () => page([role], "cycle") }), tenant)).rejects.toThrow();
  });
});
describe("D3 partial membership and role recovery", () => {
  function runtime(existing = false) {
    let member: { tenant_membership_id: string; tenant_id: string; user_identity_id: string; membership_state: string; roles: { role_id: string; scope_kind: string; valid_from: string; valid_to: null }[] } | undefined = existing ? { tenant_membership_id: memberId, tenant_id: tenant, user_identity_id: person, membership_state: "active", roles: [] } : undefined;
    let failSecond = true;
    const post = vi.fn(async (path: string, body: Record<string, unknown>, _key: string) => {
      if (path === "/api/v1/memberships") { member = { tenant_membership_id: memberId, tenant_id: tenant, user_identity_id: person, membership_state: "active", roles: [] }; return { result: member }; }
      if (body.role_id === "second" && failSecond) { failSecond = false; throw new ApiProblem({ code: "TCDX.DEPENDENCY.UNAVAILABLE", message: "unsafe detail", correlation_id: "fixture", retryable: true }, 503); }
      member!.roles.push({ role_id: String(body.role_id), scope_kind: "tenant", valid_from: "2020-01-01T00:00:00Z", valid_to: null }); return { result: {} };
    });
    const request = vi.fn(async (path: string) => path === "/api/v1/memberships" ? page(member ? [member] : []) : member);
    return { api: fakeApi({ post, request }), post, request };
  }
  it("keeps membership, same failed-role key, skips confirmed role and refetches on retry", async () => {
    const r = runtime(), refetch = vi.fn(async () => {}), intent = new TenantUserIntent(tenant, identity, ["first", "second"]);
    await expect(intent.complete(r.api, refetch)).rejects.toMatchObject({ status: 503 });
    expect(intent.membershipId).toBe(memberId);
    await intent.complete(r.api, refetch);
    expect(r.post.mock.calls.filter(([path]) => path === "/api/v1/memberships")).toHaveLength(1);
    expect(r.post.mock.calls.filter(([, body]) => body.role_id === "first")).toHaveLength(1);
    const second = r.post.mock.calls.filter(([, body]) => body.role_id === "second"); expect(second).toHaveLength(2); expect(second[0]![2]).toBe(second[1]![2]);
    expect(refetch).toHaveBeenCalledTimes(4);
  });
  it("reuses active existing own Membership without posting another", async () => {
    const r = runtime(true); await new TenantUserIntent(tenant, { ...identity, existing_membership_id: memberId }, ["first"]).complete(r.api, async () => {});
    expect(r.post.mock.calls.every(([path]) => path !== "/api/v1/memberships")).toBe(true);
  });
  it("reconciles a lost membership response before retry rather than duplicating", async () => {
    const r = runtime(), actual = r.api.post.bind(r.api); let lost = true;
    r.api.post = (async <T,>(path: string, body: Record<string, unknown>, key?: string): Promise<T> => { const result = await actual<T>(path, body, key); if (lost) { lost = false; throw new Error("uncertain network"); } return result; });
    const intent = new TenantUserIntent(tenant, identity, ["first"]);
    await expect(intent.complete(r.api, async () => {})).rejects.toThrow(); await intent.complete(r.api, async () => {});
    expect(r.post.mock.calls.filter(([path]) => path === "/api/v1/memberships")).toHaveLength(1);
  });
  it("rejects inactive or foreign membership without granting roles", async () => {
    const post = vi.fn(); const intent = new TenantUserIntent(tenant, { ...identity, existing_membership_id: memberId }, ["first"]);
    await expect(intent.complete(fakeApi({ post, request: async () => ({ tenant_id: "foreign", user_identity_id: person, membership_state: "active" }) }), async () => {})).rejects.toThrow(); expect(post).not.toHaveBeenCalled();
  });
  it("does not claim success when an accepted assignment is absent from server reads", async () => {
    const request = vi.fn(async () => ({ tenant_membership_id: memberId, tenant_id: tenant, user_identity_id: person, membership_state: "active", roles: [] }));
    const post = vi.fn(async () => ({ result: {} }));
    const intent = new TenantUserIntent(tenant, { ...identity, existing_membership_id: memberId }, ["first"]);
    const api = fakeApi({ request, post });
    await expect(intent.complete(api, async () => {})).rejects.toThrow("ROLE_NOT_CONFIRMED_BY_SERVER");
    await expect(intent.complete(api, async () => {})).rejects.toThrow("ROLE_NOT_CONFIRMED_BY_SERVER");
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
  });
  it("reconciles a lost assignment response and skips the committed role on retry", async () => {
    const r = runtime(true), actual = r.api.post.bind(r.api); let lost = true;
    r.api.post = (async <T,>(path: string, body: Record<string, unknown>, key?: string): Promise<T> => { const result = await actual<T>(path, body, key); if (lost) { lost = false; throw new Error("uncertain network"); } return result; });
    const intent = new TenantUserIntent(tenant, { ...identity, existing_membership_id: memberId }, ["first"]);
    await expect(intent.complete(r.api, async () => {})).rejects.toThrow(); await intent.complete(r.api, async () => {});
    expect(r.post).toHaveBeenCalledTimes(1);
  });
});
describe("D3 privacy and presentation errors", () => {
  it.each([401, 403, 404, 409, 400, 422, 503])("maps status %i without dumping backend details", status => {
    const error = new ApiProblem({ code: "TCDX.TEST.ERROR", message: "stack-secret-detail", correlation_id: "fixture", retryable: false }, status);
    expect(onboardingError(error)).not.toContain("stack-secret-detail");
  });
  it("uses no persistent identity/authority state, bootstrap calls or manual UUID inputs", () => {
    expect(source).not.toMatch(/localStorage|sessionStorage|console\.|effective_role_codes|PLATFORM_ADMIN|TENANT_ADMIN|TENANT_BOOTSTRAP/);
    expect(source).not.toMatch(/<input[^>]*(?:name|placeholder)=["'](?:user_identity_id|tenant_id|role_id)/);
    expect(source).toContain('autoComplete="off"');
  });
});
