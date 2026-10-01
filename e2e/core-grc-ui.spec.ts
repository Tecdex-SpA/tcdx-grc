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
  "/issues": [{ issue_id: tenantId, row_version: 3, issue_code: "ISS-NN-001", title: "Brecha de evidencia", lifecycle_state: "remediation_in_progress" }],
  "/actions": [{ action_id: tenantId, row_version: 4, action_code: "ACT-NN-001", title: "Actualizar evidencia", lifecycle_state: "in_review" }]
};

async function mockRuntime(page: Page, roles: string[] = ["GRC_MANAGER"], platformRoles: string[] = []): Promise<void> {
  await page.addInitScript(() => { sessionStorage.setItem("tcdx.access_token", "contractual-test-token"); });
  await page.route("**/api/v1/**", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/access/me")) {
      expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
      await route.fulfill({ json: { available_tenant_contexts: [{ tenant_id: tenantId, tenant_display_name: "Tenant no normativo", tenant_membership_id: tenantId, membership_state: "active", effective_role_codes: roles }], effective_platform_role_codes: platformRoles } });
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
      const person = { tenant_membership_id: memberId, tenant_id: tenantId, user_identity_id: memberId, membership_state: "active", joined_at: "2026-09-25T12:00:00Z", ended_at: null, user_identity: { display_name: "Mario de prueba", email_normalized: "mario@example.test", lifecycle_state: "active", last_authenticated_at: null }, roles: [] };
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
  await expect(page.getByLabel("Responsable de negocio")).toBeVisible();
  await expect(page.getByLabel("ID del responsable de negocio")).toHaveCount(0);
  await expect(page.getByRole("option", { name: /Operaciones.*process.*operaciones/ })).toBeAttached();
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
  await expect(decision.locator('option[value="not_applicable"]')).toHaveText("No aplica");
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

test("QA validation content displays its condition and keeps filters tenant-scoped", async ({ page }, testInfo) => {
  await mockRuntime(page, ["TENANT_ADMIN", "CONTROL_OWNER"]);
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
  await expect(page.getByLabel("Filtrar por aplicabilidad")).toBeVisible();
  await expect(page.getByLabel("Filtrar por implementación")).toBeVisible();
  await page.screenshot({ path: `${evidenceDirectory}/validation-catalog-${testInfo.project.name}.png`, fullPage: true });
});

test("login surface exposes the governed OIDC entry point", async ({ page }, testInfo) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Autenticación requerida" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ingresar con Zoho" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Invitaciones de membresía" })).toHaveCount(0);
  if (testInfo.project.name.includes("narrow")) {
    await page.getByRole("button", { name: "Abrir navegación" }).click();
  }
  await page.getByRole("button", { name: "Usuarios" }).click();
  await expect(page.getByRole("heading", { name: "Invitaciones de membresía" })).toBeVisible();
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
  await expect(page.locator(".user-role-summary")).toContainText("Administrador de Platform · Administrador del tenant · Responsable de evidencia · Responsable de control");
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
  await expect(page.getByText("Registros visibles del tenant")).toBeVisible();
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
    await mockRuntime(page);
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
