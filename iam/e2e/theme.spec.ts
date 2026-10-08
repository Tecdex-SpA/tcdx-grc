import { expect, test } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";

const authorization = "/realms/tcdx-mi7-local/protocol/openid-connect/auth?client_id=tcdx-mi7-local-browser&redirect_uri=http%3A%2F%2F127.0.0.1%3A4899%2Fcallback&response_type=code&scope=openid&kc_locale=es";

test("real IAM login keeps credentials on the IAM form, brand, labels, focus and viewport", async ({ page }, info) => {
  const response = await page.goto(authorization);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Tecdex GRC");
  await expect(page.locator("#kc-header-wrapper")).toHaveText("Tecdex GRC");
  await expect(page.getByRole("heading", { name: "Ingresar a Tecdex GRC" })).toBeVisible();
  await expect(page.getByText("Tecdex Managed Identity", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  const username = page.getByLabel("Usuario o email", { exact: true });
  const password = page.getByLabel("Contraseña", { exact: true });
  await expect(username).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute("type", "password");
  const presentation = await page.evaluate(() => {
    const header = getComputedStyle(document.querySelector("#kc-header-wrapper")!);
    const focus = getComputedStyle(document.activeElement!);
    const form = document.querySelector<HTMLFormElement>("#kc-form-login")!;
    return { color: header.color, focus: focus.outlineStyle, action: new URL(form.action).origin,
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(presentation).toEqual({ color: "rgb(0, 19, 59)", focus: "solid", action: "http://127.0.0.1:4898", overflow: false });
  const favicon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(favicon).toMatch(/tecdex-logo-light\.svg$/);
  await page.screenshot({ path: `/private/tmp/tcdx-mi7-theme-${info.project.name}-login.png`, fullPage: true });
});

test("invalid credentials remain associated with the IAM form and carry no provider product brand", async ({ page }) => {
  await page.goto(authorization);
  await page.getByLabel("Usuario o email", { exact: true }).fill("mi7-synthetic-nonexistent-user");
  await page.getByLabel("Contraseña", { exact: true }).fill("INVALID_SYNTHETIC_INPUT");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByText("El usuario o la contraseña no son válidos.", { exact: true })).toBeVisible();
  await expect(page.locator("#username")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  expect(await page.locator("#username").getAttribute("aria-describedby")).toBeTruthy();
});

test("authentication error uses the same branded layout", async ({ page }, info) => {
  await page.goto(authorization.replace("client_id=tcdx-mi7-local-browser", "client_id=mi7-synthetic-unknown-client"));
  await expect(page).toHaveTitle("Tecdex GRC");
  await expect(page.getByRole("heading", { name: "No fue posible completar la autenticación" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `/private/tmp/tcdx-mi7-theme-${info.project.name}-error.png`, fullPage: true });
});

test("lost authentication session keeps the branded error and recovery guidance", async ({ page, context }) => {
  await page.goto(authorization);
  await page.getByLabel("Usuario o email", { exact: true }).fill("mi7-synthetic-nonexistent-user");
  await page.getByLabel("Contraseña", { exact: true }).fill("INVALID_SYNTHETIC_INPUT");
  await context.clearCookies();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveTitle("Tecdex GRC");
  await expect(page.locator("#kc-error-message")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  await expect(page.locator(".tcdx-recovery-guidance")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

function totp(secret: string): string {
  // Native Keycloak hidden field contains the raw synthetic secret; QR/manual display encodes it.
  const key = Buffer.from(secret, "utf8");
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

test("password update, TOTP setup and OTP challenge retain IAM forms and accessible branding", async ({ page, context }, info) => {
  const initialPassword = process.env.TCDX_MI7_SYNTHETIC_PASSWORD;
  if (!initialPassword) throw new Error("LOCAL_SYNTHETIC_FIXTURE_REQUIRED");
  const newPassword = randomBytes(32).toString("base64url");
  const username = `mi7-synthetic-required-actions-${info.project.name}`;
  await page.goto(authorization);
  await page.evaluate(({ username, password }) => {
    (document.querySelector<HTMLInputElement>("#username")!).value = username;
    (document.querySelector<HTMLInputElement>("#password")!).value = password;
  }, { username, password: initialPassword });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator("#kc-totp-settings-form")).toBeVisible();
  await expect(page.locator('label[for="totp"]')).toBeVisible();
  await expect(page.locator('label[for="userLabel"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `/private/tmp/tcdx-mi7-theme-${info.project.name}-totp-setup.png`, fullPage: true,
    mask: [page.locator("#kc-totp-secret-qr-code")] });
  const seed = await page.locator("#totpSecret").inputValue();
  const code = totp(seed);
  await page.evaluate((code) => { (document.querySelector<HTMLInputElement>("#totp")!).value = code; }, code);
  await page.locator("#saveTOTPBtn").click();
  await expect(page.locator("#kc-passwd-update-form")).toBeVisible();
  await expect(page.locator('label[for="password-new"]')).toBeVisible();
  await expect(page.locator('label[for="password-confirm"]')).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `/private/tmp/tcdx-mi7-theme-${info.project.name}-password-update.png`, fullPage: true });
  await page.evaluate((password) => {
    (document.querySelector<HTMLInputElement>("#password-new")!).value = password;
    (document.querySelector<HTMLInputElement>("#password-confirm")!).value = password;
  }, newPassword);
  await page.locator("#kc-submit").click();
  try {
    await expect(page.getByRole("heading", { name: "Local fixture completed" })).toBeVisible();
  } catch {
    const location = new URL(page.url());
    throw new Error(`LOCAL_CALLBACK_NOT_RENDERED origin=${location.origin} path=${location.pathname}`);
  }
  await context.clearCookies();
  await page.goto(authorization);
  await page.evaluate(({ username, password }) => {
    (document.querySelector<HTMLInputElement>("#username")!).value = username;
    (document.querySelector<HTMLInputElement>("#password")!).value = password;
  }, { username, password: newPassword });
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator("#kc-otp-login-form")).toBeVisible();
  await expect(page.getByLabel("Usuario o email", { exact: true })).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Código de verificación", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  const overflowing = await page.evaluate(() => [...document.querySelectorAll("*")]
    .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
    .map((element) => ({ tag: element.tagName, id: element.id, class: element.getAttribute("class"), width: element.getBoundingClientRect().width })));
  expect(overflowing).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: `/private/tmp/tcdx-mi7-theme-${info.project.name}-otp-challenge.png`, fullPage: true });
  await page.getByLabel("Código de verificación", { exact: true }).fill("invalid-synthetic-code");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByText("El código de verificación no es válido.", { exact: true })).toBeVisible();
  await expect(page.locator("#otp")).toHaveAttribute("aria-describedby", "input-error-container-otp");
});

test("disabled account remains on the branded IAM surface", async ({ page }) => {
  const password = process.env.TCDX_MI7_SYNTHETIC_PASSWORD;
  if (!password) throw new Error("LOCAL_SYNTHETIC_FIXTURE_REQUIRED");
  await page.goto(authorization);
  await page.evaluate((password) => {
    (document.querySelector<HTMLInputElement>("#username")!).value = "mi7-synthetic-disabled";
    (document.querySelector<HTMLInputElement>("#password")!).value = password;
  }, password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByText("La cuenta está deshabilitada. Solicita ayuda mediante el procedimiento autorizado.", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
});

test("IAM logout confirmation and information retain the same brand", async ({ page }, info) => {
  await page.goto("/realms/tcdx-mi7-local/protocol/openid-connect/logout?client_id=tcdx-mi7-local-browser&kc_locale=es");
  await expect(page.locator("#kc-logout-confirm")).toBeVisible();
  await expect(page.locator("#kc-header-wrapper")).toHaveText("Tecdex GRC");
  await expect(page.locator("body")).not.toContainText(/keycloak/i);
  await page.screenshot({ path: `/private/tmp/tcdx-mi7-theme-${info.project.name}-logout.png`, fullPage: true });
  await page.locator("#kc-logout").click();
  await expect(page.locator("#kc-info-message")).toBeVisible();
  await expect(page.locator("#kc-header-wrapper")).toHaveText("Tecdex GRC");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
