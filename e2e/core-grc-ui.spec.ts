import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const memberId = "018f47f2-6170-7bd0-9d43-12f644a2b119";
const roleId = "018f47f2-6170-7bd0-9d43-12f644a2b120";
const candidate = {
  regulatory_pack_version_id: roleId, regulatory_pack_validation_provenance_id: memberId,
  name: "Marco de validación", pack_code: "ISO-QA", edition: "2022", version_state: "draft", pack_state: "draft",
  license_classification: "NOT_YET_LICENSED", authority_class: "NON_AUTHORITATIVE_TEST_PACK",
  source_role: "provisional_supporting_reference", provenance_ref: "manifest:qa-source",
  version_effective_from: "2026-09-01T00:00:00Z", version_effective_to: null
};
const rows: Record<string, Record<string, unknown>[]> = {
  "/requirement-applicabilities": [{ requirement_applicability_id: tenantId, row_version: 2, applicability_decision: "applicable", lifecycle_state: "approved" }],
  "/requirement-assessments": [
    { requirement_assessment_id: tenantId, row_version: 4, domain_conclusion: "compliant", result_status: "valid", lifecycle_state: "approved" },
    { requirement_assessment_id: "018f47f2-6170-7bd0-9d43-12f644a2b112", row_version: 2, domain_conclusion: "insufficient_evidence", result_status: "insufficient_data", lifecycle_state: "assessed" }
  ],
  "/statements-of-applicability": [{ statement_of_applicability_id: tenantId, row_version: 1, title: "SoA controlada", lifecycle_state: "draft" }],
  "/controls": [{ control_id: tenantId, row_version: 1, name: "Control de acceso", lifecycle_state: "active" }],
  "/control-assessments": [{ control_assessment_id: tenantId, row_version: 3, domain_conclusion: "effective", lifecycle_state: "reviewed" }],
  "/assurance-tests": [{ assurance_test_id: tenantId, row_version: 2, test_code: "AT-NN-001", lifecycle_state: "completed" }],
  "/evidence-requests": [{ evidence_request_id: tenantId, row_version: 1, request_code: "ER-NN-001", lifecycle_state: "open" }],
  "/evidence": [{ evidence_id: tenantId, row_version: 3, evidence_code: "EV-NN-001", lifecycle_state: "approved" }],
  "/retention-policies": [{ retention_policy_id: tenantId, row_version: 1, policy_code: "RET-NN-001", retention_seconds: 86400, is_mandatory: false, lifecycle_state: "draft" }],
  "/retention-policy-applicabilities": [{ retention_policy_applicability_id: memberId, row_version: 4,
    retention_policy_id: tenantId, classification: "confidential", lifecycle_state: "published",
    policy_kind: "legal_hold", hold_release_id: null }],
  "/issues": [{ issue_id: tenantId, row_version: 3, issue_code: "ISS-NN-001", title: "Brecha de evidencia", lifecycle_state: "remediation_in_progress" }],
  "/actions": [{ action_id: tenantId, row_version: 4, action_code: "ACT-NN-001", title: "Actualizar evidencia", lifecycle_state: "in_review" }]
};

async function mockRuntime(page: Page, roles: string[] = ["GRC_MANAGER"], platformRoles: string[] = [], tenantPermissionCodes: string[] = [], timezone = "Europe/Berlin"): Promise<void> {
  const assignedRoles: Record<string, unknown>[] = [];
  await page.addInitScript(() => { sessionStorage.setItem("tcdx.access_token", "contractual-test-token"); });
  await page.route(url => url.pathname.startsWith("/api/v1/") || url.pathname === "/api/v2/auth/me/authorization", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/access/me")) {
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
      await route.fulfill({ json: { available_tenant_contexts: [{ tenant_id: tenantId, tenant_display_name: "Tenant no normativo", tenant_membership_id: tenantId, membership_state: "active", effective_role_codes: roles }], effective_platform_role_codes: platformRoles } });
      return;
    }
    if (url.pathname === "/api/v2/auth/me/authorization") {
      await route.fulfill({ json: { evaluated_at: new Date().toISOString(), platform_permissions: platformRoles.includes("PLATFORM_ADMIN") ? ["platform.tenant.read", "platform.tenant.create", "platform.subscription.create", "platform.subscription_regulatory_pack.read", "platform.subscription_regulatory_pack.create", "platform.subscription_regulatory_pack.archive", "platform.user_identity.read", "platform.membership.read", "platform.membership_invitation.read", "platform.membership_invitation.create", "platform.membership_invitation.update", "platform.role.read", "platform.role.assign"] : [],
        tenant_permissions: { tenant_id: tenantId, default_timezone: timezone, permissions: Object.fromEntries([...(roles.includes("TENANT_ADMIN") ? ["platform.membership.read", "platform.membership.create", "platform.role.read", "platform.role.assign", "platform.user_identity.read"] : []), ...tenantPermissionCodes].map(code => [code, [{scope_kind:"tenant"}]])) } } });
      return;
    }
    if (route.request().method() === "POST") {
      if (url.pathname === `/api/v1/subscriptions/${tenantId}/regulatory-packs` || url.pathname === `/api/v1/subscription-regulatory-packs/${memberId}:revoke`) {
        expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
        await route.fulfill({ status: 202, json: { operation_id: "subscriptionRegulatoryPackActivate", status: "completed", result: {} } });
        return;
      }
      if (url.pathname === "/api/v1/platform/tenants") {
        expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
        expect(route.request().postDataJSON()).toMatchObject({ tenant_code: expect.any(String), legal_name: expect.any(String), display_name: expect.any(String), default_timezone: expect.any(String) });
        await route.fulfill({ status: 202, json: { operation_id: "tenantCreate", status: "completed", correlation_id: tenantId, resource_id: tenantId, result: { tenant_id: tenantId } } });
        return;
      }
      if (url.pathname.endsWith("/platform/membership-invitations")) {
        expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
        expect(route.request().postDataJSON()).toMatchObject({ tenant_id: tenantId, authentication_method: "ZOHO" });
        await route.fulfill({ status: 202, json: { operation_id: "membershipInvitationCreate", status: "completed", correlation_id: tenantId, resource_id: tenantId, result: {
          tenant_membership_invitation_id: tenantId,
          invitee_email: "reviewer@example.test",
          authentication_method: "ZOHO",
          expires_at: "2026-09-25T12:00:00.000Z",
          invitation_token: "A".repeat(43)
        } } });
        return;
      }
      if (url.pathname.endsWith(`/memberships/${memberId}/role-assignments`)) {
        expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
        expect(route.request().postDataJSON()).toEqual({ role_id: roleId, scope_kind: "tenant" });
        assignedRoles.push({ membership_role_id: roleId, role_id: roleId, scope_kind: "tenant", role_name: "Privacy Manager", valid_from: "2020-01-01T00:00:00Z", valid_to: null });
        await route.fulfill({ status: 202, json: { operation_id: "membershipRoleAssign", status: "completed", result: {} } });
        return;
      }
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
      await route.fulfill({ status: 202, json: { operation_id: "fixtureOperation", status: "completed", correlation_id: tenantId, resource_id: tenantId, result: {} } });
      return;
    }
    if (url.pathname === "/api/v1/platform/tenants") {
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
      await route.fulfill({ json: { items: [{ tenant_id: tenantId, tenant_code: "TECDEX", legal_name: "TecDex SpA", display_name: "TecDex", default_timezone: "America/Santiago", lifecycle_state: "active", data_classification: "confidential", created_at: "2026-09-25T12:00:00Z", updated_at: "2026-09-25T12:00:00Z", current_subscription: { subscription_id: tenantId, subscription_code: "GRC", lifecycle_state: "active", plan_code: "GRC", plan_name: "GRC", plan_version_number: 1 } }], page: { has_more: false, next_cursor: null } } });
      return;
    }
    if (url.pathname === `/api/v1/platform/tenants/${tenantId}`) {
      await route.fulfill({ json: { tenant_id: tenantId, tenant_code: "TECDEX", legal_name: "TecDex SpA", display_name: "TecDex", default_timezone: "America/Santiago", lifecycle_state: "active", data_classification: "confidential", current_subscription: { subscription_id: tenantId, plan_name: "GRC" } } });
      return;
    }
    if (url.pathname === `/api/v1/platform/tenants/${tenantId}/regulatory-pack-validation-accesses` ||
        url.pathname === "/api/v1/regulatory-pack-validation-accesses/current") {
      if (url.pathname.includes("/platform/")) expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
      else expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
      await route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
      return;
    }
    if (url.pathname === "/api/v1/platform/regulatory-pack-versions") {
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
      await route.fulfill({ json: { items: [{ regulatory_pack_version_id: roleId, pack_code: "MARCO-A", name: "Marco contractual A", edition: "Edición 1", license_classification: "NOT_YET_LICENSED" }], page: { has_more: false, next_cursor: null } } });
      return;
    }
    if (url.pathname === `/api/v1/subscriptions/${tenantId}/regulatory-packs` || url.pathname === "/api/v1/subscriptions/current/regulatory-packs") {
      await route.fulfill({ json: { items: [{ subscription_regulatory_pack_id: memberId, regulatory_pack_version_id: roleId, pack_code: "MARCO-A", name: "Marco contractual A", edition: "Edición 1", license_classification: "NOT_YET_LICENSED", lifecycle_state: "active", effective_state: "effective", effective_from: "2026-09-20T00:00:00Z", effective_to: null, row_version: 1 }], page: { has_more: false, next_cursor: null } } });
      return;
    }
    if (url.pathname === "/api/v1/subjects") {
      await route.fulfill({ json: { items: [{ subject_id: memberId, subject_type: "process", canonical_key: "operaciones", display_name: "Operaciones", lifecycle_state: "active" }], page: { has_more: false, next_cursor: null } } });
      return;
    }
    if (url.pathname === "/api/v1/memberships" || url.pathname === `/api/v1/memberships/${memberId}`) {
      const person = { tenant_membership_id: memberId, tenant_id: tenantId, user_identity_id: memberId, membership_state: "active", joined_at: "2026-09-25T12:00:00Z", ended_at: null, user_identity: { display_name: "Mario de prueba", email_normalized: "mario@example.test", lifecycle_state: "active", last_authenticated_at: null }, roles: assignedRoles };
      await route.fulfill({ json: url.pathname.endsWith(memberId) ? person : { items: [person], page: { has_more: false, next_cursor: null } } });
      return;
    }
    if (url.pathname === "/api/v1/roles") {
      await route.fulfill({ json: { items: [{ role_id: roleId, tenant_id: tenantId, ownership_class: "TENANT_OWNED", role_code: "PRIVACY_MANAGER", name: "Privacy Manager", is_baseline: true, lifecycle_state: "published" }], page: { has_more: false, next_cursor: null } } });
      return;
    }
    if (url.pathname === "/api/v1/platform/membership-invitations") {
      await route.fulfill({ json: { items: [{ tenant_membership_invitation_id: memberId, tenant_id: tenantId, invitee_email: "mario@example.test", lifecycle_state: "pending", effective_state: "expired", created_at: "2026-09-25T12:00:00Z", expires_at: "2026-09-26T12:00:00Z", accepted_at: null, revoked_at: null, tenant_membership_id: null, row_version: 1 }], page: { has_more: false, next_cursor: null } } });
      return;
    }
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
    const key = Object.keys(rows).find((path) => url.pathname.includes(path));
    const fixture = key ? rows[key] : [];
    if (key && url.pathname !== `/api/v1${key}`) {
      const detail = { ...fixture[0] };
      if (key === "/evidence") detail.versions = [{ evidence_version_id: tenantId, row_version: 2, lifecycle_state: "approved" }];
      await route.fulfill({ json: detail });
      return;
    }
    await route.fulfill({ json: { items: fixture, page: { has_more: false, next_cursor: null } } });
  });
}

const evidenceDirectory = process.env.TCDX_UI_EVIDENCE_DIR ?? "artifacts/phase5-iam-ui/local-playwright";

test.beforeAll(async () => { await mkdir(evidenceDirectory, { recursive: true }); });
test.beforeEach(({page})=>{page.on("pageerror",error=>console.error("BROWSER_ERROR",error.message));});

test("Platform Admin assigns a published plan and immediately reaches contracted frameworks", async ({ page }, testInfo) => {
  await mockRuntime(page, ["GRC_MANAGER"], ["PLATFORM_ADMIN"]);
  let subscribed = false;
  let creates = 0;
  const planVersionId = "018f47f2-6170-7bd0-9d43-12f644a2b131";
  const subscriptionId = "018f47f2-6170-7bd0-9d43-12f644a2b199";
  const subscription = { subscription_id: subscriptionId, subscription_code: "TECDEX-QA", lifecycle_state: "active",
    plan_code: "GRC", plan_name: "GRC", plan_version_number: 1 };
  await page.route(url => ["/api/v1/platform/tenants", `/api/v1/platform/tenants/${tenantId}`].includes(url.pathname), route => {
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    const row = { tenant_id: tenantId, tenant_code: "TECDEX", legal_name: "TecDex SpA", display_name: "TecDex",
      default_timezone: "America/Santiago", lifecycle_state: "active", current_subscription: subscribed ? subscription : null };
    return route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(tenantId)
      ? row : { items: [row], page: { has_more: false, next_cursor: null } } });
  });
  await page.route("**/api/v1/platform/plan-versions?**", route => {
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    expect(new URL(route.request().url()).searchParams.get("page[size]")).toBe("100");
    return route.fulfill({ json: { items: [{ plan_version_id: planVersionId, plan_code: "GRC", plan_name: "GRC",
      version_number: 1, display_name: "GRC v1" }], page: { has_more: false, next_cursor: null } } });
  });
  await page.route(`**/api/v1/subscriptions/${subscriptionId}/regulatory-packs`, route => {
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    return route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
  });
  await page.route("**/api/v1/platform/subscriptions", route => {
    creates++;
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    expect(route.request().postDataJSON()).toEqual({ tenant_id: tenantId, plan_version_id: planVersionId, subscription_code: "TECDEX-QA" });
    subscribed = true;
    return route.fulfill({ status: 202, json: { operation_id: "subscriptionCreate", status: "completed", resource_id: subscriptionId } });
  });
  await page.goto("/configuraciones/empresas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("heading", { name: "Asignar plan" })).toBeVisible();
  await page.getByLabel("Versión de plan publicada").selectOption(planVersionId);
  await page.getByLabel("Código de suscripción").fill("TECDEX-QA");
  await page.getByRole("button", { name: "Asignar plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Marcos contratados" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asignar plan" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("GRC · v1");
  await expect(page.getByRole("dialog")).toContainText("Código de suscripción: TECDEX-QA");
  await expect(page.getByRole("dialog")).toContainText("Estado de suscripción: Activo");
  expect(creates).toBe(1);
  await page.screenshot({ path: `${process.env.TCDX_UI_EVIDENCE_DIR ?? "/tmp"}/plan-assignment-${testInfo.project.name}.png`, fullPage: true });
});

test("Company detail never shows another company's subscription after a delayed response", async ({ page }, testInfo) => {
  await mockRuntime(page, ["GRC_MANAGER"], ["PLATFORM_ADMIN"]);
  const secondId = "018f47f2-6170-7bd0-9d43-12f644a2b132";
  let releaseFirst!: () => void;
  let signalFirst!: () => void;
  const firstStarted = new Promise<void>((resolve) => { signalFirst = resolve; });
  const firstResponse = new Promise<void>((resolve) => { releaseFirst = resolve; });
  await page.route(url => ["/api/v1/platform/tenants", `/api/v1/platform/tenants/${tenantId}`,
    `/api/v1/platform/tenants/${secondId}`].includes(url.pathname), async route => {
    const path = new URL(route.request().url()).pathname;
    const first = { tenant_id: tenantId, tenant_code: "FIRST", legal_name: "Empresa primera", display_name: "Empresa primera",
      default_timezone: "America/Santiago", lifecycle_state: "active", current_subscription: {
        subscription_id: tenantId, subscription_code: "FIRST-PLAN", lifecycle_state: "active", plan_name: "Plan primero", plan_version_number: 1 } };
    const second = { tenant_id: secondId, tenant_code: "SECOND", legal_name: "Empresa segunda", display_name: "Empresa segunda",
      default_timezone: "America/Santiago", lifecycle_state: "active", current_subscription: null };
    if (path === "/api/v1/platform/tenants") {
      await route.fulfill({ json: { items: [first, second], page: { has_more: false, next_cursor: null } } });
    } else if (path.endsWith(tenantId)) {
      signalFirst();
      await firstResponse;
      await route.fulfill({ json: first }).catch(() => { /* The obsolete request may already be aborted. */ });
    } else {
      await route.fulfill({ json: second });
    }
  });
  await page.route("**/api/v1/platform/plan-versions?**", route => route.fulfill({ json: {
    items: [], page: { has_more: false, next_cursor: null }
  } }));
  await page.route(`**/api/v1/platform/tenants/${secondId}/regulatory-pack-validation-accesses`, route => route.fulfill({ json: {
    items: [], page: { has_more: false, next_cursor: null }
  } }));
  await page.goto("/configuraciones/empresas");
  await page.getByRole("row", { name: /Empresa primera/ }).getByRole("button", { name: "Ver detalle" }).click();
  await firstStarted;
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
  await page.getByRole("row", { name: /Empresa segunda/ }).getByRole("button", { name: "Ver detalle" }).click();
  releaseFirst();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Empresa segunda" })).toBeVisible();
  await expect(dialog).toContainText("Sin suscripción vigente");
  await expect(dialog).not.toContainText("FIRST-PLAN");
  await dialog.screenshot({ path: `${process.env.TCDX_UI_EVIDENCE_DIR ?? "/tmp"}/company-detail-switch-${testInfo.project.name}.png` });
});

test("Normas navigates published framework content without creating records", async ({ page }, testInfo) => {
  await mockRuntime(page);
  const frameworkId = "018f47f2-6170-7bd0-9d43-12f644a2b132";
  await page.route("**/api/v2/auth/me/authorization", route => route.fulfill({ json: {
    evaluated_at: new Date().toISOString(), platform_permissions: [], tenant_permissions: { tenant_id: tenantId,
      default_timezone: "Europe/Berlin", permissions: {
        "compliance.framework.read": [{ scope_kind: "tenant" }],
        "compliance.normative_unit.read": [{ scope_kind: "tenant" }],
        "compliance.requirement.read": [{ scope_kind: "tenant" }]
      } }
  } }));
  await page.route("**/api/v1/framework-version-references?**", route => {
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
    return route.fulfill({ json: { items: [{ framework_version_id: frameworkId, framework_code: "ISO",
      framework_name: "Norma publicada", edition: "2022", version_number: 1, selectable: true }],
      page: { has_more: false, next_cursor: null } } });
  });
  await page.route(url => url.pathname.startsWith(`/api/v1/framework-versions/${frameworkId}/`), route => {
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
    const units = new URL(route.request().url()).pathname.endsWith("normative-units");
    return route.fulfill({ json: { items: units
      ? [{ normative_unit_id: memberId, unit_code: "4.1", title: "Contexto de la organización", source_locator: "4.1", access_mode: "official" }]
      : [{ requirement_id: roleId, requirement_code: "4.1.a", editorial_summary: "Requisito publicado", access_mode: "official" }],
      page: { has_more: false, next_cursor: null } } });
  });
  await page.goto("/dashboard");
  if (testInfo.project.name.includes("narrow")) await page.getByRole("button", { name: "Abrir navegación" }).click();
  await page.getByRole("button", { name: "Normas" }).click();
  await page.getByLabel("Norma o marco publicado").selectOption(frameworkId);
  await expect(page.getByRole("heading", { name: "Unidades normativas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Requisitos de la norma" })).toBeVisible();
  await expect(page.getByText("Contexto de la organización")).toBeVisible();
  await expect(page.getByText("Requisito publicado")).toBeVisible();
  await page.getByText("Ver detalle").first().click();
  await expect(page.getByText("4.1", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: `${process.env.TCDX_UI_EVIDENCE_DIR ?? "/tmp"}/norms-${testInfo.project.name}.png`, fullPage: true });
});

test("failed detail read cannot expose lifecycle commands from a summary", async ({ page }) => {
  await mockRuntime(page);
  await page.route(`**/api/v1/actions/${tenantId}`, route => route.fulfill({ status: 503, json: {
    code: "TCDX.DEPENDENCY.UNAVAILABLE", message: "Unavailable", correlation_id: tenantId, retryable: true
  } }));
  await page.goto("/acciones");
  await page.getByRole("tab", { name: "Acciones" }).click();
  await page.getByRole("button", { name: "Ver detalle" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("El detalle no está disponible.");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Completar" })).toHaveCount(0);
});

test("D3 IANA rejects a DST gap and serializes an explicit overlapping instant in UTC", async ({ page }) => {
  await mockRuntime(page);
  const item = { assurance_test_id: tenantId, row_version: 2, test_code: "IANA-LOCAL-SIMULATED", lifecycle_state: "in_progress" };
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/v1/assurance-tests**", async route => {
    if (route.request().method() === "POST") {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 202, json: { operation_id: "assuranceTestExecute", status: "completed", result: {} } });
    } else await route.fulfill({ json: new URL(route.request().url()).pathname === "/api/v1/assurance-tests" ? { items: [item], page: { has_more: false, next_cursor: null } } : item });
  });
  await page.goto("/pruebas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await page.getByRole("button", { name: "Agregar elemento" }).click();
  const period = page.getByLabel(/^Inicio del período de muestra/);
  await expect(period).toBeVisible();
  await period.fill("2026-03-29T02:30:00+01:00");
  await expect(period).toHaveAttribute("aria-invalid", "true");
  await period.fill("2026-10-25T02:30:00+02:00");
  await expect(period).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText(/Europe\/Berlin/).first()).toBeVisible();
  await page.getByLabel("Código de muestra", { exact: true }).fill("SIMULATED-SHAPE");
  await page.getByLabel("Tamaño de la muestra", { exact: true }).fill("1");
  await page.getByLabel("Método de selección", { exact: true }).selectOption({ index: 1 });
  for (const select of await page.locator('.workflow-action > label select').all()) await select.selectOption({ index: 1 });
  await page.screenshot({ path: `${evidenceDirectory}/r6-iana-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect.poll(() => body).toBeDefined();
  expect((body!.samples as Array<Record<string, unknown>>)[0]!.sample_period_start).toBe("2026-10-25T00:30:00Z");
});

test("D3 IANA changes tenant context without retaining the prior zone", async ({ page }) => {
  await mockRuntime(page);
  const tenantB = "018f47f2-6170-7bd0-9d43-12f644a2b121";
  const requests: string[] = [];
  await page.route("**/api/v1/access/me", route => route.fulfill({ json: {
    available_tenant_contexts: [tenantId, tenantB].map((id, index) => ({ tenant_id: id,
      tenant_display_name: index ? "Empresa B simulada" : "Empresa A simulada",
      tenant_membership_id: id, membership_state: "active", effective_role_codes: ["GRC_MANAGER"] })), effective_platform_role_codes: []
  } }));
  await page.route("**/api/v2/auth/me/authorization", route => {
    const selected = route.request().headers()["x-tcdx-tenant-id"];
    expect([undefined, tenantId, tenantB]).toContain(selected);
    requests.push(selected ?? "none");
    return route.fulfill({ json: { evaluated_at: new Date().toISOString(), platform_permissions: [],
      tenant_permissions: selected ? { tenant_id: selected, default_timezone: selected === tenantB ? "Asia/Tokyo" : "Europe/Berlin", permissions: {} } : null } });
  });
  // Existing generic fixture is completed; this temporal edit case requires an in-progress test.
  await page.route("**/api/v1/assurance-tests**", route => route.fulfill({ json:
    new URL(route.request().url()).pathname === "/api/v1/assurance-tests"
      ? { items: [{ assurance_test_id: tenantId, row_version: 2, test_code: "ZONE-SWITCH-SIMULATED", lifecycle_state: "in_progress" }], page: { has_more: false, next_cursor: null } }
      : { assurance_test_id: tenantId, row_version: 2, test_code: "ZONE-SWITCH-SIMULATED", lifecycle_state: "in_progress" }
  }));
  await page.goto("/pruebas");
  const selector = page.getByLabel("Empresa activa", { exact: true });
  await selector.selectOption(tenantId);
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await page.getByRole("button", { name: "Agregar elemento" }).click();
  await expect(page.getByText(/Europe\/Berlin/).first()).toBeVisible();
  await page.keyboard.press("Escape");
  if (await selector.isVisible()) await selector.selectOption(tenantB);
  else {
    // The current narrow shell hides this picker. Test context invalidation programmatically;
    // this does not certify that manual narrow-screen context switching is available.
    await expect(selector).toBeHidden();
    await selector.selectOption(tenantB, { force: true });
  }
  await expect.poll(() => requests.at(-1)).toBe(tenantB);
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await page.getByRole("button", { name: "Agregar elemento" }).click();
  await expect(page.getByText(/Asia\/Tokyo/).first()).toBeVisible();
  await expect(page.getByText(/Europe\/Berlin/)).toHaveCount(0);
});

test("Control base selector resolves an authorized ControlVersion without a human UUID field", async ({ page }) => {
  await mockRuntime(page);
  await page.route("**/api/v1/controls**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === `/api/v1/controls/${tenantId}`) {
      await route.fulfill({ json: { control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", versions: [{ control_version_id: memberId, version_number: 1, lifecycle_state: "draft" }] } });
      return;
    }
    await route.fulfill({ json: { items: [{ control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", normative_frameworks: [{ framework_version_id: roleId, framework_name: "Marco autorizado", edition: "v1" }] }], page: { has_more: false, next_cursor: null } } });
  });
  await page.goto("/controles");
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  await expect(page.getByLabel("Control base autorizado")).toBeVisible();
  await expect(page.getByLabel("ID del control base")).toHaveCount(0);
  await expect(page.getByRole("option", { name: /BASE-001.*Marco autorizado/ })).toBeAttached();
  await page.getByLabel("Control base autorizado").selectOption(tenantId);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Responsable de negocio", { exact: true })).toBeVisible();
  await expect(page.getByLabel("ID del responsable de negocio")).toHaveCount(0);
  await expect(page.getByRole("option", { name: /Operaciones.*Proceso/ })).toBeAttached();
});

test("Control catalog filters by an effective contracted framework", async ({ page }) => {
  await mockRuntime(page);
  const requestedFilters: string[] = [];
  await page.route("**/api/v1/controls**", async (route) => {
    const url = new URL(route.request().url());
    requestedFilters.push(url.searchParams.get("filter[framework_version_id]") ?? "");
    await route.fulfill({ json: {
      items: [{ control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", lifecycle_state: "active", normative_frameworks: [{ framework_version_id: roleId, framework_name: "Marco autorizado", edition: "v1" }] }],
      page: { has_more: false, next_cursor: null },
      framework_filters: [{ framework_version_id: roleId, framework_code: "MARCO-A", framework_name: "Marco autorizado", edition: "v1" }]
    } });
  });
  await page.goto("/controles");
  await page.getByLabel("Filtrar por norma o ley").selectOption(roleId);
  await expect.poll(() => requestedFilters).toContain(roleId);
});

test("Applicability offers only the approved decisions and requires a No aplica rationale", async ({ page }) => {
  await mockRuntime(page);
  await page.goto("/cumplimiento");
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  const decision = page.getByLabel("Decisión de aplicabilidad");
  await expect(decision.locator("option")).toHaveCount(3);
  await expect(decision.locator('option[value="applicable"]')).toHaveText("Aplicable");
  await expect(decision.locator('option[value="not_applicable"]')).toHaveText("No aplicable");
  await decision.selectOption("not_applicable");
  await page.getByRole("button", { name: "Crear registro" }).click();
  await expect(page.getByRole("alert")).toContainText("justificación");
});

test("Tenant Admin sees own contracted frameworks without commercial commands", async ({ page }) => {
  await mockRuntime(page, ["TENANT_ADMIN"]);
  await page.goto("/configuraciones/empresas");
  await expect(page.getByRole("heading", { name: "Marcos contratados" })).toBeVisible();
  await expect(page.getByText("Marco contractual A")).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar marco" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Revocar" })).toHaveCount(0);
});

test("Tenant Admin reads validation access without platform actions", async ({ page }) => {
  await mockRuntime(page, ["TENANT_ADMIN"]);
  let candidateCalls = 0;
  await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", (route) => {
    candidateCalls += 1; return route.fulfill({ status: 403, json: {} });
  });
  await page.route("**/api/v1/regulatory-pack-validation-accesses/current", (route) => route.fulfill({ json: {
    items: [{ regulatory_pack_validation_access_id: memberId, pack_code: "ISO-QA", name: "Marco de validación",
      edition: "2022", license_classification: "NOT_YET_LICENSED", lifecycle_state: "active",
      effective_state: "effective", effective_from: "2026-09-01T00:00:00Z", effective_to: null, row_version: 3 }],
    page: { has_more: false, next_cursor: null }
  } }));
  await page.goto("/configuraciones/empresas");
  const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  await expect(validation).toContainText("Marco de validación");
  await expect(validation.getByRole("button", { name: /Revocar|Conceder|Crear acceso/ })).toHaveCount(0);
  await expect(validation.getByRole("columnheader", { name: "Acción" })).toHaveCount(0);
  expect(candidateCalls).toBe(0);
});

test("Platform Admin creates exact non-authoritative access from canonical candidates", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  let candidateCalls = 0;
  let filteredCandidateCalls = 0;
  let accessListCalls = 0;
  let created = false;
  let commercialReads = 0;
  await page.route("**/api/v1/platform/regulatory-pack-versions", async (route) => {
    commercialReads += 1;
    await route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
  });
  await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", async (route) => {
    candidateCalls += 1;
    const url = new URL(route.request().url());
    expect(url.pathname).toBe("/api/v1/platform/regulatory-pack-validation-candidates");
    if (url.searchParams.has("filter[effective_from]")) {
      filteredCandidateCalls += 1;
      expect(url.searchParams.get("filter[effective_from]")).toMatch(/^2026-10-01T\d\d:00:00\.000Z$/);
    }
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    expect(route.request().headers().authorization).toBe("Bearer contractual-test-token");
    await route.fulfill({ json: { items: [candidate], page: { has_more: false, next_cursor: null } } });
  });
  await page.route(`**/api/v1/platform/tenants/${tenantId}/regulatory-pack-validation-accesses`, async (route) => {
    accessListCalls += 1;
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    await route.fulfill({ json: { items: created ? [{ regulatory_pack_validation_access_id: memberId,
      pack_code: candidate.pack_code, name: candidate.name, edition: candidate.edition,
      license_classification: candidate.license_classification, lifecycle_state: "active", effective_state: "future",
      effective_from: "2026-10-01T12:00:00.000Z", effective_to: null, row_version: 1 }] : [],
      page: { has_more: false, next_cursor: null } } });
  });
  let postCalls = 0;
  await page.route("**/api/v1/platform/regulatory-pack-validation-accesses", async (route) => {
    postCalls += 1;
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    expect(route.request().headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(route.request().postDataJSON()).toEqual({
      tenant_id: tenantId, regulatory_pack_version_id: roleId,
      regulatory_pack_validation_provenance_id: memberId,
      effective_from: expect.stringMatching(/^2026-10-01T\d\d:00:00\.000Z$/)
    });
    created = true;
    await route.fulfill({ status: 201, json: { operation_id: "validationAccessCreate", status: "completed", result: {} } });
  });
  await page.goto("/configuraciones/empresas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  await validation.getByRole("button", { name: "Conceder acceso de validación" }).click();
  await expect(validation.getByLabel("Versión para validación")).toBeVisible();
  await expect(validation.getByLabel(/ID de versión|ID de procedencia|UUID/i)).toHaveCount(0);
  await expect(validation.getByRole("option", { name: "Marco de validación · ISO-QA · 2022" })).toBeAttached();
  await validation.getByLabel("Inicio solicitado del acceso").fill("2026-10-01T09:00");
  await expect.poll(() => candidateCalls).toBeGreaterThan(1);
  expect(filteredCandidateCalls).toBeGreaterThan(0);
  await validation.getByLabel("Versión para validación").selectOption(memberId);
  const details = validation.getByRole("group", { name: "Metadatos de la versión para validación" });
  await expect(details).toContainText("VALIDACIÓN NO AUTORITATIVA");
  await expect(details).toContainText("Marco de validación · ISO-QA · 2022");
  await expect(details).toContainText("Borrador");
  await expect(details).toContainText("Contenido aún no licenciado");
  await expect(details).toContainText("Paquete de prueba no autoritativo");
  await expect(details).toContainText("Referencia provisional de apoyo");
  await expect(details).toContainText("manifest:qa-source");
  await expect(details).toContainText("Vigencia de la versión");
  await expect(details).toContainText("Sin fecha de término");
  await expect(details).not.toContainText(roleId);
  await validation.screenshot({ path: `${evidenceDirectory}/validation-create-${testInfo.project.name}.png` });
  await validation.locator("form").getByRole("button", { name: "Conceder acceso de validación" }).click();
  await expect(validation.getByRole("status")).toContainText("Acceso de validación concedido.");
  await expect(validation.getByText("Marco de validación", { exact: true })).toBeVisible();
  await expect.poll(() => accessListCalls).toBeGreaterThan(1);
  expect(postCalls).toBe(1);
  expect(commercialReads).toBeGreaterThan(0);
});

test("Candidate empty and error states have no manual ID fallback", async ({ page }) => {
  await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  let fail = false;
  await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", (route) => fail
    ? route.fulfill({ status: 503, json: { code: "TCDX.UNAVAILABLE", message: "Unavailable", correlation_id: memberId, retryable: false } })
    : route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } }));
  await page.goto("/configuraciones/empresas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  await validation.getByRole("button", { name: "Conceder acceso de validación" }).click();
  await expect(validation).toContainText("No hay versiones de validación disponibles actualmente.");
  await expect(validation.locator("form").getByRole("button", { name: "Conceder acceso de validación" })).toBeDisabled();
  await expect(validation.getByLabel(/UUID|ID de versión|ID de procedencia/i)).toHaveCount(0);
  fail = true;
  await validation.getByRole("button", { name: "Cerrar creación de acceso" }).click();
  await validation.getByRole("button", { name: "Conceder acceso de validación" }).click();
  await expect(validation).toContainText("No fue posible cargar las versiones disponibles para validación.");
  await expect(validation.locator("form").getByRole("button", { name: "Conceder acceso de validación" })).toBeDisabled();
});

for (const status of [400, 401, 403, 404, 409]) {
  test(`Validation CREATE ${status} displays the canonical denial and preserves list authority`, async ({ page }) => {
    await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
    let candidateCalls = 0;
    let listCalls = 0;
    await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", async (route) => {
      candidateCalls += 1;
      await route.fulfill({ json: { items: [candidate], page: { has_more: false, next_cursor: null } } });
    });
    await page.route(`**/api/v1/platform/tenants/${tenantId}/regulatory-pack-validation-accesses`, async (route) => {
      listCalls += 1;
      await route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
    });
    await page.route("**/api/v1/platform/regulatory-pack-validation-accesses", (route) => route.fulfill({ status,
      json: { code: "TCDX.CONFLICT", message: "Internal detail", correlation_id: memberId, retryable: false } }));
    await page.goto("/configuraciones/empresas");
    await page.getByRole("button", { name: "Ver detalle" }).click();
    const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
    await validation.getByRole("button", { name: "Conceder acceso de validación" }).click();
    await validation.getByLabel("Inicio solicitado del acceso").fill("2026-10-01T09:00");
    await validation.getByLabel("Versión para validación").selectOption(memberId);
    await validation.locator("form").getByRole("button", { name: "Conceder acceso de validación" }).click();
    await expect(validation.getByRole("alert")).toContainText(status === 400 ? "Revisa la versión seleccionada"
      : status === 401 ? "Se requiere autenticación"
      : status === 403 ? "No tienes autorización"
      : status === 404 ? "ya no tiene autoridad" : "Conflicto con un acceso existente");
    await expect(validation.getByText("Acceso de validación concedido.")).toHaveCount(0);
    await expect(validation).not.toContainText("Internal detail");
    await expect(validation).toContainText("Sin marcos habilitados para validación.");
    if (status === 404) {
      await expect.poll(() => candidateCalls).toBeGreaterThan(2);
      await expect.poll(() => listCalls).toBeGreaterThan(1);
    } else expect(listCalls).toBe(1);
  });
}

test("Validation CREATE ignores a repeated click while the POST is pending", async ({ page }) => {
  await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", (route) => route.fulfill({
    json: { items: [candidate], page: { has_more: false, next_cursor: null } } }));
  let calls = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/v1/platform/regulatory-pack-validation-accesses", async (route) => {
    calls += 1;
    await pending;
    await route.fulfill({ status: 201, json: { operation_id: "validationAccessCreate", status: "completed", result: {} } });
  });
  await page.goto("/configuraciones/empresas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  await validation.getByRole("button", { name: "Conceder acceso de validación" }).click();
  await validation.getByLabel("Inicio solicitado del acceso").fill("2026-10-01T09:00");
  await validation.getByLabel("Versión para validación").selectOption(memberId);
  await validation.locator("form").getByRole("button", { name: "Conceder acceso de validación" }).click();
  await expect(validation.getByRole("button", { name: "Concediendo acceso…" })).toBeDisabled();
  await validation.getByRole("button", { name: "Concediendo acceso…" }).dispatchEvent("click");
  expect(calls).toBe(1);
  release?.();
  await expect(validation.getByRole("status")).toContainText("Acceso de validación concedido.");
});

test("Platform Admin revokes validation access with reason, CAS and a local refresh", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  let listCalls = 0;
  let state = "active";
  await page.route(`**/api/v1/platform/tenants/${tenantId}/regulatory-pack-validation-accesses`, async (route) => {
    listCalls += 1;
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    await route.fulfill({ json: { items: [{ regulatory_pack_validation_access_id: memberId,
      regulatory_pack_version_id: roleId, pack_code: "ISO-QA", name: "Marco de validación", edition: "2022",
      license_classification: "NOT_YET_LICENSED", lifecycle_state: state, effective_state: state === "active" ? "effective" : "revoked",
      effective_from: "2026-09-01T00:00:00Z", effective_to: state === "active" ? null : "2026-09-30T00:00:00Z", row_version: state === "active" ? 3 : 4 }],
      page: { has_more: false, next_cursor: null } } });
  });
  let posted = 0;
  await page.route(`**/api/v1/platform/regulatory-pack-validation-accesses/${memberId}:revoke`, async (route) => {
    posted += 1;
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
    expect(route.request().headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(route.request().headers()["if-match"]).toBe('"3"');
    expect(route.request().postDataJSON()).toEqual({ reason: "Cierre de validación" });
    state = "revoked";
    await route.fulfill({ status: 202, json: { operation_id: "validationAccessRevoke", status: "completed", result: {} } });
  });
  await page.goto("/configuraciones/empresas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  await expect(validation).toContainText("Marco de validación");
  await expect(validation.getByRole("button", { name: "Conceder acceso de validación" })).toBeVisible();
  await validation.screenshot({ path: `${evidenceDirectory}/validation-platform-admin-${testInfo.project.name}.png` });
  page.once("dialog", (dialog) => dialog.accept("   "));
  await validation.getByRole("button", { name: "Revocar acceso de validación" }).click();
  await expect(validation.getByRole("alert")).toContainText("Ingresa un motivo de revocación.");
  expect(posted).toBe(0);
  page.once("dialog", (dialog) => dialog.accept("Cierre de validación"));
  await validation.getByRole("button", { name: "Revocar acceso de validación" }).click();
  await expect(validation.getByRole("status")).toHaveText("Acceso de validación revocado.");
  await expect.poll(() => listCalls).toBeGreaterThan(1);
  await expect(validation.getByRole("button", { name: "Revocar acceso de validación" })).toHaveCount(0);
  expect(posted).toBe(1);
});

test("Platform Admin sees a validation access conflict without a false success", async ({ page }) => {
  await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  let listCalls = 0;
  await page.route(`**/api/v1/platform/tenants/${tenantId}/regulatory-pack-validation-accesses`, async (route) => {
    listCalls += 1;
    await route.fulfill({ json: { items: [{ regulatory_pack_validation_access_id: memberId,
      pack_code: "ISO-QA", name: "Marco de validación", edition: "2022", license_classification: "NOT_YET_LICENSED",
      lifecycle_state: "active", effective_state: "future", effective_from: "2026-10-01T00:00:00Z",
      effective_to: null, row_version: 5 }], page: { has_more: false, next_cursor: null } } });
  });
  await page.route(`**/api/v1/platform/regulatory-pack-validation-accesses/${memberId}:revoke`, (route) => route.fulfill({
    status: 409, contentType: "application/json", body: JSON.stringify({ code: "TCDX.CONFLICT", message: "Conflict",
      correlation_id: memberId, retryable: false })
  }));
  await page.goto("/configuraciones/empresas");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  await expect(validation.getByRole("button", { name: "Revocar acceso de validación" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("Revisión de acceso"));
  await validation.getByRole("button", { name: "Revocar acceso de validación" }).click();
  await expect(validation.getByRole("alert")).toContainText("Conflicto de concurrencia");
  await expect(validation.getByRole("status")).toHaveCount(0);
  expect(listCalls).toBe(1);
});

test("Tenant Admin creates a canonical Subject in company settings", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN"]);
  await page.goto("/configuraciones/empresas");
  await expect(page.getByRole("heading", { name: "Subjects de la empresa" })).toBeVisible();
  await page.getByLabel("Clave canónica").fill("qa-core-process");
  await page.getByLabel("Nombre", { exact: true }).fill("Proceso QA");
  await page.getByRole("button", { name: "Crear Subject" }).click();
  await expect(page.getByText("Subject creado.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accesos de validación" })).toBeVisible();
  await page.screenshot({ path: `${evidenceDirectory}/subjects-admin-${testInfo.project.name}.png`, fullPage: true });
});

test("C-04W company settings hide retention controls without tenant Privacy permission", async ({ page }) => {
  await mockRuntime(page, ["TENANT_ADMIN"]);
  await page.goto("/configuraciones/empresas");
  const retention = page.getByRole("region", { name: "Retención documental de la empresa" });
  await expect(retention.getByText("Acceso no autorizado", { exact: true })).toBeVisible();
  await expect(retention.getByRole("heading", { name: "Políticas de retención" })).toHaveCount(0);
  await expect(retention.getByRole("heading", { name: "Aplicabilidad de retención" })).toHaveCount(0);
});

test("C-04W company settings show scoped retention and hide hold release from Tenant Admin", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN"], [], [
    "privacy.retention_policy.read", "privacy.retention_policy.create"
  ]);
  await page.goto("/configuraciones/empresas");
  const retention = page.getByRole("region", { name: "Retención documental de la empresa" });
  await expect(retention.getByRole("heading", { name: "Políticas de retención" })).toBeVisible();
  await expect(retention.getByRole("heading", { name: "Aplicabilidad de retención" })).toBeVisible();
  await expect(retention.getByRole("button", { name: "Nuevo registro" })).toHaveCount(2);
  await retention.getByRole("button", { name: "Ver detalle" }).last().click();
  const detail = page.getByRole("dialog");
  await expect(detail.getByRole("button", { name: "Levantar legal hold" })).toHaveCount(0);
  await page.screenshot({ path: `${evidenceDirectory}/retention-tenant-admin-${testInfo.project.name}.png`, fullPage: true });
});

test("QA validation content displays its condition and keeps filters tenant-scoped", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN", "CONTROL_OWNER"]);
  const controlQueries: URL[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/v1/controls") controlQueries.push(url); });
  await page.route("**/api/v1/regulatory-pack-validation-accesses/current", (route) => route.fulfill({ json: {
    items: [{ regulatory_pack_validation_access_id: memberId, regulatory_pack_version_id: roleId,
      pack_code: "ISO-QA", name: "Marco ISO de validación", edition: "2022", license_classification: "NOT_YET_LICENSED",
      lifecycle_state: "active", effective_state: "effective", effective_from: "2026-09-01T00:00:00Z", effective_to: null }],
    page: { has_more: false, next_cursor: null }
  } }));
  await page.goto("/configuraciones/empresas");
  await expect(page.getByText("Marco ISO de validación")).toBeVisible();
  await expect(page.getByText("Contenido provisional/no autoritativo para validación.")).toBeVisible();
  await page.route("**/api/v1/controls**", (route) => route.fulfill({ json: {
    items: [{ control_id: tenantId, control_code: "QA-C-001", name: "Control compartido", ownership_class: "GLOBAL_REFERENCE",
      lifecycle_state: "active", access_mode: "non_authoritative_validation", implementation_count: 0,
      applicability_decisions: [], normative_frameworks: [{ framework_version_id: roleId, framework_name: "Marco ISO de validación",
        edition: "2022", access_mode: "non_authoritative_validation" }] }],
    page: { has_more: false, next_cursor: null }, framework_filters: [{ framework_version_id: roleId,
      framework_code: "ISO-QA", framework_name: "Marco ISO de validación", edition: "2022",
      access_mode: "non_authoritative_validation" }]
  } }));
  await page.goto("/controles");
  await expect(page.getByText("QA-C-001")).toBeVisible();
  await expect(page.getByText(/Contenido provisional\/no autoritativo para validación/)).toBeVisible();
  await expect(page.getByLabel("Filtrar por aplicabilidad")).toHaveCount(0);
  await expect(page.getByLabel("Filtrar por implementación")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Aplicabilidad", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Implementación", exact: true })).toBeVisible();
  const status = page.getByLabel("Filtrar por estado", { exact: true });
  await expect(status).toBeDisabled();
  await expect(status.locator("option")).toHaveCount(1);
  await expect(page.getByText("El filtro por estado no está disponible: el catálogo completo de estados de controles aún no está publicado.", { exact: true })).toBeVisible();
  await page.getByLabel("Buscar controles por nombre, código o referencia normativa").fill("Control");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("QA-C-001")).toBeVisible();
  await expect.poll(() => controlQueries.some(url => url.searchParams.get("filter[query]") === "Control")).toBe(true);
  for (const url of controlQueries) {
    expect(url.searchParams.has("filter[applicability]")).toBe(false);
    expect(url.searchParams.has("filter[implementation]")).toBe(false);
    expect(url.searchParams.has("filter[lifecycle_state]")).toBe(false);
  }
  await page.screenshot({ path: `${evidenceDirectory}/validation-catalog-${testInfo.project.name}.png`, fullPage: true });
});

test("login surface exposes the governed OIDC entry point", async ({ page }, testInfo) => {
  await page.route("**/api/v1/auth/providers", (route) => route.fulfill({ json: { providers: [
    { provider: "ZOHO", available: true }, { provider: "MICROSOFT_ENTRA_ID", available: false },
    { provider: "GOOGLE_WORKSPACE", available: false }, { provider: "TCDX_MANAGED_IDENTITY", available: true }
  ] } }));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Tecdex GRC" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Zoho.*Disponible/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Tecdex Managed Identity.*Disponible/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Microsoft Entra ID.*No disponible/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Google Workspace.*No disponible/ })).toBeDisabled();
  await page.screenshot({ path: `${evidenceDirectory}/login-${testInfo.project.name}.png`, fullPage: true });
});

test("invitation entry clears the one-time token from the visible URL", async ({ page }, testInfo) => {
  await page.route("**/api/v1/access/me", (route) => route.fulfill({
    status: 401,
    contentType: "application/problem+json",
    body: JSON.stringify({ type: "about:blank", title: "Authentication required", status: 401 })
  }));
  await page.goto(`/#membership-invitation=${"A".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "Aceptar invitación" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar con Zoho" })).toBeVisible();
  await expect.poll(() => page.url()).not.toContain("membership-invitation");
  await page.screenshot({ path: `${evidenceDirectory}/invitation-accept-${testInfo.project.name}.png`, fullPage: true });
});

test("platform admin can generate a Zoho invitation without automatic roles", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Invitación con identidad corporativa Zoho" })).toHaveCount(0);
  if (testInfo.project.name.includes("narrow")) {
    await page.getByRole("button", { name: "Abrir navegación" }).click();
  }
  await page.getByRole("button", { name: "Usuarios" }).click();
  await expect(page.getByRole("heading", { name: "Invitación con identidad corporativa Zoho" })).toBeVisible();
  await page.getByRole("button", { name: "Invitar usuario" }).click();
  await page.getByLabel("Correo de invitación").fill("reviewer@example.test");
  await page.screenshot({ path: `${evidenceDirectory}/invitation-admin-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Generar invitación" }).click();
  await expect(page.locator(".invitation-result")).toContainText("Enlace de invitación de un solo uso");
  await expect(page.getByLabel("Enlace de invitación de un solo uso")).toHaveValue(new RegExp(`#membership-invitation=${"A".repeat(43)}$`));
  await page.reload();
  await expect(page.getByLabel("Enlace de invitación de un solo uso")).toHaveCount(0);
});

test("Platform companies and tenant users expose the canonical administrative flow", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN", "EVIDENCE_OWNER", "CONTROL_OWNER"], ["PLATFORM_ADMIN"]);
  await page.goto("/configuraciones/empresas");
  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible();
  await expect(page.getByText("TecDex SpA")).toBeVisible();
  await expect(page.getByText("GRC · v1")).toBeVisible();
  await expect(page.locator(".user-role-summary")).toContainText("Administrador de la plataforma · Administrador de la empresa · Responsable de evidencia · Responsable de control");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("TecDex SpA");
  await expect(page.getByRole("dialog")).toContainText("Marcos contratados");
  await expect(page.getByRole("dialog")).toContainText("Marco contractual A");
  await expect(page.getByRole("button", { name: "Activar marco" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revocar" })).toBeVisible();
  await page.getByRole("button", { name: "Administrar usuarios" }).click();
  await expect(page.getByRole("heading", { name: "Usuarios", exact: true })).toBeVisible();
  await expect(page.getByText("Mario de prueba")).toBeVisible();
  await expect(page.getByText("Vencida")).toBeVisible();
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("Sin roles asignados");
  await page.getByLabel("Selecciona un rol permitido").selectOption(roleId);
  await page.getByRole("button", { name: "Asignar rol" }).click();
  await expect(page.getByText("Rol asignado y auditado.", { exact: true })).toBeVisible();
  await page.screenshot({ path: `${evidenceDirectory}/admin-users-${testInfo.project.name}.png`, fullPage: true });
});

test("removing one tenant role requires human confirmation and preserves the other", async ({ page }) => {
  await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  const otherAssignmentId = "018f47f2-6170-7bd0-9d43-12f644a2b121";
  const futureAssignmentId = "018f47f2-6170-7bd0-9d43-12f644a2b122";
  const assignments = [
    { membership_role_id: roleId, role_id: roleId, role_code: "CONTROL_OWNER", role_name: "Control Owner", scope_kind: "tenant", valid_from: "2026-09-25T12:00:00Z", valid_to: null as string | null, etag: "a".repeat(64) },
    { membership_role_id: otherAssignmentId, role_id: otherAssignmentId, role_code: "EVIDENCE_OWNER", role_name: "Evidence Owner", scope_kind: "tenant", valid_from: "2026-09-25T12:00:00Z", valid_to: null, etag: "b".repeat(64) },
    { membership_role_id: futureAssignmentId, role_id: futureAssignmentId, role_code: "LEGAL_REVIEWER", role_name: "Legal Reviewer", scope_kind: "tenant", valid_from: new Date(Date.now() + 86_400_000).toISOString(), valid_to: null, etag: "c".repeat(64) }
  ];
  let revokeCount = 0;
  await page.route(/\/api\/v1\/(memberships|role-assignments\/)/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/v1/role-assignments/${roleId}:revoke`) {
      expect(url.searchParams.get("tenant_id")).toBe(tenantId);
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
      expect(route.request().headers()["if-match"]).toBe(`"${"a".repeat(64)}"`);
      expect(route.request().postDataJSON()).toEqual({ reason: "Preparar segregación SoD" });
      assignments[0]!.valid_to = new Date(Date.now() - 60_000).toISOString();
      revokeCount += 1;
      await route.fulfill({ status: 202, json: { operation_id: "membershipRoleRevoke", status: "completed", result: assignments[0] } });
      return;
    }
    if (url.pathname === "/api/v1/memberships" || url.pathname === `/api/v1/memberships/${memberId}`) {
      const person = { tenant_membership_id: memberId, tenant_id: tenantId, user_identity_id: memberId, membership_state: "active", joined_at: "2026-09-25T12:00:00Z", user_identity: { display_name: "Mario de prueba" }, roles: assignments };
      await route.fulfill({ json: url.pathname.endsWith(memberId) ? person : { items: [person], page: { has_more: false, next_cursor: null } } });
      return;
    }
    await route.fallback();
  });
  await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  await expect(page.getByRole("row", { name: /Mario de prueba/ })).toContainText("Responsable de control · Responsable de evidencia");
  await expect(page.getByRole("row", { name: /Mario de prueba/ })).not.toContainText("Revisor legal");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog")).toContainText("Responsable de control");
  await expect(page.getByRole("dialog")).toContainText("Responsable de evidencia");
  await expect(page.getByRole("dialog")).toContainText("Vigencia futura");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Quitar rol" })).toHaveCount(2);
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "confirm") await dialog.accept();
    else if (dialog.type() === "prompt") await dialog.accept("Preparar segregación SoD");
  });
  await page.getByRole("button", { name: "Quitar rol" }).first().click();
  await expect(page.getByText("Rol revocado y auditado. Los demás roles se conservaron.")).toBeVisible();
  expect(revokeCount).toBe(1);
  await expect(page.getByRole("row", { name: /Mario de prueba/ })).toContainText("Responsable de evidencia");
  await expect(page.getByRole("row", { name: /Mario de prueba/ })).not.toContainText("Responsable de control");
  await expect(page.getByRole("dialog")).toContainText("Responsable de evidencia");
  await expect(page.getByRole("dialog")).toContainText("Vigencia finalizada");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Quitar rol" })).toHaveCount(1);
});

test("dashboard visual contract, drill-down and accessibility", async ({ page }, testInfo) => {
  await mockRuntime(page);
  await page.goto("/dashboard");
  await expect(page.locator(".brand img")).toBeVisible();
  await expect.poll(() => page.locator(".brand img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
  await expect(page.locator(".kpi-card")).toHaveCount(4);
  await expect(page.getByText("Registros visibles de la empresa")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estado de requisitos" })).toBeVisible();
  await expect(page.getByText("Sobre registros visibles · 2").first()).toBeVisible();
  await expect(page.getByText("Válido", { exact: true })).toBeVisible();
  await expect(page.getByText("Datos insuficientes", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Fase 5|revisión visual humana|estado de implementación|result_status|insufficient_data|remediation_in_progress|in_review/);
  await expect(page.locator("body")).not.toContainText(/benchmark|puntaje global|tendencia de cumplimiento|meta anual/i);
  if (!testInfo.project.name.includes("narrow")) await expect(page.getByText("Responsable GRC")).toBeVisible();
  if (testInfo.project.name.includes("desktop") || testInfo.project.name.includes("laptop")) {
    const lowerVisual = await page.getByRole("heading", { name: "Estado de controles" }).boundingBox();
    expect(lowerVisual?.y).toBeLessThan(testInfo.project.name.includes("desktop") ? 1024 : 800);
  }
  await page.screenshot({ path: `${evidenceDirectory}/dashboard-${testInfo.project.name}.png`, fullPage: true });
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  if (testInfo.project.name.includes("narrow")) {
    await expect(page.getByRole("button", { name: "Abrir navegación" })).toBeVisible();
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  }
});

for (const [routeName, heading, screenshot, openDetail] of [
  ["cumplimiento", "Aplicabilidad", "aplicabilidad", false],
  ["requisitos", "Evaluaciones de requisitos", "evaluaciones-requisitos", false],
  ["cumplimiento", "Declaración de aplicabilidad", "soa", false],
  ["controles", "Controles", "controles", false],
  ["controles", "Evaluaciones de control", "evaluaciones-control", false],
  ["controles", "Pruebas de aseguramiento", "pruebas-aseguramiento", true],
  ["evidencias", "Solicitudes de evidencia", "solicitudes-evidencia", false],
  ["evidencias", "Evidencias", "evidencias", true],
  ["evidencias", "Políticas de retención", "politicas-retencion", true],
  ["acciones", "Hallazgos y brechas", "hallazgos", false],
  ["acciones", "Acciones", "acciones", true]
] as const) {
  test(`${heading} mantiene la baseline comercial en español`, async ({ page }, testInfo) => {
    await mockRuntime(page, ["GRC_MANAGER"], [],
      heading === "Políticas de retención" ? ["privacy.retention_policy.read"] : []);
    await page.goto(`/${routeName}`);
    await page.getByRole("tab", { name: heading, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Fase 5|revisión visual humana|estado de implementación/i);
    await expect(page.locator("body")).not.toContainText(/in_progress|in_review|under_review|remediation_in_progress|pending_verification/);
    if (openDetail) {
      await page.getByRole("button", { name: "Ver detalle" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").locator(".spinner")).toHaveCount(0);
    }
    await page.screenshot({ path: `${evidenceDirectory}/${screenshot}-${testInfo.project.name}.png`, fullPage: true });
  });
}

for (const result of ["valid", "no_data"] as const) {
  test(`Control assessment completes with ${result}, then refetches authoritative state`, async ({ page }) => {
    await mockRuntime(page);
    let state = "in_progress";
    let readsAfterCommand = 0;
    await page.route("**/api/v1/control-assessments**", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        expect(new URL(request.url()).pathname).toBe(`/api/v1/control-assessments/${tenantId}:complete`);
        expect(request.postDataJSON()).toEqual(result === "valid"
          ? { expected_version: 2, result_status: result, domain_conclusion: "effective", design_effectiveness: 90, operating_effectiveness: 80, coverage_percent: 100 }
          : { expected_version: 2, result_status: result });
        expect(request.headers()["x-tcdx-tenant-id"]).toBe(tenantId);
        expect(request.headers()["idempotency-key"]).toBeTruthy();
        state = "completed";
        await route.fulfill({ status: 202, json: { operation_id: "controlAssessmentSubmit", status: "completed" } });
        return;
      }
      if (state === "completed") readsAfterCommand++;
      const row = { control_assessment_id: tenantId, row_version: state === "completed" ? 3 : 2, domain_conclusion: "Control QA", lifecycle_state: state };
      await route.fulfill({ json: new URL(request.url()).pathname.endsWith(tenantId) ? row : { items: [row], page: { has_more: false, next_cursor: null } } });
    });
    await page.goto("/evaluaciones-control");
    await page.getByRole("button", { name: "Ver detalle" }).click();
    await page.getByLabel("Estado del resultado", { exact: true }).selectOption(result);
    if (result === "valid") {
      await page.getByLabel("Conclusión", { exact: true }).selectOption("effective");
      await page.getByLabel("Efectividad de diseño", { exact: true }).fill("90");
      await page.getByLabel("Efectividad operativa", { exact: true }).fill("80");
      await page.getByLabel("Cobertura (%)", { exact: true }).fill("100");
    }
    await page.getByRole("dialog").getByRole("button", { name: "Completar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => readsAfterCommand).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Revisar", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Completar", exact: true })).toHaveCount(0);
  });
}

test("Evidence request keeps backend denial and refetches successful fulfillment", async ({ page }) => {
  await mockRuntime(page);
  let state = "open";
  let commands = 0;
  await page.route("**/api/v1/evidence-requests**", async (route) => {
    if (route.request().method() === "POST") {
      expect(new URL(route.request().url()).pathname).toBe(`/api/v1/evidence-requests/${tenantId}:fulfill`);
      expect(route.request().postDataJSON()).toEqual({ expected_version: 1, evidence_version_id: memberId });
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
      commands++;
      if (commands === 1) {
        await route.fulfill({ status: 403, json: { type: "about:blank", title: "Denied", status: 403, code: "TCDX.AUTHORIZATION.DENIED" } });
      } else {
        state = "fulfilled";
        await route.fulfill({ status: 202, json: { operation_id: "evidenceRequestFulfill", status: "completed" } });
      }
      return;
    }
    const row = { evidence_request_id: tenantId, control_id:roleId, request_code: "QA-REQUEST", row_version: state === "open" ? 1 : 2, lifecycle_state: state };
    await route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(tenantId) ? row : { items: [row], page: { has_more: false, next_cursor: null } } });
  });
  await page.route("**/api/v1/evidence/**",route=>route.fulfill({json:{evidence_id:tenantId,evidence_code:"Evidencia aprobada",versions:[{evidence_version_id:memberId,version_number:1,lifecycle_state:"approved",file_object_id:roleId}]}}));
  await page.route("**/api/v1/file-objects/**",route=>route.fulfill({json:{file_object_id:roleId,scan_status:"passed"}}));
  await page.route("**/api/v1/evidence-versions/**",route=>route.fulfill({json:{evidence_version_id:memberId,evidence_id:tenantId,version_number:1,lifecycle_state:"approved",links:[{control_id:roleId}]}}));
  await page.goto("/solicitudes-evidencia");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await page.getByLabel("Evidencia",{exact:true}).selectOption(tenantId);
  await page.getByLabel("Versión de evidencia aprobada",{exact:true}).selectOption(memberId);
  await page.getByRole("dialog").getByRole("button", { name: "Cumplir solicitud", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cumplir solicitud", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "QA-REQUEST" })).toContainText("Atendida");
  await page.getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Cumplir solicitud", exact: true })).toHaveCount(0);
});

for (const [module, domain, entityField] of [["requisitos", "compliance", "requirement_applicability_id"], ["evaluaciones-control", "controls", "control_id"]] as const) {
  test(`${domain} assessment selects the published server methodology without a fabricated default`, async ({ page }) => {
    await mockRuntime(page, ["COMPLIANCE_MANAGER", "GRC_MANAGER"]);
    await page.route(`**/api/v1/${domain}-methodologies**`, route => route.fulfill({ json: { items: [{ methodology_version_ref: roleId, name: "Metodología publicada QA", version_number: 2 }], page: { has_more: false, next_cursor: null } } }));
    let submitted = false;
    await page.route(`**/api/v1/${domain === "compliance" ? "requirement" : "control"}-assessments`, async route => {
      if (route.request().method() !== "POST") { await route.fallback(); return; }
      expect(route.request().postDataJSON()).toMatchObject({ [entityField]: tenantId, methodology_version_ref: roleId });
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
      submitted = true; await route.fulfill({ status: 201, json: { operation_id: "assessmentCreate", status: "completed", result: {} } });
    });
    if(domain==="controls") await page.route("**/api/v1/controls/**",route=>route.fulfill({json:{control_id:tenantId,ownership_class:"TENANT_OWNED",name:"Control local",versions:[{control_version_id:memberId,version_number:1,lifecycle_state:"published"}]}}));
    await page.goto(`/${module}`);
    await page.getByRole("button", { name: "Nuevo registro", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const selector = dialog.getByLabel("Referencia metodológica", { exact: true });
    await expect(selector).toHaveValue("");
    await expect(selector.getByRole("option", { name: "Metodología publicada QA · v2" })).toHaveCount(1);
    await selector.selectOption(roleId);
    await dialog.getByLabel(domain === "compliance" ? "ID de aplicabilidad" : "ID de control", { exact: true }).selectOption(tenantId);
    if (domain === "controls") await dialog.getByLabel("Versión de control", { exact: true }).selectOption(memberId);
    await dialog.getByRole("button", { name: "Crear registro", exact: true }).click();
    await expect.poll(() => submitted).toBe(true);
  });
  test(`${domain} methodology catalog denial remains explicit and cannot become a free UUID field`, async ({ page }) => {
    await mockRuntime(page, ["COMPLIANCE_MANAGER", "GRC_MANAGER"]);
    await page.route(`**/api/v1/${domain}-methodologies**`, route => route.fulfill({ status: 403, json: { code: "TCDX.AUTHORIZATION.DENIED" } }));
    await page.goto(`/${module}`); await page.getByRole("button", { name: "Nuevo registro", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("alert")).toContainText("No tienes acceso a estas opciones en la empresa seleccionada.");
    await expect(dialog.getByLabel("Referencia metodológica", { exact: true })).toBeDisabled();
    await expect(dialog.locator('input[aria-label="Referencia metodológica"]')).toHaveCount(0);
  });
}

test("Phase6A Subject picker pages authorized records, searches and invalidates stale selection", async ({ page }, info) => {
  await mockRuntime(page);
  await page.route("**/api/v1/subjects?**", async route => {
    const url = new URL(route.request().url());
    expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
    if (url.searchParams.get("filter[query]")) { await route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } }); return; }
    const more = !!url.searchParams.get("page[cursor]");
    await route.fulfill({ json: { items: [{ subject_id: more ? memberId : roleId, display_name: more ? "Responsable adicional" : "Responsable inicial", subject_type: "process", canonical_key: more ? "responsable-adicional" : "responsable-inicial" }], page: { has_more: !more, next_cursor: more ? null : "opaque-subject-cursor" } } });
  });
  await page.goto("/controles"); await page.getByRole("button", { name: "Nuevo registro", exact: true }).click();
  const dialog = page.getByRole("dialog"); const owner = dialog.getByLabel("Responsable de negocio", { exact: true });
  await expect(owner.getByRole("option", { name: /Responsable inicial/ })).toHaveCount(1);
  await dialog.getByRole("button", { name: "Cargar más opciones", exact: true }).click();
  await expect(owner.getByRole("option", { name: /Responsable adicional/ })).toHaveCount(1); await owner.selectOption(memberId);
  await expect(owner).toHaveValue(memberId);
  await dialog.getByLabel("Buscar Responsable de negocio", { exact: true }).fill("inexistente");
  await dialog.getByLabel("Buscar Responsable de negocio", { exact: true }).locator("..").locator("..").getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(owner).toHaveValue(""); await expect(owner.locator("..").getByText("No hay registros disponibles en este contexto.", { exact: true })).toBeVisible();
  await expect(dialog.locator("form form")).toHaveCount(0);
  expect(await dialog.locator(".drawer-body").evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await dialog.screenshot({ path: `${evidenceDirectory}/phase6a3-selector-${info.project.name}.png` });
});

test("Phase6A control versions require an explicit choice and retain native keyboard labels", async ({ page }) => {
  await mockRuntime(page);
  await page.route("**/api/v1/controls**", route => {
    const detail = new URL(route.request().url()).pathname.endsWith(tenantId);
    return route.fulfill({ json: detail ? { control_id: tenantId, ownership_class: "GLOBAL_REFERENCE", control_code: "BASE-001", name: "Base", versions: [{ control_version_id: memberId, version_number: 2 }, { control_version_id: roleId, version_number: 1 }] } : { items: [{ control_id: tenantId, ownership_class: "GLOBAL_REFERENCE", control_code: "BASE-001", name: "Base" }], page: { has_more: false, next_cursor: null } } });
  });
  await page.goto("/controles"); await page.getByRole("button", { name: "Nuevo registro", exact: true }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByLabel("Control base autorizado", { exact: true }).selectOption(tenantId);
  const version = dialog.getByLabel("Versión de control", { exact: true });
  await expect(version.getByRole("option")).toHaveCount(3); await expect(version).toHaveValue("");
  await version.focus(); await expect(version).toBeFocused(); await version.press("Tab"); await expect(dialog.getByLabel("Código de control", { exact: true })).toBeFocused(); await version.selectOption(memberId);
  await expect(version).not.toHaveValue("");
  await dialog.getByLabel("Control base autorizado", { exact: true }).selectOption(""); await expect(version).toHaveValue(""); await expect(version).toBeDisabled();
  expect((await dialog.innerText()).includes(tenantId)).toBe(false);
});

test("Phase6A selector failures retry without exposing technical error content", async ({ page }) => {
  await mockRuntime(page); let attempts = 0;
  await page.route("**/api/v1/subjects?**", route => { attempts++; return attempts === 1 ? route.fulfill({ status: 503, json: { code: "TCDX.SERVICE.UNAVAILABLE", message: "SQL secret internal_table", retryable: true } }) : route.fulfill({ json: { items: [{ subject_id: memberId, display_name: "Responsable autorizado", subject_type: "process", canonical_key: "responsable" }], page: { has_more: false, next_cursor: null } } }); });
  await page.goto("/controles"); await page.getByRole("button", { name: "Nuevo registro", exact: true }).click(); const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("No pudimos cargar las opciones"); await expect(dialog).not.toContainText("internal_table");
  await dialog.getByRole("button", { name: "Reintentar", exact: true }).click(); await expect(dialog.getByLabel("Responsable de negocio", { exact: true }).getByRole("option", { name: /Responsable autorizado/ })).toHaveCount(1);
});

test("Phase6A permission revocation during pagination removes cached choices and selection", async ({ page }) => {
  await mockRuntime(page);
  await page.route("**/api/v1/subjects?**", route => {
    const more = new URL(route.request().url()).searchParams.has("page[cursor]");
    return more ? route.fulfill({ status: 403, json: { code: "TCDX.AUTHORIZATION.DENIED", message: "private tenant SQL" } }) : route.fulfill({ json: { items: [{ subject_id: memberId, display_name: "Responsable revocado", subject_type: "process", canonical_key: "revocado" }], page: { has_more: true, next_cursor: "restricted-next" } } });
  });
  await page.goto("/controles"); await page.getByRole("button", { name: "Nuevo registro", exact: true }).click();
  const dialog = page.getByRole("dialog"); const owner = dialog.getByLabel("Responsable de negocio", { exact: true });
  await owner.selectOption(memberId); await expect(owner).toHaveValue(memberId);
  await dialog.getByRole("button", { name: "Cargar más opciones", exact: true }).click();
  await expect(owner).toBeDisabled(); await expect(owner).toHaveValue("");
  await expect(owner.getByRole("option", { name: /Responsable revocado/ })).toHaveCount(0);
  await expect(dialog.getByRole("alert")).toContainText("No tienes acceso"); await expect(dialog).not.toContainText("private tenant SQL");
});

test("Phase6A selectors fail closed in Spanish when an operational translation is unavailable", async ({ page }) => {
  await mockRuntime(page);
  await page.route("**/api/v1/subjects?**", route => route.fulfill({ json: {
    items: [{ subject_id: memberId, display_name: "Objeto autorizado", subject_type: "untranslated_extension" }],
    page: { has_more: false, next_cursor: null }
  } }));
  await page.goto("/controles"); await page.getByRole("button", { name: "Nuevo registro", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("No hay una traducción disponible para estas opciones. La selección no está habilitada.", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Responsable de negocio", { exact: true })).toBeDisabled();
  await expect(dialog).not.toContainText("untranslated_extension");
  await expect(dialog).not.toContainText(memberId);
});

test("Macro R1 framework and SoA items use authorized business selectors without UUID/JSON input",async({page},info)=>{
 await mockRuntime(page);
 await page.route("**/api/v1/framework-version-references?**",route=>{const u=new URL(route.request().url());expect(u.searchParams.get('purpose')).toBe('select');return route.fulfill({json:{items:[{framework_version_id:roleId,framework_code:'NORMA',framework_name:'Marco autorizado',edition:'v1',version_number:1,lifecycle_state:'published',selectable:true}],page:{has_more:false,next_cursor:null}}});});
 await page.goto('/soa');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Versión normativa',{exact:true}).selectOption(roleId);await dialog.getByRole('button',{name:'Agregar elemento',exact:true}).click();
 await expect(dialog.getByLabel('Estado de implementación',{exact:true})).toBeVisible();
 await expect(dialog.getByLabel('Estado de implementación',{exact:true}).getByRole('option',{name:'Implementado',exact:true})).toHaveCount(1);
 await expect(dialog.locator('textarea[placeholder*="JSON"],input[value="'+roleId+'"]')).toHaveCount(0);
 await expect(dialog).not.toContainText(roleId);await dialog.screenshot({path:`/tmp/tcdx-step6a3-macro-soa-${info.project.name}.png`});
});
test("Macro R1 responsible selection binds purpose and selected Issue; vocabulary labels are Spanish",async({page},info)=>{
 await mockRuntime(page);let read=false;
 await page.route('**/api/v1/membership-references?**',route=>{const u=new URL(route.request().url());expect(u.searchParams.get('purpose')).toBe('action-assignment');expect(u.searchParams.get('issue_id')).toBe(tenantId);read=true;return route.fulfill({json:{items:[{tenant_membership_id:memberId,display_name:'Responsable autorizado',joined_at:'2026-10-09T00:00:00Z',selectable:true}],page:{has_more:false,next_cursor:null}}});});
 await page.goto('/acciones');await page.getByRole('tab',{name:'Acciones',exact:true}).click();await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.getByLabel('Responsable',{exact:true})).toBeDisabled();await dialog.getByLabel('Hallazgo',{exact:true}).selectOption(tenantId);await dialog.getByLabel('Responsable',{exact:true}).selectOption(memberId);
 await expect.poll(()=>read).toBe(true);await dialog.getByLabel('Prioridad',{exact:true}).selectOption('normal');await expect(dialog.getByLabel('Prioridad',{exact:true}).getByRole('option',{name:'Normal',exact:true})).toHaveCount(1);
 await expect(dialog).not.toContainText(memberId);await dialog.screenshot({path:`/tmp/tcdx-step6a3-macro-responsable-${info.project.name}.png`});
});
test("v1.12 retention reports missing operational applicability without requiring legal accreditation",async({page},info)=>{
 await mockRuntime(page,['EVIDENCE_OWNER']);await page.route('**/api/v1/retention-policy-references?**',route=>route.fulfill({status:422,json:{code:'TCDX.INVARIANT.VIOLATION',message:'Policy is not eligible',correlation_id:tenantId,retryable:false}}));
 await page.goto('/evidencias');await page.getByRole('tab',{name:'Evidencias',exact:true}).click();await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.getByText('No hay una aplicabilidad operativa elegible para este contexto.',{exact:false})).toBeVisible();await expect(dialog.getByLabel('Política de retención',{exact:true}).locator('option')).toHaveCount(1);
 await expect(dialog.locator('input[aria-label="ID de política de retención"]')).toHaveCount(0);await dialog.screenshot({path:`docs/phase6a/STEP_6A3/evidence/ordinary-retention-v112-20261016/missing-applicability-${info.project.name}.png`});
});

test("v1.12 ordinary retention remains selectable without legal accreditation", async ({ page }, info) => {
  await mockRuntime(page, ['EVIDENCE_OWNER']);
  await page.route('**/api/v1/retention-policy-references?**', route => route.fulfill({json:{
    items:[{retention_policy_id:tenantId,tenant_id:tenantId,policy_code:'Retención operativa ordinaria',version_number:1,
      policy_kind:'tenant_policy',is_mandatory:false,source_evidence_version_id:null,selectable:true}],
    page:{has_more:false,next_cursor:null}
  }}));
  await page.goto('/evidencias');
  await page.getByRole('tab',{name:'Evidencias',exact:true}).click();
  await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
  const dialog=page.getByRole('dialog');
  const policy=dialog.getByLabel('Política de retención',{exact:true});
  await policy.selectOption(tenantId);
  await expect(policy).toHaveValue(tenantId);
  await expect(dialog.getByText('La configuración ordinaria no requiere una fuente jurídica;', {exact:false})).toBeVisible();
  await expect(dialog.getByText('No hay una aplicabilidad operativa elegible', {exact:false})).toHaveCount(0);
  await expect(dialog.locator('input[aria-label="ID de política de retención"]')).toHaveCount(0);
  await policy.focus();
  await expect(policy).toBeFocused();
  await dialog.screenshot({path:`docs/phase6a/STEP_6A3/evidence/ordinary-retention-v112-20261016/ordinary-retention-${info.project.name}.png`});
});

// Local mocked presentation evidence only; never a legal source or QA acceptance.
test("INITIAL_SOURCE bind uses backend candidates and distinguishes formal source from ordinary operation", async ({ page }, info) => {
  await mockRuntime(page,["TENANT_ADMIN"],[],["privacy.retention_policy.read","privacy.retention_policy.update"]);
  let submitted=false;
  const draft={retention_policy_applicability_id:roleId,retention_policy_id:memberId,row_version:1,classification:"confidential",lifecycle_state:"draft",source_evidence_version_id:null,source_clause_ref:null,effective_from:null,effective_to:null,initial_source_bind_allowed:true,custodian_display_name:"Custodio local simulado",initial_source_candidates:[{evidence_version_id:tenantId,version_number:1,evidence_code:"Documento local simulado, sin fuerza jurídica"}]};
  await page.route('**/api/v1/retention-policy-applicabilities**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='POST') {
      expect(url.pathname).toBe(`/api/v1/retention-policy-applicabilities/${roleId}:bind-initial-source`);
      expect(request.headers()['if-match']).toBe('"1"');expect(request.headers()['idempotency-key']).toBeTruthy();
      expect(request.postDataJSON()).toEqual({source_evidence_version_id:tenantId,source_clause_ref:'Cláusula de prueba local',effective_from:'2026-10-15T12:00:00Z'});
      submitted=true;await route.fulfill({status:200,json:{result:{...draft,row_version:2,source_evidence_version_id:tenantId}}});return;
    }
    await route.fulfill({json:url.pathname.endsWith(roleId)?draft:{items:[draft],page:{has_more:false,next_cursor:null}}});
  });
  await page.goto('/configuraciones/empresas');
  const section=page.getByRole('region',{name:'Retención documental de la empresa'});
  await section.getByRole('button',{name:'Ver detalle'}).last().click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('status').filter({hasText:'La fuente inicial formal requiere'})).toBeVisible();
  const source=dialog.getByLabel('Fuente inicial aprobada',{exact:true});
  await source.selectOption(tenantId);await source.focus();await expect(source).toBeFocused();
  await dialog.getByLabel('Cláusula o disposición aplicable',{exact:true}).fill('Cláusula de prueba local');
  await dialog.getByLabel('Vigente desde',{exact:true}).fill('2026-10-15T12:00:00Z');
  expect(await dialog.locator('.drawer-body').evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
  await dialog.screenshot({path:`docs/phase6a/STEP_6A3/evidence/ordinary-retention-v112-20261016/LOCAL_SIMULATED_BIND_${info.project.name}.png`});
  await dialog.getByRole('button',{name:'Vincular fuente inicial',exact:true}).click();
  await expect.poll(()=>submitted).toBe(true);
});

// QA findings: isolated presentation/payload checks, not authenticated QA acceptance.
test("STEP6A3 QA precedence follows policy kind and cannot submit an arbitrary 500", async ({page}, info) => {
  await mockRuntime(page, ['TENANT_ADMIN'], [], ['privacy.retention_policy.read','privacy.retention_policy.create']);
  const expected: Record<string, number> = {tenant_policy:200, legal_hold:500, contractual_policy:300, mandatory_regulatory_policy:400, product_baseline:100};
  const posted: Record<string, unknown>[] = [];
  await page.route('**/api/v1/retention-policies', async route => {
    if (route.request().method() !== 'POST') { await route.fallback(); return; }
    const body = route.request().postDataJSON();
    expect(body.precedence_rank).toBe(expected[body.policy_kind]);
    if (body.policy_kind === 'legal_hold') expect(body).not.toHaveProperty('retention_seconds');
    else expect(body.retention_seconds).toBe(3600);
    posted.push(body);
    await route.fulfill({status:202,json:{operation_id:'retentionPolicyCreate',status:'completed',result:{retention_policy_id:tenantId}}});
  });
  await page.goto('/evidencias');
  await page.getByRole('tab',{name:'Políticas de retención',exact:true}).click();
  for (const [kind, rank] of Object.entries(expected)) {
    await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
    const dialog=page.getByRole('dialog');
    await dialog.getByLabel('Código de política',{exact:true}).fill('LOCAL-QA-'+kind);
    await dialog.getByLabel('Número de versión',{exact:true}).fill('1');
    await dialog.getByLabel('Tipo de política',{exact:true}).selectOption(kind);
    const precedence=dialog.getByLabel('Orden de precedencia',{exact:true});
    await expect(precedence).toHaveValue(String(rank));
    await expect(precedence).not.toBeEditable();
    // Switching away from hold must immediately remove its 500 precedence.
    if (kind==='tenant_policy') {
      await dialog.getByLabel('Tipo de política',{exact:true}).selectOption('legal_hold');
      await expect(precedence).toHaveValue('500');
      await dialog.getByLabel('Tipo de política',{exact:true}).selectOption(kind);
      await expect(precedence).toHaveValue('200');
    }
    await dialog.getByLabel('Duración de retención (segundos)',{exact:true}).fill('3600');
    await dialog.getByLabel('Evento de inicio de retención',{exact:true}).selectOption('expiry_or_closure');
    await dialog.getByLabel('Obligatoria',{exact:true}).selectOption(kind==='legal_hold'?'true':'false');
    if (kind==='tenant_policy') await dialog.screenshot({path:`.continuity-preservation/step6a3-20261016/qa-precedence-${info.project.name}.png`});
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect(dialog).toHaveCount(0);
  }
  expect(posted).toHaveLength(5);
});

test("STEP6A3 QA Platform company opens existing tenant applicability tab", async ({page}, info) => {
  await mockRuntime(page,['TENANT_ADMIN'],['PLATFORM_ADMIN'],['privacy.retention_policy.read','privacy.retention_policy.create']);
  await page.goto('/configuraciones/empresas');
  await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
  await page.getByRole('dialog').getByRole('button',{name:'Abrir aplicabilidad de retención',exact:true}).click();
  await expect(page).toHaveURL(/\/evidencias\?tab=aplicabilidad-retencion$/);
  await expect(page.getByRole('tab',{name:'Aplicabilidad de retención',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('heading',{name:'Aplicabilidad de retención',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab',{name:'Aplicabilidad de retención',exact:true})).toHaveAttribute('aria-selected','true');
  await page.screenshot({path:`.continuity-preservation/step6a3-20261016/qa-applicability-${info.project.name}.png`,fullPage:true});
});

test("STEP6A3 QA Platform authority alone does not open tenant retention", async ({page}) => {
  await mockRuntime(page,[],['PLATFORM_ADMIN']);
  let retentionReads=0;
  await page.route('**/api/v1/retention-policy-applicabilities**',route=>{retentionReads++;return route.fulfill({status:403,json:{}});});
  await page.goto('/configuraciones/empresas');
  await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByText('La retención se administra en Evidencias',{exact:false})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Abrir aplicabilidad de retención'})).toHaveCount(0);
  expect(retentionReads).toBe(0);
});

test("STEP6A3 QA company shortcut does not reuse permission from a different tenant", async ({page}) => {
  await mockRuntime(page,['TENANT_ADMIN'],['PLATFORM_ADMIN'],['privacy.retention_policy.read']);
  await page.route(url=>url.pathname==='/api/v1/platform/tenants',route=>route.fulfill({json:{items:[{tenant_id:memberId,display_name:'Otra empresa',legal_name:'Otra empresa',lifecycle_state:'active'}],page:{has_more:false,next_cursor:null}}}));
  await page.route(`**/api/v1/platform/tenants/${memberId}`,route=>route.fulfill({json:{tenant_id:memberId,display_name:'Otra empresa',legal_name:'Otra empresa',lifecycle_state:'active'}}));
  await page.route(url=>url.pathname===`/api/v1/platform/tenants/${memberId}/regulatory-pack-validation-accesses`,route=>{expect(route.request().headers()['x-tcdx-tenant-id']).toBeUndefined();return route.fulfill({json:{items:[],page:{has_more:false,next_cursor:null}}});});
  await page.route(url=>url.pathname==='/api/v1/platform/plan-versions',route=>{expect(route.request().headers()['x-tcdx-tenant-id']).toBeUndefined();return route.fulfill({json:{items:[],page:{has_more:false,next_cursor:null}}});});
  await page.goto('/configuraciones/empresas');
  await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('heading',{name:'Otra empresa',exact:true})).toBeVisible();
  await expect(dialog.getByText('La retención se administra en Evidencias',{exact:false})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Abrir aplicabilidad de retención'})).toHaveCount(0);
});

test("STEP6A3 QA applicability deep link preserves tenant permission filtering", async ({page}) => {
  await mockRuntime(page,['TENANT_ADMIN']);
  let retentionReads=0;
  await page.route('**/api/v1/retention-policy-applicabilities**',route=>{retentionReads++;return route.fulfill({status:403,json:{}});});
  await page.goto('/evidencias?tab=aplicabilidad-retencion');
  await expect(page.getByRole('tab',{name:'Solicitudes de evidencia',exact:true})).toBeVisible();
  await expect(page.getByRole('tab',{name:'Aplicabilidad de retención',exact:true})).toHaveCount(0);
  expect(retentionReads).toBe(0);
});

// is_mandatory regression: exact reported ordinary-policy inputs; strict boolean contract.
test("STEP6A3 mandatory QA_RET_ORD_001 No is JSON false for PRIVACY_MANAGER", async ({page},info) => {
  await mockRuntime(page,['PRIVACY_MANAGER'],[],['privacy.retention_policy.read','privacy.retention_policy.create']);
  let posted=0;
  await page.route(url=>url.pathname==='/api/v1/retention-policies',async route=>{
    if(route.request().method()!=='POST'){await route.fallback();return;}
    posted++;
    const body=route.request().postDataJSON();
    if(typeof body.is_mandatory!=='boolean'){
      await route.fulfill({status:400,json:{code:'TCDX.VALIDATION.FAILED',details:{field:'is_mandatory'},correlation_id:tenantId,retryable:false}});return;
    }
    expect(body).toEqual({policy_code:'QA_RET_ORD_001',version_number:1,policy_kind:'tenant_policy',retention_seconds:31536000,trigger_event_code:'expiry_or_closure',precedence_rank:200,is_mandatory:false});
    await route.fulfill({status:202,json:{operation_id:'retentionPolicyCreate',status:'completed',result:{retention_policy_id:tenantId}}});
  });
  await page.goto('/evidencias?tab=retencion');
  await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Código de política',{exact:true}).fill('QA_RET_ORD_001');
  await dialog.getByLabel('Número de versión',{exact:true}).fill('1');
  await dialog.getByLabel('Tipo de política',{exact:true}).selectOption('tenant_policy');
  await dialog.getByLabel('Duración de retención (segundos)',{exact:true}).fill('31536000');
  await dialog.getByLabel('Evento de inicio de retención',{exact:true}).selectOption('expiry_or_closure');
  await expect(dialog.getByLabel('Orden de precedencia',{exact:true})).toHaveValue('200');
  const mandatory=dialog.getByRole('combobox',{name:'Obligatoria',exact:true});
  await expect(mandatory).toHaveValue('');
  await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Selecciona Sí o No en Obligatoria.');
  expect(posted).toBe(0);
  await mandatory.selectOption({label:'No'});
  await dialog.screenshot({path:`.continuity-preservation/step6a3-20261016/qa-is-mandatory-${info.project.name}.png`});
  await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);expect(posted).toBe(1);
});

test("STEP6A3 mandatory explicit Si preserves mandatory policy and legal hold payloads", async ({page}) => {
  await mockRuntime(page,['PRIVACY_MANAGER'],[],['privacy.retention_policy.read','privacy.retention_policy.create']);
  const posted:string[]=[];
  await page.route(url=>url.pathname==='/api/v1/retention-policies',async route=>{
    if(route.request().method()!=='POST'){await route.fallback();return;}
    const body=route.request().postDataJSON();expect(body.is_mandatory).toBe(true);
    expect(body.precedence_rank).toBe(body.policy_kind==='legal_hold'?500:400);
    if(body.policy_kind==='legal_hold') expect(body).not.toHaveProperty('retention_seconds');
    else expect(body.retention_seconds).toBe(31536000);
    posted.push(body.policy_kind);
    await route.fulfill({status:202,json:{operation_id:'retentionPolicyCreate',status:'completed',result:{retention_policy_id:tenantId}}});
  });
  await page.goto('/evidencias?tab=retencion');
  for(const kind of ['mandatory_regulatory_policy','legal_hold']){
    await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
    await dialog.getByLabel('Código de política',{exact:true}).fill('LOCAL-BOOLEAN-'+kind);
    await dialog.getByLabel('Número de versión',{exact:true}).fill('1');
    await dialog.getByLabel('Tipo de política',{exact:true}).selectOption(kind);
    await dialog.getByLabel('Duración de retención (segundos)',{exact:true}).fill('31536000');
    await dialog.getByLabel('Evento de inicio de retención',{exact:true}).selectOption('expiry_or_closure');
    await dialog.getByRole('combobox',{name:'Obligatoria',exact:true}).selectOption({label:'Sí'});
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();await expect(dialog).toHaveCount(0);
  }
  expect(posted).toEqual(['mandatory_regulatory_policy','legal_hold']);
});

test("STEP6A3 mandatory draft update also serializes No as JSON false", async ({page}) => {
  await mockRuntime(page,['PRIVACY_MANAGER'],[],['privacy.retention_policy.read','privacy.retention_policy.update']);
  const policy={retention_policy_id:tenantId,policy_code:'LOCAL-BOOLEAN-UPDATE',version_number:1,policy_kind:'tenant_policy',retention_seconds:31536000,is_mandatory:true,row_version:1,lifecycle_state:'draft'};
  let updated=false;
  await page.route(url=>url.pathname.startsWith('/api/v1/retention-policies'),async route=>{
    const u=new URL(route.request().url());
    if(route.request().method()==='POST'){
      expect(u.pathname).toBe(`/api/v1/retention-policies/${tenantId}:update`);
      expect(route.request().postDataJSON()).toEqual({retention_seconds:31536000,is_mandatory:false});
      expect(route.request().headers()['if-match']).toBe('"1"');updated=true;
      await route.fulfill({status:200,json:{...policy,is_mandatory:false,row_version:2}});return;
    }
    await route.fulfill({json:u.pathname==='/api/v1/retention-policies'?{items:[policy],page:{has_more:false,next_cursor:null}}:policy});
  });
  await page.goto('/evidencias?tab=retencion');await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
  const section=page.getByRole('dialog').locator('section.workflow-action').filter({has:page.getByRole('heading',{name:'Actualizar borrador',exact:true})});
  await section.getByLabel('Duración de retención (segundos)',{exact:true}).fill('31536000');
  await section.getByRole('combobox',{name:'Obligatoria',exact:true}).selectOption({label:'No'});
  await section.getByRole('button',{name:'Actualizar borrador',exact:true}).click();await expect.poll(()=>updated).toBe(true);
});

// Classification regression: the approved CV-01 enum is shared with FileClassification.
async function mockApplicabilityCreation(page:Page, source=false, timezone="Europe/Berlin") {
  await mockRuntime(page,['PRIVACY_MANAGER'],[],['privacy.retention_policy.read','privacy.retention_policy.create','organization.subject.read','evidence.evidence.read'],timezone);
  await page.route(url=>url.pathname==='/api/v1/retention-policies',async route=>{
    expect(new URL(route.request().url()).searchParams.get('filter[lifecycle_state]')).toBe('published');
    expect(route.request().headers()['x-tcdx-tenant-id']).toBe(tenantId);
    await route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_id:tenantId,policy_code:'QA_RET_ORD_001',version_number:1,policy_kind:'tenant_policy',is_mandatory:false,lifecycle_state:'published'}],page:{has_more:false,next_cursor:null}}});
  });
  if(source){
    await page.route(url=>url.pathname==='/api/v1/subjects',route=>route.fulfill({json:{items:[{tenant_id:tenantId,subject_id:memberId,display_name:'Alcance autorizado'}],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>url.pathname==='/api/v1/evidence',route=>route.fulfill({json:{items:[{tenant_id:tenantId,evidence_id:memberId,evidence_code:'EV-FUENTE',lifecycle_state:'approved'}],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>url.pathname===`/api/v1/evidence/${memberId}`,route=>route.fulfill({json:{tenant_id:tenantId,evidence_id:memberId,evidence_code:'EV-FUENTE',versions:[{evidence_version_id:roleId,version_number:1,lifecycle_state:'approved'},{evidence_version_id:tenantId,version_number:2,lifecycle_state:'draft'}]}}));
    await page.route(url=>url.pathname===`/api/v1/evidence-versions/${roleId}`,route=>route.fulfill({json:{tenant_id:tenantId,evidence_id:memberId,evidence_version_id:roleId,version_number:1,lifecycle_state:'approved',ordinary_consumption_allowed:true}}));
  }
}

test('STEP6A3 classification uses canonical choices and creates ordinary applicability without legal source',async({page},info)=>{
  await mockApplicabilityCreation(page);
  const posted:Record<string,unknown>[]=[];
  await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',async route=>{
    if(route.request().method()!=='POST'){await route.fallback();return;}
    const body=route.request().postDataJSON();
    if(!['public','internal','confidential','restricted'].includes(body.classification)){
      await route.fulfill({status:400,json:{code:'TCDX.VALIDATION.FAILED',details:{field:'classification'}}});return;
    }
    expect(route.request().headers()['x-tcdx-tenant-id']).toBe(tenantId);
    expect(body).toEqual({retention_policy_id:tenantId,version_number:1,classification:body.classification});
    posted.push(body);await route.fulfill({status:202,json:{operation_id:'retentionApplicabilityCreate',status:'completed',result:{retention_policy_applicability_id:memberId}}});
  });
  await page.goto('/evidencias?tab=aplicabilidad-retencion');
  for(const code of ['public','internal','confidential','restricted']){
    await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
    const classification=dialog.getByRole('combobox',{name:'Clasificación',exact:true});
    await expect(classification).toHaveValue('');
    await expect(classification.locator('option')).toHaveText(['Selecciona una opción','Pública','Interna','Confidencial','Restringida']);
    await dialog.getByRole('combobox',{name:'Política de retención',exact:true}).selectOption({label:'Política de la organización · QA_RET_ORD_001 · v1 · Publicada'});
    await dialog.getByLabel('Versión de aplicabilidad',{exact:true}).fill('1');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect(dialog.getByRole('alert')).toContainText('clasificación del catálogo');
    await classification.selectOption(code);
    if(code==='confidential')await dialog.screenshot({path:`.continuity-preservation/step6a3-20261016/qa-classification-${info.project.name}.png`});
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();await expect(dialog).toHaveCount(0);
  }
  expect(posted.map(row=>row.classification)).toEqual(['public','internal','confidential','restricted']);
});

test('STEP6A3 classification preserves real scope and approved evidence version references',async({page})=>{
  await mockApplicabilityCreation(page,true);let posted=false;
  await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',async route=>{
    if(route.request().method()!=='POST'){await route.fallback();return;}
    expect(route.request().postDataJSON()).toEqual({retention_policy_id:tenantId,version_number:1,classification:'confidential',scope_subject_id:memberId,source_evidence_version_id:roleId,source_clause_ref:'Cláusula 3',effective_from:'2026-10-16T12:00:00Z'});
    posted=true;await route.fulfill({status:202,json:{operation_id:'retentionApplicabilityCreate',status:'completed',result:{retention_policy_applicability_id:memberId}}});
  });
  await page.goto('/evidencias?tab=aplicabilidad-retencion');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('combobox',{name:'Política de retención',exact:true}).selectOption(tenantId);
  await dialog.getByLabel('Versión de aplicabilidad',{exact:true}).fill('1');
  await dialog.getByRole('combobox',{name:'Clasificación',exact:true}).selectOption('confidential');
  await dialog.getByRole('combobox',{name:'ID del alcance',exact:true}).selectOption(memberId);
  await dialog.getByLabel('Cláusula o disposición aplicable',{exact:true}).fill('Cláusula 3');
  await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('versión de evidencia aprobada');expect(posted).toBe(false);
  await dialog.getByRole('combobox',{name:'Evidencia',exact:true}).selectOption(memberId);
  const version=dialog.getByRole('combobox',{name:'Versión de evidencia aprobada',exact:true});
  await expect(version.locator('option')).toHaveCount(2);await version.selectOption(roleId);
  await dialog.getByLabel('Vigente desde',{exact:true}).fill('2026-10-16T14:00');
  await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();await expect(dialog).toHaveCount(0);expect(posted).toBe(true);
});

test.describe('STEP6A3 local dates',()=>{
  test.use({timezoneId:'Asia/Tokyo'}); // The tenant zone must override the browser zone.
  test('creates from Santiago wall clocks with optional end and chronological validation',async({page},info)=>{
    await mockApplicabilityCreation(page,false,'America/Santiago');
    const posted:Record<string,unknown>[]=[];
    await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',async route=>{
      if(route.request().method()!=='POST'){await route.fallback();return;}
      posted.push(route.request().postDataJSON());await route.fulfill({status:202,json:{operation_id:'retentionApplicabilityCreate',status:'completed',result:{retention_policy_applicability_id:memberId}}});
    });
    await page.goto('/evidencias?tab=aplicabilidad-retencion');
    for(const withEnd of [false,true]){
      await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
      await dialog.getByRole('combobox',{name:'Política de retención',exact:true}).selectOption(tenantId);
      await dialog.getByLabel('Versión de aplicabilidad',{exact:true}).fill('1');
      await dialog.getByRole('combobox',{name:'Clasificación',exact:true}).selectOption('internal');
      await expect(dialog.getByLabel('Vigente desde',{exact:true})).toHaveAttribute('type','datetime-local');
      await dialog.getByLabel('Vigente desde',{exact:true}).fill('2026-10-16T12:30');
      if(withEnd){
        await dialog.getByLabel('Vigente hasta',{exact:true}).fill('2026-10-16T12:00');
        await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('posterior');
        await dialog.getByLabel('Vigente hasta',{exact:true}).fill('2026-10-17T12:30');
      }
      await dialog.screenshot({path:`.continuity-preservation/step6a3-20261016/qa-local-dates-${withEnd}-${info.project.name}.png`});
      await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();await expect(dialog).toHaveCount(0);
    }
    expect(posted).toEqual([
      {retention_policy_id:tenantId,version_number:1,classification:'internal',effective_from:'2026-10-16T15:30:00Z'},
      {retention_policy_id:tenantId,version_number:1,classification:'internal',effective_from:'2026-10-16T15:30:00Z',effective_to:'2026-10-17T15:30:00Z'}
    ]);
  });
  test('blocks DST gaps and requires explicit choice for repeated local clocks',async({page})=>{
    await mockApplicabilityCreation(page,false,'America/Santiago');let posted=0;
    await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',async route=>{
      if(route.request().method()!=='POST'){await route.fallback();return;}
      expect(route.request().postDataJSON().effective_from).toBe('2026-04-05T03:30:00Z');posted++;
      await route.fulfill({status:202,json:{operation_id:'retentionApplicabilityCreate',status:'completed',result:{retention_policy_applicability_id:memberId}}});
    });
    await page.goto('/evidencias?tab=aplicabilidad-retencion');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
    const dialog=page.getByRole('dialog');
    await dialog.getByRole('combobox',{name:'Política de retención',exact:true}).selectOption(tenantId);
    await dialog.getByLabel('Versión de aplicabilidad',{exact:true}).fill('1');
    await dialog.getByRole('combobox',{name:'Clasificación',exact:true}).selectOption('internal');
    await dialog.getByLabel('Vigente desde',{exact:true}).fill('2026-09-06T00:30');
    await expect(dialog.getByText('Esta fecha u hora no existe en la zona de la empresa. Selecciona otra.',{exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();expect(posted).toBe(0);
    await dialog.getByLabel('Vigente desde',{exact:true}).fill('2026-04-04T23:30');
    const occurrence=dialog.getByRole('combobox',{name:'Ocurrencia de Vigente desde',exact:true});
    await expect(occurrence).toHaveValue('');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();expect(posted).toBe(0);
    await occurrence.selectOption('2026-04-05T03:30:00Z');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();await expect(dialog).toHaveCount(0);expect(posted).toBe(1);
  });
  test('reads persisted UTC as local and edits through the existing authorized action',async({page})=>{
    await mockRuntime(page,['PRIVACY_MANAGER'],[],['privacy.retention_policy.read','privacy.retention_policy.update'],'America/Santiago');
    const row={retention_policy_applicability_id:memberId,retention_policy_id:tenantId,classification:'internal',row_version:1,lifecycle_state:'draft',initial_source_bind_allowed:true,effective_from:'2026-10-16T15:30:00Z',effective_to:'2026-10-17T15:30:00Z',initial_source_candidates:[{evidence_version_id:roleId,evidence_code:'EV-FUENTE',version_number:1}]};let updated=false;
    await page.route(url=>url.pathname.startsWith('/api/v1/retention-policy-applicabilities'),async route=>{
      if(route.request().method()==='POST'){
        expect(new URL(route.request().url()).pathname).toBe(`/api/v1/retention-policy-applicabilities/${memberId}:bind-initial-source`);
        expect(route.request().postDataJSON()).toEqual({source_evidence_version_id:roleId,source_clause_ref:'Cláusula 3',effective_from:'2026-10-16T16:45:00Z',effective_to:'2026-10-17T15:30:00Z'});
        expect(route.request().headers()['if-match']).toBe('"1"');updated=true;await route.fulfill({json:{...row,row_version:2}});return;
      }
      await route.fulfill({json:new URL(route.request().url()).pathname==='/api/v1/retention-policy-applicabilities'?{items:[row],page:{has_more:false,next_cursor:null}}:row});
    });
    await page.goto('/evidencias?tab=aplicabilidad-retencion');await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
    const dialog=page.getByRole('dialog');
    await expect(dialog.getByLabel('Vigente desde',{exact:true})).toHaveValue('2026-10-16T12:30');
    await expect(dialog.getByLabel('Vigente hasta',{exact:true})).toHaveValue('2026-10-17T12:30');
    await expect(dialog.locator('dd').filter({hasText:'12:30:00'}).first()).toContainText('America/Santiago');
    await dialog.getByLabel('Fuente inicial aprobada',{exact:true}).selectOption(roleId);
    await dialog.getByLabel('Cláusula o disposición aplicable',{exact:true}).fill('Cláusula 3');
    await dialog.getByLabel('Vigente desde',{exact:true}).fill('2026-10-16T13:45');
    await dialog.getByRole('button',{name:'Vincular fuente inicial',exact:true}).click();await expect.poll(()=>updated).toBe(true);
  });
});

test.describe('STEP6A3 evidence findings',()=>{
  test('evidence provenance rejection stays a creation error and retries without another upload',async({page})=>{
    await mockRuntime(page,['EVIDENCE_OWNER','PRIVACY_MANAGER'],[],['evidence.evidence.read','evidence.evidence.create','evidence.document.create','privacy.retention_policy_reference.read','privacy.retention_policy.read','organization.subject.read']);
    await page.route(url=>url.pathname==='/api/v1/subjects',route=>route.fulfill({json:{items:[{tenant_id:tenantId,subject_id:memberId,subject_type:'organization',display_name:'TecDex',lifecycle_state:'active'}],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>url.pathname==='/api/v1/retention-policy-references',route=>route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_id:tenantId,policy_code:'QA_RET_ORD_001',policy_kind:'tenant_policy',version_number:1,lifecycle_state:'published',selectable:true}],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',route=>route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_applicability_id:roleId,retention_policy_id:tenantId,classification:'internal',purpose:'evidence_document',scope_subject_id:null,processing_activity_id:null,version_number:1,lifecycle_state:'published',effective_from:'2020-01-01T00:00:00Z',effective_to:'2100-01-01T00:00:00Z'}],page:{has_more:false,next_cursor:null}}}));
    let uploadBody:Record<string,unknown>|undefined;
    let uploadCount=0; const createdBodies:Record<string,unknown>[]=[];
    await page.route(url=>url.pathname==='/api/v1/evidence' && url.searchParams.size===0,async route=>{
      if(route.request().method()!=='POST'){await route.fallback();return;}
      const body=route.request().postDataJSON() as Record<string,unknown>;createdBodies.push(body);
      if(!body.provenance_ref){await route.fulfill({status:400,json:{code:'TCDX.VALIDATION.FAILED',message:'Validation failed',correlation_id:tenantId,retryable:false,details:{field:'provenance_ref'}}});return;}
      await route.fulfill({status:202,json:{result:{evidence_id:roleId}}});
    });
    await page.route(url=>url.pathname==='/api/v1/files:request-upload',route=>{uploadCount++;uploadBody=route.request().postDataJSON() as Record<string,unknown>;expect(route.request().headers()['x-tcdx-tenant-id']).toBe(tenantId);return route.fulfill({status:202,json:{result:{upload_intent_id:roleId,upload_url:`/api/v1/file-upload-intents/${roleId}/content`}}});});
    await page.route(url=>url.pathname===`/api/v1/file-upload-intents/${roleId}/content`,route=>route.fulfill({status:204,body:''}));
    await page.route(url=>url.pathname===`/api/v1/file-upload-intents/${roleId}:finalize`,route=>route.fulfill({status:202,json:{result:{file_object_id:roleId}}}));
    await page.goto('/evidencias?tab=evidencias');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles({name:'qa-local.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-local-fixture')});
    await dialog.getByRole('combobox',{name:'Clasificación del archivo'}).selectOption('internal');
    await dialog.getByRole('combobox',{name:'Responsable de negocio (opcional)'}).selectOption(memberId);
    await dialog.getByRole('combobox',{name:'Política de retención',exact:true}).selectOption(tenantId);
    await dialog.getByRole('combobox',{name:'Aplicabilidad de retención'}).selectOption(roleId);
    await dialog.getByLabel('Procedencia del archivo').fill('Fixture local de transferencia');
    await dialog.getByLabel('Código de evidencia',{exact:true}).fill('LOCAL-PROVENANCE-RETRY');
    await dialog.getByRole('combobox',{name:'Tipo de evidencia',exact:true}).selectOption('document');
    await dialog.getByRole('combobox',{name:'Origen',exact:true}).selectOption({label:'Archivo aportado'});
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect.poll(()=>uploadBody).toMatchObject({scope_subject_id:memberId,retention_policy_id:tenantId,retention_policy_applicability_id:roleId,classification:'internal'});
    expect(uploadBody).not.toHaveProperty('processing_activity_id');
    await expect(dialog.getByRole('alert')).toContainText('No fue posible crear el registro. Revisa: Referencia de procedencia.');
    await expect(dialog.getByRole('alert')).toContainText(`Correlación: ${tenantId}`);
    await expect(dialog.getByRole('alert')).not.toContainText('No fue posible transferir el archivo.');
    await dialog.getByRole('alert').scrollIntoViewIfNeeded();
    await dialog.screenshot({path:'docs/phase6a/STEP_6A3/evidence/evidence-persistence-20261019/creation-provenance-error.png'});
    expect(createdBodies[0]).not.toHaveProperty('provenance_ref');
    await dialog.getByLabel('Referencia de procedencia',{exact:true}).fill('Referencia documental aportada');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect(dialog).toHaveCount(0);
    expect(createdBodies[1]).toMatchObject({file_object_id:roleId,provenance_ref:'Referencia documental aportada'});
    expect(uploadCount).toBe(1);

  });
  test('evidence link control picker excludes global references from tenant targets',async({page},info)=>{
    await mockRuntime(page,['EVIDENCE_OWNER'],[],['evidence.evidence.read','evidence.evidence.create','controls.control.read','privacy.retention_policy_reference.read']);
    await page.route(url=>url.pathname==='/api/v1/controls',route=>route.fulfill({json:{items:[
      {control_id:memberId,tenant_id:null,ownership_class:'PLATFORM_CONTROL',control_code:'EVIDENCE-001',name:'Protección de evidencias y registros',lifecycle_state:'draft'},
      {control_id:roleId,tenant_id:tenantId,ownership_class:'TENANT_OWNED',control_code:'TENANT-CONTROL',name:'Control del tenant',lifecycle_state:'active'}
    ],page:{has_more:false,next_cursor:null}}}));
    let creationCalls=0;
    await page.route(url=>url.pathname==='/api/v1/evidence' && url.searchParams.size===0,async route=>{if(route.request().method()==='POST')creationCalls++;await route.fallback();});
    await page.goto('/evidencias?tab=evidencias');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
    await dialog.getByRole('button',{name:'Agregar elemento',exact:true}).click();
    await dialog.getByLabel('Tipo de objeto',{exact:false}).selectOption('control_id');
    const control=dialog.getByRole('combobox',{name:'ID de control',exact:true});
    await expect(control.locator(`option[value="${roleId}"]`)).toHaveCount(1);
    await expect(control.locator(`option[value="${memberId}"]`)).toHaveCount(0);
    await control.selectOption(roleId);await expect(control).toHaveValue(roleId);
    await control.scrollIntoViewIfNeeded();await dialog.screenshot({path:`${evidenceDirectory}/control-target-${info.project.name}.png`});
    expect(creationCalls).toBe(0);
  });
  test('evidence dates use tenant instants and preserve finalized file on date rejection',async({page})=>{
    await mockRuntime(page,['EVIDENCE_OWNER','PRIVACY_MANAGER'],[],['evidence.evidence.read','evidence.evidence.create','evidence.document.create','privacy.retention_policy_reference.read','privacy.retention_policy.read','organization.subject.read'],'America/Santiago');
    await page.route(url=>url.pathname==='/api/v1/subjects',route=>route.fulfill({json:{items:[{tenant_id:tenantId,subject_id:memberId,subject_type:'organization',display_name:'TecDex',lifecycle_state:'active'}],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>url.pathname==='/api/v1/retention-policy-references',route=>route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_id:tenantId,policy_code:'QA_RET_ORD_001',policy_kind:'tenant_policy',version_number:1,lifecycle_state:'published',selectable:true}],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',route=>route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_applicability_id:roleId,retention_policy_id:tenantId,classification:'internal',purpose:'evidence_document',scope_subject_id:null,processing_activity_id:null,version_number:1,lifecycle_state:'published',effective_from:'2020-01-01T00:00:00Z',effective_to:'2100-01-01T00:00:00Z'}],page:{has_more:false,next_cursor:null}}}));
    let uploadBody:Record<string,unknown>|undefined;
    let uploadCount=0; const createdBodies:Record<string,unknown>[]=[];
    await page.route(url=>url.pathname==='/api/v1/evidence' && url.searchParams.size===0,async route=>{
      if(route.request().method()!=='POST'){await route.fallback();return;}
      const body=route.request().postDataJSON() as Record<string,unknown>;createdBodies.push(body);
      if(createdBodies.length===1){await route.fulfill({status:400,json:{code:'TCDX.VALIDATION.FAILED',message:'Validation failed',correlation_id:tenantId,retryable:false,details:{field:'valid_from'}}});return;}
      await route.fulfill({status:202,json:{result:{evidence_id:roleId}}});
    });
    await page.route(url=>url.pathname==='/api/v1/files:request-upload',route=>{uploadCount++;uploadBody=route.request().postDataJSON() as Record<string,unknown>;expect(route.request().headers()['x-tcdx-tenant-id']).toBe(tenantId);return route.fulfill({status:202,json:{result:{upload_intent_id:roleId,upload_url:`/api/v1/file-upload-intents/${roleId}/content`}}});});
    await page.route(url=>url.pathname===`/api/v1/file-upload-intents/${roleId}/content`,route=>route.fulfill({status:204,body:''}));
    await page.route(url=>url.pathname===`/api/v1/file-upload-intents/${roleId}:finalize`,route=>route.fulfill({status:202,json:{result:{file_object_id:roleId}}}));
    await page.goto('/evidencias?tab=evidencias');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles({name:'qa-local.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-local-fixture')});
    await dialog.getByRole('combobox',{name:'Clasificación del archivo'}).selectOption('internal');
    await dialog.getByRole('combobox',{name:'Responsable de negocio (opcional)'}).selectOption(memberId);
    await dialog.getByRole('combobox',{name:'Política de retención',exact:true}).selectOption(tenantId);
    await dialog.getByRole('combobox',{name:'Aplicabilidad de retención'}).selectOption(roleId);
    await dialog.getByLabel('Procedencia del archivo').fill('Fixture local de transferencia');
    await dialog.getByLabel('Código de evidencia',{exact:true}).fill('LOCAL-PROVENANCE-RETRY');
    await dialog.getByRole('combobox',{name:'Tipo de evidencia',exact:true}).selectOption('document');
    await dialog.getByRole('combobox',{name:'Origen',exact:true}).selectOption({label:'Archivo aportado'});
    await dialog.getByLabel('Referencia de procedencia',{exact:true}).fill('Referencia documental aportada');
    const from=dialog.getByLabel('Válida desde',{exact:true});
    await expect(from).toHaveAttribute('type','datetime-local');
    await expect(dialog.getByLabel('Válida hasta',{exact:true})).toHaveValue('');
    await from.fill('2026-09-06T00:30');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect(dialog.locator('.inline-feedback[role=alert]')).toContainText('Revisa Válida desde');
    expect(uploadCount).toBe(0);expect(createdBodies).toHaveLength(0);
    await from.fill('2026-04-04T23:30');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect(dialog.locator('.inline-feedback[role=alert]')).toContainText('sin ambigüedad');
    await dialog.getByRole('combobox',{name:'Ocurrencia de Válida desde'}).selectOption('2026-04-05T03:30:00Z');
    await expect(from).toHaveValue('2026-04-04T23:30');
    await from.fill('2026-10-19T12:30');
    await dialog.getByLabel('Válida hasta',{exact:true}).fill('2026-10-19T12:29');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect(dialog.locator('.inline-feedback[role=alert]')).toContainText('Válida hasta debe ser posterior');
    expect(uploadCount).toBe(0);
    await dialog.getByLabel('Válida hasta',{exact:true}).fill('');
    await dialog.getByLabel('Inicio del período',{exact:true}).fill('2026-07-19T12:30');
    await dialog.getByLabel('Fin del período',{exact:true}).fill('2026-07-20T12:30');
    await dialog.getByLabel('Vigente desde',{exact:true}).fill('2026-10-19T12:30');
    await dialog.getByLabel('Vigente hasta',{exact:true}).fill('2026-10-20T12:30');
    await dialog.getByLabel('Vence el',{exact:true}).fill('2026-10-21T12:30');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect.poll(()=>uploadBody).toMatchObject({scope_subject_id:memberId,retention_policy_id:tenantId,retention_policy_applicability_id:roleId,classification:'internal'});
    expect(uploadBody).not.toHaveProperty('processing_activity_id');
    await expect(dialog.locator('.inline-feedback[role=alert]')).toContainText('No fue posible crear el registro. Revisa: Válida desde.');
    await expect(dialog.locator('.inline-feedback[role=alert]')).toContainText(`Correlación: ${tenantId}`);
    await expect(dialog.locator('.inline-feedback[role=alert]')).not.toContainText('No fue posible transferir el archivo.');
    await dialog.locator('.inline-feedback[role=alert]').scrollIntoViewIfNeeded();
    await dialog.screenshot({path:`${evidenceDirectory}/evidence-dates-${test.info().project.name}.png`});
    expect(createdBodies[0]).toMatchObject({valid_from:'2026-10-19T15:30:00Z',period_start:'2026-07-19T16:30:00Z',period_end:'2026-07-20T16:30:00Z',effective_from:'2026-10-19T15:30:00Z',effective_to:'2026-10-20T15:30:00Z',expires_at:'2026-10-21T15:30:00Z'});
    expect(createdBodies[0]).not.toHaveProperty('valid_to');
    await from.fill('2026-10-20T11:45');
    await expect(from).toHaveValue('2026-10-20T11:45');
    await dialog.getByLabel('Referencia de procedencia',{exact:true}).fill('Referencia documental aportada');
    await dialog.getByRole('button',{name:'Crear registro',exact:true}).click();
    await expect(dialog).toHaveCount(0);
    expect(createdBodies[1]).toMatchObject({file_object_id:roleId,provenance_ref:'Referencia documental aportada',valid_from:'2026-10-20T14:45:00Z'});
    expect(uploadCount).toBe(1);

  });
  test('evidence owner sees the exact permission denial while the eligible policy stays visible',async({page})=>{
    await mockRuntime(page,['EVIDENCE_OWNER'],[],['evidence.evidence.read','evidence.evidence.create','evidence.document.create','privacy.retention_policy_reference.read']);
    await page.route(url=>url.pathname==='/api/v1/retention-policy-references',route=>route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_id:tenantId,policy_code:'QA_RET_ORD_001',policy_kind:'tenant_policy',version_number:1,lifecycle_state:'published',selectable:true}],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>['/api/v1/subjects','/api/v1/retention-policy-applicabilities'].includes(url.pathname),route=>route.fulfill({status:403,json:{code:'TCDX.AUTHORIZATION.DENIED',message:'Access denied',correlation_id:tenantId,retryable:false}}));
    await page.goto('/evidencias?tab=evidencias');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();
    const dialog=page.getByRole('dialog');await dialog.getByRole('combobox',{name:'Clasificación del archivo'}).selectOption('internal');
    await dialog.getByRole('combobox',{name:'Política de retención',exact:true}).selectOption(tenantId);
    await expect(dialog.getByText('No tienes acceso a estas opciones en la empresa seleccionada.',{exact:true})).toHaveCount(2);
    await expect(dialog.getByRole('combobox',{name:'Aplicabilidad de retención'}).locator('option')).toHaveCount(1);
    await expect(dialog.getByRole('combobox',{name:'Política de retención',exact:true}).locator('option')).toHaveCount(2);
  });
  test('changing evidence policy invalidates old applicability and loads only effective matching options',async({page})=>{
    await mockRuntime(page,['EVIDENCE_OWNER','PRIVACY_MANAGER'],[],['evidence.evidence.read','evidence.evidence.create','evidence.document.create','privacy.retention_policy_reference.read','privacy.retention_policy.read','organization.subject.read']);
    await page.route(url=>url.pathname==='/api/v1/retention-policy-references',route=>route.fulfill({json:{items:[
      {tenant_id:tenantId,retention_policy_id:tenantId,policy_code:'QA_RET_ORD_001',policy_kind:'tenant_policy',version_number:1,lifecycle_state:'published',selectable:true},
      {tenant_id:tenantId,retention_policy_id:roleId,policy_code:'RET-SECOND',policy_kind:'tenant_policy',version_number:2,lifecycle_state:'published',selectable:true}
    ],page:{has_more:false,next_cursor:null}}}));
    await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',route=>{
      const policy=new URL(route.request().url()).searchParams.get('filter[retention_policy_id]');
      return route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_applicability_id:policy===tenantId?memberId:tenantId,retention_policy_id:policy,classification:'internal',purpose:'evidence_document',version_number:1,lifecycle_state:'published',effective_from:'2020-01-01T00:00:00Z',effective_to:'2100-01-01T00:00:00Z'}],page:{has_more:false,next_cursor:null}}});
    });
    await page.goto('/evidencias?tab=evidencias');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
    await dialog.getByRole('combobox',{name:'Clasificación del archivo'}).selectOption('internal');
    const policy=dialog.getByRole('combobox',{name:'Política de retención',exact:true});const applicability=dialog.getByRole('combobox',{name:'Aplicabilidad de retención'});
    await policy.selectOption(tenantId);await expect(applicability.locator(`option[value="${memberId}"]`)).toHaveCount(1);await applicability.selectOption(memberId);
    await policy.selectOption(roleId);await expect(applicability).toHaveValue('');await expect(applicability.locator(`option[value="${memberId}"]`)).toHaveCount(0);
    await expect(applicability.locator(`option[value="${tenantId}"]`)).toHaveCount(1);
  });
  test('privacy manager cannot open evidence creation or trigger its protected auxiliary reads',async({page})=>{
    await mockRuntime(page,['PRIVACY_MANAGER'],[],['evidence.evidence.read','privacy.retention_policy.read','privacy.retention_policy_reference.read','organization.subject.read']);
    let discoveries=0;
    await page.route(url=>url.pathname==='/api/v1/retention-policy-references'||url.pathname==='/api/v1/subjects',route=>{discoveries++;return route.fulfill({status:403,json:{code:'TCDX.AUTHORIZATION.DENIED'}});});
    await page.goto('/evidencias?tab=evidencias');
    await expect(page.getByRole('tab',{name:'Evidencias',exact:true})).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('button',{name:'Nuevo registro',exact:true})).toHaveCount(0);
    await expect(page.getByText('La creación de evidencias requiere el permiso',{exact:false})).toBeVisible();expect(discoveries).toBe(0);
  });
  test('existing evidence creator gets only published tenant policy and applicability choices',async({page},info)=>{
    await mockRuntime(page,['EVIDENCE_OWNER','LEGAL_REVIEWER','CONTROL_OWNER'],[],['evidence.evidence.read','evidence.evidence.create','evidence.document.create','privacy.retention_policy_reference.read','privacy.retention_policy.read','organization.subject.read']);
    await page.route(url=>url.pathname==='/api/v1/retention-policy-references',async route=>{
      const u=new URL(route.request().url());expect(['evidence','upload']).toContain(u.searchParams.get('purpose'));expect(route.request().headers()['x-tcdx-tenant-id']).toBe(tenantId);
      await route.fulfill({json:{items:[{retention_policy_id:tenantId,tenant_id:tenantId,policy_kind:'tenant_policy',policy_code:'QA_RET_ORD_001',version_number:1,lifecycle_state:'published',selectable:true},{retention_policy_id:roleId,policy_code:'INELIGIBLE',version_number:1,lifecycle_state:'published',selectable:false}],page:{has_more:false,next_cursor:null}}});
    });
    await page.route(url=>url.pathname==='/api/v1/retention-policy-applicabilities',async route=>{
      const u=new URL(route.request().url());expect(u.searchParams.get('filter[lifecycle_state]')).toBe('published');expect(u.searchParams.get('filter[retention_policy_id]')).toBe(tenantId);expect(route.request().headers()['x-tcdx-tenant-id']).toBe(tenantId);
      await route.fulfill({json:{items:[{tenant_id:tenantId,retention_policy_applicability_id:memberId,retention_policy_id:tenantId,version_number:1,classification:'confidential',purpose:'evidence_document',lifecycle_state:'published',effective_from:'2020-01-01T00:00:00Z',effective_to:'2100-01-01T00:00:00Z'}],page:{has_more:false,next_cursor:null}}});
    });
    await page.goto('/evidencias?tab=evidencias');await page.getByRole('button',{name:'Nuevo registro',exact:true}).click();const dialog=page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles({name:'local-qa-evidence.txt',mimeType:'text/plain',buffer:Buffer.from('Focused local UI fixture')});
    await dialog.getByRole('combobox',{name:'Clasificación del archivo'}).selectOption('confidential');
    const policy=dialog.getByRole('combobox',{name:'Política de retención',exact:true});
    await expect(policy.locator('option')).toHaveText(['Selecciona una opción','Política de la organización · QA_RET_ORD_001 · v1 · Publicada']);
    await policy.selectOption(tenantId);
    const applicability=dialog.getByRole('combobox',{name:'Aplicabilidad de retención',exact:true});
    await expect(applicability.locator('option')).toHaveText(['Selecciona una opción','Confidencial · v1 · Publicada']);await applicability.selectOption(memberId);
    await dialog.screenshot({path:`.continuity-preservation/step6a3-20261016/qa-evidence-policy-${info.project.name}.png`});
    await expect(dialog.getByText('No tienes acceso a estas opciones en la empresa seleccionada.',{exact:true})).toHaveCount(0);
  });
  test('policy list and detail use readable identity and domain version',async({page})=>{
    await mockRuntime(page,['PRIVACY_MANAGER'],[],['privacy.retention_policy.read']);
    const row={tenant_id:tenantId,retention_policy_id:tenantId,policy_kind:'tenant_policy',policy_code:'QA_RET_ORD_001',version_number:1,row_version:8,lifecycle_state:'published'};
    await page.route(url=>url.pathname.startsWith('/api/v1/retention-policies'),route=>route.fulfill({json:new URL(route.request().url()).pathname==='/api/v1/retention-policies'?{items:[row],page:{has_more:false,next_cursor:null}}:row}));
    await page.goto('/evidencias?tab=retencion');
    await expect(page.getByRole('cell',{name:'Política de la organización · QA_RET_ORD_001 · v1',exact:true})).toBeVisible();
    await expect(page.getByRole('cell',{name:'1',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();const dialog=page.getByRole('dialog');
    await expect(dialog.getByRole('heading',{name:'Política de la organización · QA_RET_ORD_001 · v1',exact:true})).toBeVisible();
    await expect(dialog.getByText('ID de política de retención',{exact:true}).locator('xpath=following-sibling::dd[1]')).toHaveText('Política de la organización · QA_RET_ORD_001 · v1');
  });
  test('applicability detail resolves its authorized policy instead of a generic reference',async({page})=>{
    await mockRuntime(page,['PRIVACY_MANAGER'],[],['privacy.retention_policy.read']);
    const row={retention_policy_applicability_id:memberId,retention_policy_id:tenantId,classification:'confidential',version_number:1,row_version:4,lifecycle_state:'published'};
    await page.route(url=>url.pathname.startsWith('/api/v1/retention-policy-applicabilities'),route=>route.fulfill({json:new URL(route.request().url()).pathname==='/api/v1/retention-policy-applicabilities'?{items:[row],page:{has_more:false,next_cursor:null}}:row}));
    await page.route(url=>url.pathname===`/api/v1/retention-policies/${tenantId}`,route=>route.fulfill({json:{tenant_id:tenantId,retention_policy_id:tenantId,policy_code:'QA_RET_ORD_001',policy_kind:'tenant_policy',version_number:1,lifecycle_state:'published'}}));
    await page.goto('/evidencias?tab=aplicabilidad-retencion');await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();
    const dialog=page.getByRole('dialog');await expect(dialog.getByText('Política de la organización · QA_RET_ORD_001 · v1 · Publicada',{exact:true})).toBeVisible();
    await expect(dialog.getByText('Referencia vinculada',{exact:true})).toHaveCount(0);
  });
});
