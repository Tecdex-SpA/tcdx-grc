import { expect, test } from "@playwright/test";
import { buildApp } from "../apps/backend/src/app.js";
import { createDatabase, sql } from "../apps/backend/src/database.js";
import { loadConfig } from "../apps/backend/src/config.js";
import { UnavailableFileStoragePort } from "../apps/backend/src/ports/file-storage.js";
import { commercialSubscriptionFixture } from "../apps/backend/src/security/commercial-subscription-fixture.js";
import { newUuidV7 } from "../apps/backend/src/uuid.js";

test.describe("Commercial UI with real signed JWT, backend and PostgreSQL", () => {
  let db: ReturnType<typeof createDatabase>, fixture: Awaited<ReturnType<typeof commercialSubscriptionFixture>>, app: ReturnType<typeof buildApp>;
  test.beforeAll(async () => {
    db = createDatabase(loadConfig(process.env)); fixture = await commercialSubscriptionFixture(db);
    app = buildApp(async () => true, { database: db, identityVerifier: fixture.tokens, referenceCursor: fixture.tokens,
      fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: "test" }, undefined, "http://127.0.0.1:4174");
    await app.listen({ host: "127.0.0.1", port: 55435 });
  });
  test.afterAll(async () => { await app?.close(); await db?.destroy(); });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(token => sessionStorage.setItem("tcdx.access_token", token), fixture.adminToken.token);
  });
  test("changes an existing plan once and displays its persisted successor", async ({ page }, info) => {
    const company = await fixture.company(), target = await fixture.plan(), code = `BROWSER-${newUuidV7()}`;
    await page.goto("/configuraciones/empresas");
    const row = page.getByRole("row").filter({ hasText: `Isolated company ${company.tenantId}` });
    await row.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("heading", { name: "Cambiar plan", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Asignar plan", exact: true })).toHaveCount(0);
    await page.getByLabel("Versión de plan publicada").selectOption(target);
    await page.getByLabel("Código de suscripción", { exact: true }).fill(code);
    await page.getByLabel("Motivo del cambio").fill("Real browser plan change");
    const button = page.getByRole("button", { name: "Cambiar plan", exact: true });
    await expect(button).toBeDisabled();
    await page.getByLabel("Confirmo el cambio de plan de esta empresa.").check();
    const response = page.waitForResponse(r => r.url().endsWith(`${company.subscriptionId}:change-plan`));
    await button.click();
    const changed = await response; expect(changed.status()).toBe(200);
    const body = await changed.json();
    await expect(page.getByRole("dialog")).toContainText(`Código de suscripción: ${code}`);
    await expect(row).toContainText(`Isolated GRC ${target}`);
    const persisted = (await sql<{ plan_version_id: string; previous_subscription_id: string }>`SELECT plan_version_id,previous_subscription_id
      FROM platform.subscriptions WHERE subscription_id=${body.resource_id}::uuid AND tenant_id=${company.tenantId}::uuid`.execute(db)).rows[0];
    expect(persisted).toEqual({ plan_version_id: target, previous_subscription_id: company.subscriptionId });
    await expect(page.getByRole("dialog").getByText(`Plan actual: Isolated GRC ${target}`, { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.getByRole("dialog").screenshot({ path: `/tmp/change-plan-real-${info.project.name}.png` });
  });
  test("displays a real quota error and leaves the persisted plan unchanged", async ({ page }) => {
    const company = await fixture.company(true), target = await fixture.plan(0);
    await page.goto("/configuraciones/empresas");
    await page.getByRole("row").filter({ hasText: `Isolated company ${company.tenantId}` }).getByRole("button", { name: "Ver detalle" }).click();
    await page.getByLabel("Versión de plan publicada").selectOption(target);
    await page.getByLabel("Código de suscripción", { exact: true }).fill(`QUOTA-${newUuidV7()}`);
    await page.getByLabel("Motivo del cambio").fill("Quota negative browser case");
    await page.getByLabel("Confirmo el cambio de plan de esta empresa.").check();
    await page.getByRole("button", { name: "Cambiar plan", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "TCDX.LIMIT.USAGE_EXCEEDED" })).toBeVisible();
    expect((await sql`SELECT plan_version_id,lifecycle_state FROM platform.subscriptions WHERE subscription_id=${company.subscriptionId}::uuid`.execute(db)).rows[0])
      .toEqual({ plan_version_id: company.planVersionId, lifecycle_state: "active" });
  });
  test("uses initial-create for a company without a subscription", async ({ page }) => {
    const tenantId = newUuidV7(), target = await fixture.plan();
    await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state,data_classification)
      VALUES (${tenantId}::uuid,${`BROWSER-${tenantId}`},'Isolated company',${`Empty company ${tenantId}`},'UTC','active','confidential')`.execute(db);
    await page.goto("/configuraciones/empresas");
    await page.getByRole("row").filter({ hasText: `Empty company ${tenantId}` }).getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByRole("heading", { name: "Asignar plan", exact: true })).toBeVisible();
    await page.getByLabel("Versión de plan publicada").selectOption(target);
    await page.getByLabel("Código de suscripción", { exact: true }).fill(`INITIAL-${newUuidV7()}`);
    const response = page.waitForResponse(r => r.url().endsWith("/platform/subscriptions") && r.request().method()==="POST");
    await page.getByRole("button", { name: "Asignar plan", exact: true }).click();
    expect((await response).status()).toBe(202);
    await expect(page.getByRole("heading", { name: "Cambiar plan", exact: true })).toBeVisible();
  });
  test("prevents double submission while a real tenant lock holds the transaction", async ({ page }) => {
    const company = await fixture.company(), target = await fixture.plan();
    await page.goto("/configuraciones/empresas");
    await page.getByRole("row").filter({ hasText: `Isolated company ${company.tenantId}` }).getByRole("button", { name: "Ver detalle" }).click();
    await page.getByLabel("Versión de plan publicada").selectOption(target);
    await page.getByLabel("Código de suscripción", { exact: true }).fill(`DOUBLE-${newUuidV7()}`);
    await page.getByLabel("Motivo del cambio").fill("Double submit real lock");
    await page.getByLabel("Confirmo el cambio de plan de esta empresa.").check();
    let release!: () => void, ready!: () => void;
    const released = new Promise<void>(resolve => { release = resolve; }), locked = new Promise<void>(resolve => { ready = resolve; });
    const transaction = db.transaction().execute(async tx => {
      await sql`SELECT tenant_id FROM platform.tenants WHERE tenant_id=${company.tenantId}::uuid FOR UPDATE`.execute(tx);
      ready(); await released;
    });
    await locked;
    let attempts = 0;
    page.on("request", r => { if (r.url().endsWith(`${company.subscriptionId}:change-plan`)) attempts++; });
    const response = page.waitForResponse(r => r.url().endsWith(`${company.subscriptionId}:change-plan`));
    try {
      await page.getByRole("button", { name: "Cambiar plan", exact: true }).click();
      await expect(page.getByRole("button", { name: "Cambiando…", exact: true })).toBeDisabled();
      await page.getByLabel("Motivo del cambio").evaluate(element => element.closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    } finally { release(); await transaction; }
    expect((await response).status()).toBe(200); expect(attempts).toBe(1);
    expect((await sql`SELECT count(*)::int AS count FROM platform.subscriptions WHERE previous_subscription_id=${company.subscriptionId}::uuid`.execute(db)).rows[0]).toEqual({ count: 1 });
  });
});
