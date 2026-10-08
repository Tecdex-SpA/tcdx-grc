import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

// Isolated browser/API fixtures only. No real identity or runtime credential is used.
test.use({ trace: "off", screenshot: "off" });

async function healthyLogo(page: Page): Promise<void> {
  const logo = page.getByRole("img", { name: "Tecdex", exact: true });
  await expect(logo).toHaveCount(1);
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const response = await page.request.get((await logo.getAttribute("src"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/svg+xml");
  const canonical = await readFile("docs/ui/assets/brand/tecdex-logo-light.svg");
  const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
  expect(hash(await response.body())).toBe(hash(canonical));
  expect(await page.locator("img").evaluateAll((images) => images.some((image) => !image.complete || image.naturalWidth === 0))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
}

test("login branding loads the packaged canonical logo after deep navigation and reload", async ({ page }, info) => {
  await page.route("**/api/v1/auth/providers", (route) => route.fulfill({ json: { providers: [
    { provider: "ZOHO", available: false }, { provider: "MICROSOFT_ENTRA_ID", available: false },
    { provider: "GOOGLE_WORKSPACE", available: false }, { provider: "TCDX_MANAGED_IDENTITY", available: true }
  ] } }));
  await page.goto("/configuraciones/identidades-gestionadas");
  await expect(page).toHaveTitle("Tecdex GRC");
  await expect(page.getByRole("heading", { name: "Tecdex GRC", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tecdex Managed Identity.*Disponible/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Zoho.*No disponible/ })).toBeDisabled();
  await expect(page.locator("body")).not.toContainText(/TCDX GRC|TCDX Managed Identity/);
  await healthyLogo(page);
  await page.reload();
  await healthyLogo(page);
  const method = page.getByRole("button", { name: /Tecdex Managed Identity.*Disponible/ });
  await method.focus();
  await expect(method).toBeFocused();
  expect(await method.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.screenshot({ path: `/tmp/tcdx-grc-mi10-p2d-branding-${info.project.name}-login.png`, fullPage: true });
});

test("dashboard branding uses the same logo with responsive navigation", async ({ page }, info) => {
  await page.addInitScript(() => sessionStorage.setItem("tcdx.access_token", "p2d-local-browser-fixture"));
  await page.route("**/api/v1/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/access/me")) return route.fulfill({ json: {
      available_tenant_contexts: [], effective_platform_role_codes: ["PLATFORM_ADMIN"]
    } });
    if (pathname.endsWith("/auth/me/authorization")) return route.fulfill({ json: {
      evaluated_at: new Date().toISOString(), platform_permissions: ["platform.managed_identity.read"], tenant_permissions: null
    } });
    return route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
  });
  await page.goto("/dashboard");
  await expect(page.locator(".sidebar-footer strong")).toHaveText("Tecdex GRC");
  await healthyLogo(page);
  const menu = page.getByRole("button", { name: "Abrir navegación" });
  if (await menu.isVisible()) {
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".sidebar")).toHaveClass(/open/);
  }
  await expect(page.locator(".brand img")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/TCDX GRC|TCDX Managed Identity/);
  await page.screenshot({ path: `/tmp/tcdx-grc-mi10-p2d-branding-${info.project.name}-dashboard.png`, fullPage: true });
  await page.reload();
  await healthyLogo(page);
});
