import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.use({ screenshot: "off", trace: "off" });
const visualDirectory = "/tmp/tcdx-grc-step23l-mi7-r-ui";
test.beforeAll(async () => { await mkdir(visualDirectory, { recursive: true }); });

const id = "018f47f2-6170-7bd0-9d43-12f644a2b311";
const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b312";
const identity = { user_identity_id: id, provider: "tcdx-managed-identity",
  issuer: "https://iam.grc.tecdex.net/realms/tcdx-managed-identity", subject_reference: "synthetic-subject",
  username: "synthetic-person", display_name: "Persona de prueba", identity_lifecycle_state: "active", enabled: true, mfa_enrolled: true };
const providerSet = (zoho: boolean, managed: boolean) => ({ providers: [
  { provider: "ZOHO", available: zoho }, { provider: "MICROSOFT_ENTRA_ID", available: false },
  { provider: "GOOGLE_WORKSPACE", available: false }, { provider: "TCDX_MANAGED_IDENTITY", available: managed }
] });

async function authenticated(page: Page, permissions: string[], roles: string[] = ["PLATFORM_ADMIN"]): Promise<void> {
  await page.addInitScript(() => sessionStorage.setItem("tcdx.access_token", "mi7-local-fixture-token"));
  await page.route("**/api/v1/access/me", (route) => route.fulfill({ json: {
    available_tenant_contexts: [{ tenant_id: tenantId, tenant_display_name: "Tenant sintético", tenant_membership_id: tenantId,
      membership_state: "active", effective_role_codes: roles.includes("TENANT_ADMIN") ? ["TENANT_ADMIN"] : [] }],
    effective_platform_role_codes: roles.filter((role) => role !== "TENANT_ADMIN")
  } }));
  await page.route("**/api/v1/auth/me/authorization", (route) => route.fulfill({ json: {
    evaluated_at: new Date().toISOString(), platform_permissions: permissions,
    tenant_permissions: { tenant_id: tenantId, permissions: {} }
  } }));
  await page.route("**/api/v1/platform/managed-identities**", (route) => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: request.url().endsWith(id) ? identity :
      { items: [identity], page: { has_more: false, next_cursor: null } } });
    return route.fulfill({ status: 403, contentType: "application/problem+json", body: JSON.stringify({
      code: "TCDX.AUTHORIZATION.DENIED", message: "Access denied", correlation_id: id, retryable: false
    }) });
  });
}

test("login entry uses backend availability and fails closed for unknown response", async ({ page }) => {
  await page.route("**/api/v1/auth/providers", (route) => route.fulfill({ json: providerSet(false, true) }));
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: /Zoho.*No disponible/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Tecdex Managed Identity.*Disponible/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Microsoft Entra ID.*No disponible/ })).toBeDisabled();
  await page.unroute("**/api/v1/auth/providers");
  await page.route("**/api/v1/auth/providers", (route) => route.fulfill({ json: {
    providers: [...providerSet(true, true).providers.slice(0, 3), { provider: "UNKNOWN", available: true }]
  } }));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("No se pudo verificar");
  await expect(page.getByRole("button", { name: /Zoho.*Disponible/ })).toHaveCount(0);
});

test("Managed Identity entry opens the separate approved IAM flow without a GRC password form", async ({ page }) => {
  await page.route("**/api/v1/auth/providers", (route) => route.fulfill({ json: providerSet(false, true) }));
  const initiated: string[] = [];
  await page.context().route("**/auth/login?*", (route) => {
    initiated.push(route.request().url());
    return route.fulfill({ contentType: "text/html", body: "<title>Tecdex GRC</title>" });
  });
  await page.goto("/dashboard");
  await expect(page.getByLabel(/contraseña/i)).toHaveCount(0);
  await page.getByRole("button", { name: /Tecdex Managed Identity.*Disponible/ }).click();
  await expect.poll(() => initiated.length).toBe(1);
  expect(new URL(initiated[0]!).searchParams.get("provider")).toBe("tcdx-managed-identity");
  expect(new URL(initiated[0]!).pathname).toBe("/auth/login");
  expect(initiated[0]).not.toContain("/iam");
});

test("permission projection governs MI controls; roles and tenant context grant none", async ({ page }) => {
  await authenticated(page, ["platform.managed_identity.read"]);
  await page.goto("/configuraciones/identidades-gestionadas");
  await expect(page.getByRole("heading", { name: "Identidades gestionadas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Provisionar identidad" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("Persona de prueba");
  await expect(page.getByRole("button", { name: "Restablecer contraseña" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).not.toContainText("Keycloak");
  await expect(page.getByRole("button", { name: /Eliminar|Vincular|Desvincular|Suplantar/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("create permission emits a one-time credential only in the result view", async ({ page }, testInfo) => {
  await authenticated(page, ["platform.managed_identity.create"]);
  const secret = `synthetic-${crypto.randomUUID()}`;
  const logged: string[] = [];
  page.on("console", (message) => logged.push(message.text()));
  let posts = 0;
  const keys: string[] = [];
  await page.route("**/api/v1/platform/managed-identities", (route: Route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
    posts++;
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    expect(route.request().postDataJSON()).toEqual({ display_name: "Persona nueva", username: "persona-nueva",
      person_verification_ref: "verificación local" });
    return route.fulfill({ status: 201, json: { identity, credential_disclosed: true, temporary_credential: secret } });
  });
  await page.goto("/configuraciones/identidades-gestionadas");
  await expect(page.getByRole("button", { name: "Provisionar identidad" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Provisionar identidad" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar detalle" })).toBeFocused();
  await page.getByLabel("Nombre visible").fill("Persona nueva");
  await page.getByLabel("Nombre de usuario").fill("persona-nueva");
  await page.getByLabel("Referencia de verificación de persona").fill("verificación local");
  await page.getByRole("button", { name: "Confirmar provisión" }).dblclick();
  await expect(page.getByLabel("Credencial temporal emitida")).toHaveText(secret);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `${visualDirectory}/credential-${testInfo.project.name}.png`, fullPage: true,
    mask: [page.getByLabel("Credencial temporal emitida")] });
  expect(posts).toBe(1);
  expect(keys[0]).toBeTruthy();
  expect(logged.join(" ")).not.toContain(secret);
  expect(await page.evaluate((value) => [localStorage, sessionStorage].some((storage) =>
    Object.values(storage).some((entry) => String(entry).includes(value))), secret)).toBe(false);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await expect(page.getByText(secret)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(secret)).toHaveCount(0);
});

test("provision replay exposes metadata without a credential or automatic reset", async ({ page }) => {
  await authenticated(page, ["platform.managed_identity.create"]);
  let posts = 0;
  await page.route("**/api/v1/platform/managed-identities", (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
    posts++;
    return route.fulfill({ json: { identity, credential_disclosed: false } });
  });
  await page.goto("/configuraciones/identidades-gestionadas");
  await page.getByRole("button", { name: "Provisionar identidad" }).click();
  await page.getByLabel("Nombre visible").fill("Persona nueva");
  await page.getByLabel("Nombre de usuario").fill("persona-nueva");
  await page.getByLabel("Referencia de verificación de persona").fill("verificación local");
  await page.getByRole("button", { name: "Confirmar provisión" }).click();
  await expect(page.getByRole("alert")).toContainText("no puede recuperarse");
  await expect(page.getByLabel("Credencial temporal emitida")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirmar provisión" })).toHaveCount(0);
  expect(posts).toBe(1);
});

test("password reset recovery requires a new explicit action and fresh key", async ({ page }, testInfo) => {
  await authenticated(page, ["platform.managed_identity.read", "platform.managed_identity.administer"]);
  const keys: string[] = [];
  await page.route(`**/api/v1/platform/managed-identities/${id}:password-reset`, (route) => {
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    expect(route.request().postDataJSON()).toEqual({ reason: "Pérdida confirmada", person_verification_ref: "verificación local" });
    return route.fulfill({ status: 409, contentType: "application/problem+json", body: JSON.stringify({
      code: "TCDX.CONFLICT.RECOVERY_REQUIRED", message: "Manual recovery required", correlation_id: id, retryable: false
    }) });
  });
  await page.goto("/configuraciones/identidades-gestionadas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await page.getByRole("button", { name: "Restablecer contraseña" }).click();
  await page.getByLabel("Motivo").fill("Pérdida confirmada");
  await page.getByLabel("Referencia de verificación de persona").fill("verificación local");
  await page.getByRole("button", { name: "Confirmar restablecer contraseña" }).dblclick();
  await expect(page.getByRole("alert")).toContainText("no pudo establecerse con seguridad");
  await page.getByRole("alert").scrollIntoViewIfNeeded();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `${visualDirectory}/recovery-${testInfo.project.name}.png`, fullPage: true });
  await expect(page.getByRole("button", { name: "Confirmar restablecer contraseña" })).toHaveCount(0);
  expect(keys).toHaveLength(1);
  await page.getByRole("button", { name: "Iniciar nueva acción explícita" }).click();
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await page.getByRole("button", { name: "Restablecer contraseña" }).click();
  await page.getByLabel("Motivo").fill("Pérdida confirmada");
  await page.getByLabel("Referencia de verificación de persona").fill("verificación local");
  await page.getByRole("button", { name: "Confirmar restablecer contraseña" }).click();
  await expect.poll(() => keys.length).toBe(2);
  expect(keys[0]).not.toBe(keys[1]);
});

test("password reset original discloses once and a replay response omits the credential", async ({ page }) => {
  await authenticated(page, ["platform.managed_identity.read", "platform.managed_identity.administer"]);
  const secret = `synthetic-${crypto.randomUUID()}`;
  const keys: string[] = [];
  await page.route(`**/api/v1/platform/managed-identities/${id}:password-reset`, (route) => {
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    return route.fulfill({ json: { identity, credential_disclosed: keys.length === 1,
      ...(keys.length === 1 ? { temporary_credential: secret } : {}) } });
  });
  await page.goto("/configuraciones/identidades-gestionadas");
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Ver detalle" }).click();
    await page.getByRole("button", { name: "Restablecer contraseña" }).click();
    await page.getByLabel("Motivo").fill("Verificación autorizada");
    await page.getByLabel("Referencia de verificación de persona").fill("verificación local");
    await page.getByRole("button", { name: "Confirmar restablecer contraseña" }).click();
    if (attempt === 0) await expect(page.getByLabel("Credencial temporal emitida")).toHaveText(secret);
    else {
      await expect(page.getByLabel("Credencial temporal emitida")).toHaveCount(0);
      await expect(page.getByRole("alert")).toContainText("no puede recuperarse");
    }
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(page.getByText(secret)).toHaveCount(0);
  }
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
});

test("administrative lifecycle actions require a reason and distinct intentions", async ({ page }) => {
  await authenticated(page, ["platform.managed_identity.read", "platform.managed_identity.administer"]);
  const seen: { path: string; key: string; reason: string }[] = [];
  let enabled = true;
  await page.route(`**/api/v1/platform/managed-identities/${id}**`, (route) => {
    const request = route.request();
    if (request.method() === "GET") return route.fulfill({ json: { ...identity, enabled } });
    const path = new URL(request.url()).pathname;
    const key = request.headers()["idempotency-key"] ?? "";
    const reason = request.postDataJSON().reason;
    seen.push({ path, key, reason });
    if (path.endsWith(":disable")) enabled = false;
    if (path.endsWith(":enable")) enabled = true;
    return route.fulfill({ json: { ...identity, enabled } });
  });
  await page.goto("/configuraciones/identidades-gestionadas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  for (const [index, [label, suffix]] of ([["Deshabilitar", ":disable"], ["Habilitar", ":enable"],
    ["Restablecer MFA", ":mfa-reset"], ["Revocar sesiones", "/sessions:revoke"]] as const).entries()) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("button", { name: `Confirmar ${label.toLowerCase()}` })).toBeVisible();
    await page.getByLabel("Motivo").fill(`Motivo para ${label}`);
    await page.getByRole("button", { name: `Confirmar ${label.toLowerCase()}` }).click();
    await expect.poll(() => seen.length).toBe(index + 1);
    const latest = seen.at(-1)!;
    expect(latest.path).toBe(`/api/v1/platform/managed-identities/${id}${suffix}`);
    expect(latest.reason).toBe(`Motivo para ${label}`);
    expect(latest.key).toBeTruthy();
    await expect(page.getByRole("alert")).toContainText("Operación completada");
  }
  expect(new Set(seen.map(({ key }) => key)).size).toBe(4);
});

test("tenant admin and a Platform role name without projected permission cannot enter MI", async ({ page }) => {
  await authenticated(page, [], ["TENANT_ADMIN", "PLATFORM_ADMIN"]);
  await page.route("**/api/v1/auth/me/authorization", (route) => route.fulfill({ json: {
    evaluated_at: new Date().toISOString(), platform_permissions: [],
    tenant_permissions: { tenant_id: tenantId, permissions: { "platform.role.read": [{ scope_kind: "tenant" }] } }
  } }));
  await page.goto("/configuraciones/identidades-gestionadas");
  await expect(page.getByRole("button", { name: "Identidades gestionadas" })).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("permiso");
});

test("failed permission projection clears MI presentation eligibility", async ({ page }) => {
  await authenticated(page, ["platform.managed_identity.read"], ["PLATFORM_ADMIN"]);
  await page.route("**/api/v1/auth/me/authorization", (route) => route.fulfill({ status: 503,
    contentType: "application/problem+json", body: JSON.stringify({ code: "TCDX.DEPENDENCY.UNAVAILABLE",
      message: "Dependency unavailable", correlation_id: id, retryable: true }) }));
  await page.goto("/configuraciones/identidades-gestionadas");
  await expect(page.getByRole("button", { name: "Identidades gestionadas" })).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("permiso");
});

test("MI7 safe surfaces keep labels, focus and supported viewport layout", async ({ page }, testInfo) => {
  await page.route("**/api/v1/auth/providers", (route) => route.fulfill({ json: providerSet(true, true) }));
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: /Tecdex Managed Identity.*Disponible/ })).toBeEnabled();
  await page.screenshot({ path: `${visualDirectory}/login-${testInfo.project.name}.png`, fullPage: true });
  await authenticated(page, ["platform.managed_identity.read", "platform.managed_identity.create", "platform.managed_identity.administer"]);
  await page.goto("/configuraciones/identidades-gestionadas");
  await expect(page.getByRole("heading", { name: "Identidades gestionadas" })).toBeVisible();
  await page.screenshot({ path: `${visualDirectory}/list-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("button", { name: "Cerrar detalle" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Cerrar", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cerrar detalle" })).toBeFocused();
  await page.screenshot({ path: `${visualDirectory}/detail-${testInfo.project.name}.png`, fullPage: true });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Provisionar identidad" }).click();
  await expect(page.getByLabel("Nombre visible")).toBeVisible();
  await expect(page.getByLabel("Nombre de usuario")).toBeVisible();
  await expect(page.getByLabel("Referencia de verificación de persona")).toBeVisible();
  await page.screenshot({ path: `${visualDirectory}/provision-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
