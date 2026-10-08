import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test.use({ screenshot: "off", trace: "off" });
const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b711", personId = "018f47f2-6170-7bd0-9d43-12f644a2b712", memberId = "018f47f2-6170-7bd0-9d43-12f644a2b713";
const roleIds = ["018f47f2-6170-7bd0-9d43-12f644a2b714", "018f47f2-6170-7bd0-9d43-12f644a2b715"];
const identity = { user_identity_id: personId, display_name: "Persona controlada", provider: "tcdx-managed-identity", provider_display: "Tecdex Managed Identity", lifecycle_state: "active" };
const company = { tenant_id: tenantId, tenant_code: "LOCAL", legal_name: "Empresa controlada SpA", display_name: "Empresa controlada", default_timezone: "America/Santiago", lifecycle_state: "active", current_subscription: null };
const pageOf = (items: unknown[]) => ({ items, page: { has_more: false, next_cursor: null } });
const progress = { tenant_id: tenantId, user_identity_id: personId, membership_id: memberId, initial_assignment_id: roleIds[0], completed_steps: ["tenant_create", "tenant_bootstrap"], pending_steps: [] };
const tenantCodes = ["platform.membership.read", "platform.membership.create", "platform.role.read", "platform.role.assign", "platform.user_identity.read"];
const platformCodes = ["platform.tenant.read", "platform.tenant.create", "platform.user_identity.read", "platform.managed_identity.create", "platform.membership.read", "platform.role.read", "platform.role.assign"];
async function runtime(page: Page, options: { platform?: boolean; dual?: boolean; tenantReadsOnly?: boolean; noPlatformAssign?: boolean; revokeUncertain?: boolean; wrongTenant?: boolean; assigned?: boolean; refetchFailure?: boolean; unconfirmedRole?: boolean; missing?: boolean; partial?: boolean; rolePartial?: boolean; empty?: boolean; existing?: boolean; deny?: number } = {}) {
  await page.addInitScript(() => sessionStorage.setItem("tcdx.access_token", "d3-local-fixture-token"));
  const requests: { path: string; method: string; body: unknown; key?: string; tenant?: string; query: string; etag?: string }[] = [];
  let member: Record<string, unknown> | undefined = options.existing ? makeMember() : undefined;
  let revokeUncertain = !!options.revokeUncertain;
  let companyCreated = false, partial = !!options.partial, rolePartial = !!options.rolePartial, refetchFailure = !!options.refetchFailure, unconfirmedRole = !!options.unconfirmedRole;
  function makeMember() { return { tenant_membership_id: memberId, tenant_id: tenantId, user_identity_id: personId, membership_state: "active", joined_at: "2026-01-01T00:00:00Z", ended_at: null, user_identity: { display_name: identity.display_name, email_normalized: null, lifecycle_state: "active", last_authenticated_at: null }, roles: options.assigned ? [{ membership_role_id: roleIds[0], role_id: roleIds[0], role_name: "Responsable del servidor", scope_kind: "tenant", valid_from: "2020-01-01T00:00:00Z", valid_to: null, etag: "a".repeat(64) }] as Record<string, unknown>[] : [] as Record<string, unknown>[] }; }
  const credential = `local-fixture-${crypto.randomUUID()}`;
  await page.route("**/api/v1/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    requests.push({ path, method, query: url.search, tenant: request.headers()["x-tcdx-tenant-id"], etag: request.headers()["if-match"], body: request.postData() ? request.postDataJSON() : undefined, ...(request.headers()["idempotency-key"] ? { key: request.headers()["idempotency-key"] } : {}) });
    const deny = (status: number, details?: unknown) => route.fulfill({ status, json: { code: status === 403 ? "TCDX.AUTHORIZATION.DENIED" : "TCDX.DEPENDENCY.UNAVAILABLE", message: "internal-unsafe-details", correlation_id: tenantId, retryable: status >= 500, ...(details ? { details } : {}) } });
    if (path === "/api/v1/access/me") return route.fulfill({ json: { available_tenant_contexts: options.platform && !options.dual ? [] : [{ tenant_id: tenantId, tenant_display_name: company.display_name, tenant_membership_id: tenantId, membership_state: "active", effective_role_codes: ["UNTRUSTED_DISPLAY_ROLE"] }], effective_platform_role_codes: options.platform ? ["UNTRUSTED_DISPLAY_ROLE"] : [] } });
    if (path === "/api/v1/auth/me/authorization") return route.fulfill({ json: { evaluated_at: new Date().toISOString(), platform_permissions: options.platform ? platformCodes.filter(code => (!options.noPlatformAssign || code !== "platform.role.assign") && (!options.tenantReadsOnly || !["platform.membership.read", "platform.role.read"].includes(code))) : [], tenant_permissions: options.platform && !options.dual ? null : { tenant_id: options.wrongTenant ? personId : tenantId, permissions: options.missing ? {} : Object.fromEntries(tenantCodes.map(code => [code, [{ scope_kind: "tenant" }]])) } } });
    if (path === "/api/v1/user-identities") {
      const platform = url.searchParams.get("mode") === "platform_search";
      expect(request.headers()["x-tcdx-tenant-id"]).toBe(platform ? undefined : tenantId);
      if (!platform) { expect(url.searchParams.get("mode")).toBe("tenant_exact"); expect(["email", "username"]).toContain(url.searchParams.get("criterion")); expect(url.searchParams.has("page[size]")).toBe(false); }
      return route.fulfill({ json: { items: options.empty ? [] : [{ ...identity, ...(options.existing && !platform ? { existing_membership_id: memberId } : {}) }], meta: { has_more: false, next_cursor: null } } });
    }
    if (path === "/api/v1/platform/managed-identities" && method === "POST") { expect(request.headers()["x-tcdx-tenant-id"]).toBeUndefined(); return route.fulfill({ status: 201, json: { identity: { ...identity, username: "persona.controlada", identity_lifecycle_state: "active", enabled: true, mfa_enrolled: false, issuer: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity", subject_reference: "local-subject" }, credential_disclosed: true, temporary_credential: credential } }); }
    if (path === "/api/v1/platform/tenants:initial-onboarding") {
      expect(request.headers()["x-tcdx-tenant-id"]).toBeUndefined(); expect(request.postDataJSON().tenant).toMatchObject({ tenant_code: "LOCAL", default_timezone: "America/Santiago" });
      expect(request.postDataJSON().initial_administrator.user_identity_id).toBe(personId);
      if (options.deny) return deny(options.deny);
      companyCreated = true;
      if (partial) { partial = false; return deny(503, { onboarding_progress: { ...progress, completed_steps: ["tenant_create"], pending_steps: ["tenant_bootstrap"] } }); }
      return route.fulfill({ status: 201, json: progress });
    }
    if (path === "/api/v1/platform/tenants") { if (companyCreated && refetchFailure) { refetchFailure = false; return deny(503); } return route.fulfill({ json: pageOf(companyCreated || options.dual || options.existing ? [company] : []) }); }
    if (path === `/api/v1/platform/tenants/${tenantId}`) return route.fulfill({ json: company });
    if (path === "/api/v1/roles") return route.fulfill({ json: pageOf(roleIds.map((id, i) => ({ role_id: id, role_code: `SERVER_ROLE_${i}`, name: i ? "Revisor del servidor" : "Responsable del servidor", tenant_id: tenantId, ownership_class: "TENANT_OWNED", lifecycle_state: "published", is_baseline: true }))) });
    if (path === "/api/v1/memberships" && method === "POST") { expect(request.postDataJSON()).toEqual({ user_identity_id: personId }); expect(request.headers()["x-tcdx-tenant-id"]).toBe(tenantId); member = makeMember(); return route.fulfill({ status: 202, json: { operation_id: "membershipCreate", status: "completed", resource_id: memberId, result: member } }); }
    if (path === "/api/v1/memberships") return route.fulfill({ json: pageOf(member ? [member] : []) });
    if (path === `/api/v1/memberships/${memberId}`) return member ? route.fulfill({ json: member }) : deny(404);
    if (path === `/api/v1/memberships/${memberId}/role-assignments`) {
      const body = request.postDataJSON(); expect(body.scope_kind).toBe("tenant"); expect(request.headers()["x-tcdx-tenant-id"]).toBe(tenantId);
      if (rolePartial && body.role_id === roleIds[1]) { rolePartial = false; return deny(503); }
      if (unconfirmedRole) { unconfirmedRole = false; return route.fulfill({ status: 202, json: { result: {} } }); }
      (member!.roles as Record<string, unknown>[]).push({ role_id: body.role_id, role_name: body.role_id === roleIds[0] ? "Responsable del servidor" : "Revisor del servidor", scope_kind: "tenant", valid_from: "2020-01-01T00:00:00Z", valid_to: null });
      return route.fulfill({ status: 202, json: { result: {} } });
    }
    if (path === `/api/v1/role-assignments/${roleIds[0]}:revoke`) {
      expect(request.postDataJSON()).toEqual({ reason: "Revisión controlada" });
      expect(request.headers()["if-match"]).toBe(`"${"a".repeat(64)}"`);
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      expect(url.searchParams.get("tenant_id")).toBe(options.platform && !options.noPlatformAssign ? tenantId : null);
      expect(request.headers()["x-tcdx-tenant-id"]).toBe(options.platform && !options.noPlatformAssign ? undefined : tenantId);
      (member!.roles as Record<string, unknown>[])[0]!.valid_to = "2020-01-02T00:00:00Z";
      if (revokeUncertain) { revokeUncertain = false; return route.abort("failed"); }
      return route.fulfill({ status: 202, json: { result: {} } });
    }
    return deny(404);
  });
  return { requests, credential };
}
async function companyFields(page: Page) {
  await page.goto("/configuraciones/empresas"); await page.getByRole("button", { name: "Crear empresa", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Datos de empresa" })).toBeFocused();
  await page.getByLabel("Código de empresa", { exact: true }).fill("LOCAL"); await page.getByLabel("Razón social", { exact: true }).fill(company.legal_name);
  await page.getByLabel("Nombre visible de empresa").fill(company.display_name); await page.getByLabel("Zona horaria IANA").fill("America/Santiago");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}
async function existingIdentity(page: Page) {
  await page.getByLabel("Nombre de la persona").fill("Persona controlada"); await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("radio", { name: /Persona controlada/ }).check(); await page.getByRole("button", { name: "Revisar resumen" }).click();
}
async function tenantSelect(page: Page) {
  await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`); await page.getByRole("button", { name: "Agregar usuario", exact: true }).click();
  await page.getByLabel("Correo completo").fill("persona@example.test"); await page.getByRole("button", { name: "Buscar", exact: true }).click(); await page.getByRole("radio", { name: /Persona controlada/ }).check();
  await page.getByRole("checkbox", { name: "Responsable del servidor" }).check();
}
async function screenshot(page: Page, name: string, project: string) {
  await mkdir("/tmp/tcdx-grc-step23l-tenant-onboarding-d3-r-ui", { recursive: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `/tmp/tcdx-grc-step23l-tenant-onboarding-d3-r-ui/${name}-${project}.png`, fullPage: true, mask: [page.getByLabel("Credencial temporal emitida")] });
}
test("A: company with existing identity uses exact onboarding boundary, refetch and no manual IDs", async ({ page }, info) => {
  const r = await runtime(page, { platform: true }); await companyFields(page); await existingIdentity(page);
  await expect(page.getByRole("heading", { name: "Resumen" })).toBeFocused();
  await page.getByRole("button", { name: "Confirmar creación" }).dblclick(); await expect(page.getByText("Administrador inicial establecido.")).toBeVisible();
  expect(r.requests.filter(r => r.path.endsWith("tenants:initial-onboarding"))).toHaveLength(1);
  expect(r.requests.some(r => /bootstrap|role-assignments/.test(r.path))).toBe(false);
  expect(r.requests.filter(r => r.path.endsWith("/platform/tenants") && r.method === "GET").length).toBeGreaterThan(1);
  await expect(page.locator(".onboarding-wizard")).not.toContainText(personId); await screenshot(page, "company-result", info.project.name);
});
test("B: MI provisioning reuses one-time disclosure across summary, partial failure and same-key recovery", async ({ page }, info) => {
  const r = await runtime(page, { platform: true, partial: true }); const logged: string[] = []; page.on("console", message => logged.push(message.text()));
  await companyFields(page); await page.getByRole("radio", { name: "Nueva Tecdex Managed Identity" }).check();
  await page.getByLabel("Nombre visible", { exact: true }).fill("Persona controlada"); await page.getByLabel("Nombre de usuario", { exact: true }).fill("persona.controlada"); await page.getByLabel("Referencia de verificación de persona").fill("Referencia local controlada");
  await page.getByRole("button", { name: "Confirmar provisión" }).dblclick(); await expect(page.getByLabel("Credencial temporal emitida")).toHaveText(r.credential);
  await page.getByRole("button", { name: "Revisar resumen" }).click(); await expect(page.getByLabel("Credencial temporal emitida")).toHaveText(r.credential);
  await page.getByRole("button", { name: "Confirmar creación" }).click(); await expect(page.getByRole("alert", { name: "Resultado de creación de empresa" })).toContainText("La identidad fue creada"); await expect(page.getByText("Empresa creada. Administrador inicial pendiente de completar.")).toBeVisible();
  await expect(page.getByLabel("Credencial temporal emitida")).toHaveText(r.credential); await screenshot(page, "mi-partial", info.project.name);
  await page.getByRole("button", { name: "Revisar estado para continuar" }).click(); await page.getByRole("button", { name: "Continuar alta inicial", exact: true }).click(); await expect(page.getByText("Administrador inicial establecido.")).toBeVisible();
  const onboarding = r.requests.filter(r => r.path.endsWith("tenants:initial-onboarding")); expect(onboarding).toHaveLength(2); expect(onboarding[0]!.key).toBe(onboarding[1]!.key);
  expect(r.requests.filter(r => r.path.endsWith("managed-identities") && r.method === "POST")).toHaveLength(1);
  expect(logged.join(" ")).not.toContain(r.credential); expect(await page.evaluate(v => [localStorage, sessionStorage].some(s => Object.values(s).some(x => String(x).includes(v))), r.credential)).toBe(false);
  await page.getByRole("button", { name: "Cerrar resultado" }).click(); await expect(page.getByLabel("Credencial temporal emitida")).toHaveCount(0);
});
test("C: tenant explicit lookup, runtime role catalog, membership and server refetch", async ({ page }, info) => {
  const r = await runtime(page); await tenantSelect(page); await page.getByRole("button", { name: "Confirmar incorporación" }).dblclick();
  await expect(page.getByText("Usuario incorporado. Roles confirmados desde el servidor.")).toBeVisible();
  expect(r.requests.filter(r => r.path === "/api/v1/memberships" && r.method === "POST")).toHaveLength(1);
  expect(r.requests.filter(r => r.path.endsWith("role-assignments"))).toHaveLength(1);
  expect(r.requests.filter(r => r.path === "/api/v1/memberships" && r.method === "GET").length).toBeGreaterThan(2);
  await screenshot(page, "tenant-result", info.project.name);
});
test("D: tenant new Managed Identity is handoff, never credential provisioning", async ({ page }, info) => {
  const r = await runtime(page); await page.goto("/configuraciones/usuarios"); await page.getByRole("button", { name: "Agregar usuario" }).click(); await page.getByRole("radio", { name: "Nueva Tecdex Managed Identity" }).check();
  await expect(page.getByText(/Solicita a un administrador de plataforma/)).toBeVisible(); await expect(page.getByRole("button", { name: "Confirmar provisión" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ir a Identidades gestionadas" })).toHaveCount(0); expect(r.requests.some(r => r.method === "POST")).toBe(false); await screenshot(page, "tenant-handoff", info.project.name);
});
test("E: partial roles recover only failed assignment with stable key and no repeated Membership", async ({ page }) => {
  const r = await runtime(page, { rolePartial: true }); await tenantSelect(page); await page.getByRole("checkbox", { name: "Revisor del servidor" }).check(); await page.getByRole("button", { name: "Confirmar incorporación" }).click();
  await expect(page.getByText(/Usuario incorporado. Algunos roles quedaron pendientes./)).toBeVisible(); await page.getByRole("button", { name: "Salir del resultado pendiente" }).click(); await page.getByRole("button", { name: "Continuar incorporación" }).click(); await page.getByRole("button", { name: "Revisar y completar roles pendientes" }).click(); await expect(page.getByText("Usuario incorporado. Roles confirmados desde el servidor.")).toBeVisible();
  expect(r.requests.filter(r => r.path === "/api/v1/memberships" && r.method === "POST")).toHaveLength(1);
  const roles = r.requests.filter(r => r.path.endsWith("role-assignments")); expect(roles).toHaveLength(3); expect(roles[1]!.key).toBe(roles[2]!.key);
});
test("F: tenant privacy has explicit lookup only, no typing requests, wildcard or global list", async ({ page }) => {
  const r = await runtime(page, { empty: true }); await page.goto("/configuraciones/usuarios"); await page.getByRole("button", { name: "Agregar usuario" }).click();
  await page.getByLabel("Correo completo").fill("hidden@example.test"); expect(r.requests.filter(r => r.path === "/api/v1/user-identities")).toHaveLength(0);
  await expect(page.getByLabel("Correo completo")).toHaveAttribute("autocomplete", "off"); await expect(page.getByRole("combobox", { name: "Criterio de búsqueda", exact: true }).getByRole("option", { name: "Nombre", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Buscar", exact: true }).click(); await expect(page.getByText("No hay una identidad elegible para incorporar con ese criterio.")).toBeVisible();
  await page.getByRole("combobox", { name: "Criterio de búsqueda", exact: true }).selectOption("username"); await page.getByLabel("Nombre de usuario exacto").fill("persona*"); await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeDisabled();
  expect(r.requests.filter(r => r.path === "/api/v1/user-identities")).toHaveLength(1); expect(r.requests.some(r => r.method === "POST")).toBe(false);
});
test("existing active Membership is reused and its roles assigned independently", async ({ page }) => {
  const r = await runtime(page, { existing: true }); await tenantSelect(page); await page.getByRole("button", { name: "Confirmar incorporación" }).click(); await expect(page.getByText("Usuario incorporado. Roles confirmados desde el servidor.")).toBeVisible();
  expect(r.requests.some(r => r.path === "/api/v1/memberships" && r.method === "POST")).toBe(false);
});
test("platform authority and display role metadata confer no tenant create action", async ({ page }) => {
  await runtime(page, { missing: true }); await page.goto("/configuraciones/usuarios"); await expect(page.getByRole("button", { name: "Agregar usuario" })).toHaveCount(0);
});
test("company required fields, timezone error and back navigation keep business inputs", async ({ page }) => {
  await runtime(page, { platform: true }); await page.goto("/configuraciones/empresas"); await page.getByRole("button", { name: "Crear empresa" }).click(); await page.getByRole("button", { name: "Continuar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Datos de empresa" })).toBeVisible();
  await page.getByLabel("Código de empresa", { exact: true }).fill("LOCAL"); await page.getByLabel("Razón social", { exact: true }).fill(company.legal_name); await page.getByLabel("Nombre visible de empresa").fill(company.display_name); await page.getByLabel("Zona horaria IANA").fill("invalid-zone"); await page.getByRole("button", { name: "Continuar", exact: true }).click(); await expect(page.getByRole("alert")).toContainText("IANA");
  await page.getByLabel("Zona horaria IANA").fill("America/Santiago"); await page.getByRole("button", { name: "Continuar", exact: true }).click(); await page.getByRole("button", { name: "Anterior" }).click(); await expect(page.getByLabel("Código de empresa", { exact: true })).toHaveValue("LOCAL");
});

test("G: dual platform and own-tenant authority supports both operations with distinct contexts", async ({ page }) => {
  const r = await runtime(page, { platform: true, dual: true }); await companyFields(page); await existingIdentity(page);
  await page.getByRole("button", { name: "Confirmar creación" }).click(); await expect(page.getByText("Administrador inicial establecido.")).toBeVisible();
  await tenantSelect(page); await page.getByRole("button", { name: "Confirmar incorporación" }).click(); await expect(page.getByText("Usuario incorporado. Roles confirmados desde el servidor.")).toBeVisible();
  expect(r.requests.find(r => r.path.endsWith("tenants:initial-onboarding"))!.tenant).toBeUndefined();
  expect(r.requests.find(r => r.path.endsWith("role-assignments"))!.tenant).toBe(tenantId);
});
test("H: platform-only projection includes role permission but never enables tenant assign", async ({ page }) => {
  const r = await runtime(page, { platform: true, existing: true, assigned: true }); await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  await expect(page.getByRole("button", { name: "Agregar usuario", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Asignar rol", exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog").getByRole("combobox", { name: "Selecciona un rol permitido" })).toHaveCount(0);
  expect(r.requests.some(r => r.method === "POST")).toBe(false);
});
test("wrong tenant projection cannot enable tenant incorporation or assignment", async ({ page }) => {
  const r = await runtime(page, { platform: true, dual: true, wrongTenant: true, existing: true }); await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  await expect(page.getByRole("button", { name: "Agregar usuario", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Asignar rol", exact: true })).toHaveCount(0); expect(r.requests.some(r => r.method === "POST")).toBe(false);
});
for (const platform of [false, true]) test(`${platform ? "platform explicit target" : "tenant own-context"} revoke preserves reason, CAS, idempotency and server refresh`, async ({ page }) => {
  const r = await runtime(page, { platform, existing: true, assigned: true }); await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click();
  page.on("dialog", async d => { await d.accept(d.type() === "prompt" ? "Revisión controlada" : undefined); });
  await page.getByRole("dialog").getByRole("button", { name: "Quitar rol", exact: true }).click();
  await expect(page.getByText("Rol revocado y auditado. Los demás roles se conservaron.")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Quitar rol", exact: true })).toHaveCount(0);
  expect(r.requests.filter(r => r.path.includes(":revoke"))).toHaveLength(1);
});
test("server receipt remains truthful if list refresh fails and is reconciled without another onboarding", async ({ page }) => {
  const r = await runtime(page, { platform: true, refetchFailure: true }); await companyFields(page); await existingIdentity(page);
  await page.getByRole("button", { name: "Confirmar creación" }).click();
  await expect(page.getByRole("alert", { name: "Resultado de creación de empresa" })).toContainText("Empresa creada y administrador inicial establecido");
  await expect(page.getByText("Empresa creada. Administrador inicial pendiente de completar.")).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar estado para continuar" }).click(); await expect(page.getByText("Administrador inicial establecido.")).toBeVisible();
  expect(r.requests.filter(r => r.path.endsWith("tenants:initial-onboarding"))).toHaveLength(1);
});
test("accepted role response without server assignment stays pending, then retries same intent", async ({ page }) => {
  const r = await runtime(page, { unconfirmedRole: true }); await tenantSelect(page); await page.getByRole("button", { name: "Confirmar incorporación" }).click();
  await expect(page.getByText(/Usuario incorporado. Algunos roles quedaron pendientes./)).toBeVisible();
  await expect(page.getByText("Usuario incorporado. Roles confirmados desde el servidor.")).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar y completar roles pendientes" }).click(); await expect(page.getByText("Usuario incorporado. Roles confirmados desde el servidor.")).toBeVisible();
  const assignments = r.requests.filter(r => r.path.endsWith("role-assignments")); expect(assignments).toHaveLength(2); expect(assignments[0]!.key).toBe(assignments[1]!.key);
  expect(r.requests.filter(r => r.path === "/api/v1/memberships" && r.method === "POST")).toHaveLength(1);
});
test("closing provisioned identity before onboarding retains identity and destroys credential disclosure", async ({ page }) => {
  const r = await runtime(page, { platform: true }); await companyFields(page); await page.getByRole("radio", { name: "Nueva Tecdex Managed Identity" }).check();
  await page.getByLabel("Nombre visible", { exact: true }).fill("Persona controlada"); await page.getByLabel("Nombre de usuario", { exact: true }).fill("persona.controlada"); await page.getByLabel("Referencia de verificación de persona").fill("Referencia local controlada");
  await page.getByRole("button", { name: "Confirmar provisión" }).click(); await expect(page.getByLabel("Credencial temporal emitida")).toHaveText(r.credential);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click(); await page.getByRole("button", { name: "Continuar alta inicial", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeFocused(); await expect(page.getByLabel("Credencial temporal emitida")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirmar provisión" })).toHaveCount(0);
  await page.getByRole("button", { name: "Confirmar creación" }).click(); await expect(page.getByText("Administrador inicial establecido.")).toBeVisible();
  expect(r.requests.filter(r => r.path.endsWith("managed-identities") && r.method === "POST")).toHaveLength(1);
});
for (const status of [403, 409, 422]) test(`onboarding ${status} shows safe business error and keeps the original retry key`, async ({ page }) => {
  const r = await runtime(page, { platform: true, deny: status }); await companyFields(page); await existingIdentity(page); await page.getByRole("button", { name: "Confirmar creación" }).click();
  const feedback = page.getByRole("alert", { name: "Resultado de creación de empresa" }); await expect(feedback).toBeVisible(); await expect(feedback).not.toContainText("internal-unsafe-details"); await expect(feedback).not.toContainText(tenantId);
  await page.getByRole("button", { name: "Salir del resultado pendiente" }).click(); await page.getByRole("button", { name: "Continuar alta inicial", exact: true }).click();
  await page.getByRole("button", { name: "Revisar estado para continuar" }).click(); await page.getByRole("button", { name: "Continuar alta inicial", exact: true }).click();
  await expect(feedback).toBeVisible(); const calls = r.requests.filter(r => r.path.endsWith("tenants:initial-onboarding")); expect(calls).toHaveLength(2); expect(calls[0]!.key).toBe(calls[1]!.key);
});
test("I/J: branding, keyboard steps, labels, focus return and responsive tenant form", async ({ page }, info) => {
  const r = await runtime(page, { platform: true, dual: true }); await companyFields(page);
  await expect(page.getByRole("heading", { name: "Administrador inicial", exact: true })).toBeFocused();
  const criterion = page.getByRole("combobox", { name: "Criterio de búsqueda", exact: true }); await criterion.focus(); await expect(criterion).toBeFocused(); await page.keyboard.press("c"); await page.keyboard.press("Tab"); await expect(criterion).toHaveValue("email");
  await expect(page.getByLabel("Correo completo")).toBeFocused(); await page.keyboard.type("persona@example.test"); await page.keyboard.press("Tab"); await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeFocused(); await page.keyboard.press("Enter");
  const selected = page.getByRole("radio", { name: /Persona controlada/ }); await selected.focus(); await page.keyboard.press("Space"); await expect(selected).toBeChecked();
  await page.getByRole("button", { name: "Revisar resumen" }).click(); await expect(page.getByRole("heading", { name: "Resumen", exact: true })).toBeFocused();
  for (const button of await page.locator(".onboarding-wizard button:visible").all()) await expect(button).toHaveAccessibleName(/.+/);
  await screenshot(page, "keyboard-summary", info.project.name); await page.getByRole("button", { name: "Cancelar", exact: true }).click(); await expect(page.getByRole("button", { name: "Crear empresa", exact: true })).toBeFocused();
  await tenantSelect(page); await expect(page.getByRole("heading", { name: "Agregar usuario", exact: true })).toBeVisible(); await expect(page.getByRole("button", { name: "Confirmar incorporación" })).toBeEnabled();
  await expect(page.getByRole("img", { name: "Tecdex", exact: true })).toBeVisible(); await expect(page.locator("body")).not.toContainText("TCDX GRC"); await expect(page.locator("body")).not.toContainText("TCDX Managed Identity");
  await screenshot(page, "keyboard-tenant", info.project.name); await page.getByRole("button", { name: "Cancelar", exact: true }).click(); await expect(page.getByRole("button", { name: "Agregar usuario", exact: true })).toBeFocused();
  expect(r.requests.some(r => r.method === "POST")).toBe(false);
});

test("dual actor without platform revoke permission uses own tenant authority, never promotes platform read", async ({ page }) => {
  const r = await runtime(page, { platform: true, dual: true, noPlatformAssign: true, existing: true, assigned: true }); await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click(); page.on("dialog", async d => { await d.accept(d.type() === "prompt" ? "Revisión controlada" : undefined); });
  await page.getByRole("dialog").getByRole("button", { name: "Quitar rol", exact: true }).click(); await expect(page.getByText("Rol revocado y auditado. Los demás roles se conservaron.")).toBeVisible();
  expect(r.requests.find(r => r.path.includes(":revoke"))!.tenant).toBe(tenantId);
});
test("lost revoke response reconciles ended server state without a second mutation", async ({ page }) => {
  const r = await runtime(page, { platform: true, existing: true, assigned: true, revokeUncertain: true }); await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  await page.getByRole("button", { name: "Ver detalle", exact: true }).click(); page.on("dialog", async d => { await d.accept(d.type() === "prompt" ? "Revisión controlada" : undefined); });
  const revoke = page.getByRole("dialog").getByRole("button", { name: "Quitar rol", exact: true }); await revoke.click(); await expect(revoke).toBeEnabled();
  await revoke.click(); await expect(page.getByText("Rol revocado y auditado. Los demás roles se conservaron.")).toBeVisible();
  expect(r.requests.filter(r => r.path.includes(":revoke"))).toHaveLength(1);
});
test("membership dialog traps keyboard focus, Escape restores detail trigger", async ({ page }) => {
  await runtime(page, { existing: true, assigned: true }); await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  const trigger = page.getByRole("button", { name: "Ver detalle", exact: true }); await trigger.click(); const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "Cerrar detalle", exact: true }); await expect(close).toBeFocused();
  await expect(dialog.getByRole("combobox", { name: "Selecciona un rol permitido" })).toBeVisible();
  await page.keyboard.press("Shift+Tab"); await expect(dialog.getByRole("combobox", { name: "Selecciona un rol permitido" })).toBeFocused(); await page.keyboard.press("Tab"); await expect(close).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
});

test("dual actor reads own memberships and catalog using tenant grants when platform read grants are absent", async ({ page }) => {
  const r = await runtime(page, { platform: true, dual: true, tenantReadsOnly: true }); await tenantSelect(page); await page.getByRole("button", { name: "Confirmar incorporación" }).click();
  await expect(page.getByText("Usuario incorporado. Roles confirmados desde el servidor.")).toBeVisible();
  expect(r.requests.filter(r => ["/api/v1/memberships", "/api/v1/roles"].includes(r.path) && r.method === "GET").every(r => r.tenant === tenantId && !r.query.includes("tenant_id"))).toBe(true);
});
