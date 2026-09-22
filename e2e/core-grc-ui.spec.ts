import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
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
  "/issues": [{ issue_id: tenantId, row_version: 3, issue_code: "ISS-NN-001", title: "Brecha de evidencia", lifecycle_state: "remediation_in_progress" }],
  "/actions": [{ action_id: tenantId, row_version: 4, action_code: "ACT-NN-001", title: "Actualizar evidencia", lifecycle_state: "in_review" }]
};

const permissions = [
  "compliance.applicability.read", "compliance.requirement_assessment.read", "compliance.soa.read", "controls.control.read",
  "controls.control_assessment.read", "controls.assurance_test.read", "evidence.evidence_request.read", "evidence.evidence.read",
  "remediation.issue.read", "remediation.action.read", "compliance.soa.publish", "controls.control_assessment.approve",
  "controls.assurance_test.review", "remediation.issue.transition", "remediation.action.transition"
];

async function mockRuntime(page: Page): Promise<void> {
  await page.addInitScript(([tenant]) => { sessionStorage.setItem("tcdx.access_token", "contractual-test-token"); sessionStorage.setItem("tcdx.tenant_id", tenant); }, [tenantId]);
  await page.route("**/api/v1/**", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/access/me")) {
      await route.fulfill({ json: { tenant_id: tenantId, membership_id: tenantId, tenant_name: "Tenant no normativo", user_name: "Revisor Fase 5", permissions, scopes: ["tenant"], capability_groups: ["ISO_COMPLIANCE", "CONTROLS_ASSURANCE", "EVIDENCE_DOCUMENTS", "ISSUES_ACTIONS"], roles: ["GRC Manager"] } });
      return;
    }
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 202, json: { operation_id: "fixtureOperation", status: "completed", correlation_id: tenantId, resource_id: tenantId, result: {} } });
      return;
    }
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

const baselineDirectory = "docs/ui/baselines/phase5-v1.1";

test.beforeAll(async () => { await mkdir(baselineDirectory, { recursive: true }); });

test("dashboard visual contract, drill-down and accessibility", async ({ page }, testInfo) => {
  await mockRuntime(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
  await expect(page.locator(".kpi-card")).toHaveCount(4);
  await expect(page.getByText("Registros visibles del tenant")).toBeVisible();
  if (!testInfo.project.name.includes("narrow")) await expect(page.getByText("Responsable GRC")).toBeVisible();
  await page.screenshot({ path: `${baselineDirectory}/dashboard-${testInfo.project.name}.png`, fullPage: true });
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
  ["acciones", "Hallazgos y brechas", "hallazgos", false],
  ["acciones", "Acciones", "acciones", true]
] as const) {
  test(`${heading} mantiene la baseline comercial en español`, async ({ page }, testInfo) => {
    await mockRuntime(page);
    await page.goto(`/${routeName}`);
    await page.getByRole("tab", { name: heading, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/in_progress|in_review|under_review|remediation_in_progress|pending_verification/);
    if (openDetail) {
      await page.getByRole("button", { name: "Ver detalle" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").locator(".spinner")).toHaveCount(0);
    }
    await page.screenshot({ path: `${baselineDirectory}/${screenshot}-${testInfo.project.name}.png`, fullPage: true });
  });
}
