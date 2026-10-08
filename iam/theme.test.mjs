import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const theme = join(root, "iam/theme/tcdx-grc/login");
const read = (path) => readFileSync(join(theme, path), "utf8");

test("theme inherits Keycloak 26.7.5 login templates and packages approved local brand", () => {
  const dockerfile = readFileSync(join(root, "iam/Dockerfile"), "utf8");
  const properties = read("theme.properties");
  assert.match(dockerfile, /^FROM quay\.io\/keycloak\/keycloak:26\.7\.5@sha256:[a-f0-9]{64}$/m);
  assert.match(properties, /^parent=keycloak\.v2$/m);
  assert.match(properties, /^styles=css\/styles\.css css\/tcdx-grc\.css$/m);
  const approved = readFileSync(join(root, "docs/ui/assets/brand/tecdex-logo-light.svg"));
  const packaged = readFileSync(join(theme, "resources/img/tecdex-logo-light.svg"));
  const hash = (data) => createHash("sha256").update(data).digest("hex");
  assert.equal(hash(packaged), hash(approved));
  assert.match(read("resources/css/tcdx-grc.css"), /:focus-visible/);
  assert.match(read("resources/css/tcdx-grc.css"), /@media \(max-width: 767px\)/);
});

test("end-user message bundles carry Tecdex GRC branding across login and required actions", () => {
  for (const language of ["es", "en"]) {
    const messages = read(`messages/messages_${language}.properties`);
    for (const key of ["loginTitle", "loginTitleHtml", "loginAccountTitle", "loginTotpTitle", "updatePasswordTitle", "errorTitle", "logoutConfirmTitle"]) {
      assert.match(messages, new RegExp(`^${key}=.+$`, "m"));
    }
    assert.doesNotMatch(messages, /keycloak/i);
    assert.match(messages, /^loginTitleHtml=Tecdex GRC$/m);
    assert.match(messages, /^tcdxManagedIdentityCaption=Tecdex Managed Identity$/m);
    assert.doesNotMatch(messages, /TCDX GRC|TCDX Managed Identity/);
  }
  const spanish = read("messages/messages_es.properties");
  for (const key of ["invalidUserMessage", "invalidPasswordMessage", "invalidTotpMessage", "accountDisabledMessage", "expiredCodeMessage", "logoutConfirmHeader"]) {
    assert.match(spanish, new RegExp(`^${key}=.+$`, "m"));
  }
});

test("versioned overrides preserve upstream form, action and session logic", () => {
  const manifest = JSON.parse(readFileSync(join(root, "iam/upstream-templates.json"), "utf8"));
  for (const entry of manifest.templates) {
    let original = read(entry.file);
    if (entry.file === "template.ftl") {
      original = original.replace('<link rel="icon" type="image/svg+xml" href="${url.resourcesPath}/img/tecdex-logo-light.svg" />', '<link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />');
      original = original.replace('<@field.group name="kc-attempted-username" label=label>', '<@field.group name="username" label=label>');
    } else if (entry.file === "field.ftl") {
      original = original.replaceAll('aria-describedby="input-error-container-${name}" ', '').replace(/\n$/, '');
    } else {
      original = original.replace('alt="${msg(\'tcdxTotpQrAlt\')}"', 'alt="Figure: Barcode"')
        .replace('for="totp"', 'for="form-vertical-name"')
        .replace('for="userLabel"', 'for="form-vertical-name"')
        .replace('aria-invalid="${messagesPerField.existsError(\'totp\')?c}" aria-describedby="<#if messagesPerField.existsError(\'totp\')>input-error-otp-code</#if>"', 'aria-invalid="<#if messagesPerField.existsError(\'totp\')>true</#if>"')
        .replace('aria-invalid="${messagesPerField.existsError(\'userLabel\')?c}" aria-describedby="<#if messagesPerField.existsError(\'userLabel\')>input-error-otp-label</#if>"', 'aria-invalid="<#if messagesPerField.existsError(\'userLabel\')>true</#if>"');
    }
    // Reconstruct the four upstream trailing spaces removed by integration formatting.
    // Keep the original upstream SHA256 assertion exact, including its whitespace.
    const upstreamSpacedLines = entry.file === "template.ftl"
      ? ['        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass} kc-login-tooltip" type="button"']
      : entry.file === "field.ftl"
        ? ['            <button', '              class="${properties.kcFormPasswordVisibilityButtonClass}"', '              type="button"']
        : [];
    if (upstreamSpacedLines.length) {
      const anchor = entry.file === "field.ftl" ? '              aria-label="${msg("code-clipboard-label")}"\n' : "";
      const formatted = `${upstreamSpacedLines.join("\n")}\n${anchor}`;
      const upstream = `${upstreamSpacedLines.join(" \n")} \n${anchor}`;
      assert.equal(original.split(formatted).length - 1, 1, entry.file);
      original = original.replace(formatted, upstream);
    }
    assert.equal(createHash("sha256").update(original).digest("hex"), entry.upstream_sha256, entry.file);
  }
});

test("theme text, primary-button states and focus use contrasting approved tokens", () => {
  const css = read("resources/css/tcdx-grc.css");
  const tokens = Object.fromEntries([...css.matchAll(/--tcdx-([\w-]+):\s*(#[a-f0-9]{6})/g)].map((match) => [match[1], match[2]]));
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const contrast = (a, b) => {
    const values = [luminance(tokens[a]), luminance(tokens[b])].sort((x, y) => y - x);
    return (values[0] + .05) / (values[1] + .05);
  };
  for (const pair of [["text", "surface"], ["navy-deep", "primary"], ["navy-deep", "primary-hover"]]) {
    assert.ok(contrast(...pair) >= 4.5, pair.join("/"));
  }
  assert.ok(contrast("navy-deep", "surface") >= 3);
  assert.match(css, /outline: 3px solid var\(--tcdx-navy-deep\)/);
});
