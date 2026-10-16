# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core-grc-ui.spec.ts >> D3 IANA changes tenant context without retaining the prior zone
- Location: e2e/core-grc-ui.spec.ts:171:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Agregar elemento' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img "Tecdex" [ref=e6]
      - generic [ref=e7]: GRC
    - navigation "Navegación principal" [ref=e8]:
      - button "Panel principal" [ref=e9] [cursor=pointer]
      - button "Cumplimiento" [ref=e16] [cursor=pointer]
      - button "Requisitos" [ref=e21] [cursor=pointer]
      - button "Controles" [ref=e26] [cursor=pointer]
      - button "Evidencias" [ref=e30] [cursor=pointer]
      - button "Acciones" [ref=e35] [cursor=pointer]
    - generic [ref=e40]:
      - strong [ref=e41]: Tecdex GRC
      - generic [ref=e42]: Gobernanza y cumplimiento
  - generic [ref=e43]:
    - banner [ref=e44]:
      - generic [ref=e45]:
        - generic [ref=e46]: Buscar
        - searchbox "Buscar" [ref=e47]
      - generic [ref=e48]:
        - generic [ref=e49]: Empresa
        - combobox "Empresa activa" [ref=e50]:
          - option "Empresa A simulada" [selected]
          - option "Empresa B simulada"
      - generic [ref=e51]:
        - generic [ref=e52]: U
        - generic [ref=e53]:
          - strong [ref=e54]: Usuario autorizado
          - generic "Responsable GRC" [ref=e55]: Empresa A simulada · Responsable GRC
        - button "Cerrar sesión" [ref=e56] [cursor=pointer]
    - main [ref=e57]:
      - tablist "Submódulos" [ref=e58]:
        - tab "Pruebas de aseguramiento" [selected] [ref=e59] [cursor=pointer]
      - generic [ref=e60]:
        - generic [ref=e61]:
          - paragraph [ref=e62]: Espacio operativo
          - heading "Pruebas de aseguramiento" [level=1] [ref=e63]
          - paragraph [ref=e64]: Registros vigentes dentro de tu alcance autorizado.
        - generic [ref=e65]:
          - button "Nuevo registro" [ref=e66] [cursor=pointer]
          - generic [ref=e67]:
            - text: Estado
            - combobox "Filtrar por estado" [ref=e68]:
              - option "Todos" [selected]
              - option "Planificada"
              - option "En progreso"
              - option "Completada"
              - option "Revisada"
              - option "Aprobada"
      - region "Pruebas de aseguramiento" [ref=e69]:
        - table [ref=e71]:
          - rowgroup [ref=e72]:
            - row [ref=e73]:
              - columnheader "Identificador" [ref=e74]
              - columnheader "Referencia" [ref=e75]
              - columnheader "Estado" [ref=e76]
              - columnheader "Versión" [ref=e77]
              - columnheader "Acciones" [ref=e78]
          - rowgroup [ref=e80]:
            - row [ref=e81]:
              - cell [ref=e82]:
                - code [ref=e83]: 018f47f2…
              - cell [ref=e84]:
                - strong [ref=e85]: AT-NN-001
              - cell "Completada" [ref=e86]
              - cell "2" [ref=e89]
              - cell [ref=e90]:
                - button "Ver detalle" [active] [ref=e91] [cursor=pointer]
      - dialog [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - paragraph [ref=e95]: Detalle del registro
            - heading "AT-NN-001" [level=2] [ref=e96]
          - button "Cerrar detalle" [ref=e97] [cursor=pointer]: ×
        - generic [ref=e98]:
          - paragraph [ref=e99]: Procedencia del vocabulario contractual no registrada
          - generic [ref=e100]: Completada
          - generic [ref=e102]:
            - term [ref=e103]: ID de prueba
            - definition [ref=e104]: Referencia vinculada
            - term [ref=e105]: Versión
            - definition [ref=e106]: "2"
            - term [ref=e107]: Código de prueba
            - definition [ref=e108]: AT-NN-001
            - term [ref=e109]: Estado
            - definition [ref=e110]: Completada
          - generic [ref=e111]:
            - heading "Revisar" [level=3] [ref=e112]
            - button "Revisar" [ref=e113] [cursor=pointer]
```

# Test source

```ts
  91  |         url.pathname === "/api/v1/regulatory-pack-validation-accesses/current") {
  92  |       if (url.pathname.includes("/platform/")) expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
  93  |       else expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
  94  |       await route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
  95  |       return;
  96  |     }
  97  |     if (url.pathname === "/api/v1/platform/regulatory-pack-versions") {
  98  |       expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
  99  |       await route.fulfill({ json: { items: [{ regulatory_pack_version_id: roleId, pack_code: "MARCO-A", name: "Marco contractual A", edition: "Edición 1", license_classification: "NOT_YET_LICENSED" }], page: { has_more: false, next_cursor: null } } });
  100 |       return;
  101 |     }
  102 |     if (url.pathname === `/api/v1/subscriptions/${tenantId}/regulatory-packs` || url.pathname === "/api/v1/subscriptions/current/regulatory-packs") {
  103 |       await route.fulfill({ json: { items: [{ subscription_regulatory_pack_id: memberId, regulatory_pack_version_id: roleId, pack_code: "MARCO-A", name: "Marco contractual A", edition: "Edición 1", license_classification: "NOT_YET_LICENSED", lifecycle_state: "active", effective_state: "effective", effective_from: "2026-09-20T00:00:00Z", effective_to: null, row_version: 1 }], page: { has_more: false, next_cursor: null } } });
  104 |       return;
  105 |     }
  106 |     if (url.pathname === "/api/v1/subjects") {
  107 |       await route.fulfill({ json: { items: [{ subject_id: memberId, subject_type: "process", canonical_key: "operaciones", display_name: "Operaciones", lifecycle_state: "active" }], page: { has_more: false, next_cursor: null } } });
  108 |       return;
  109 |     }
  110 |     if (url.pathname === "/api/v1/memberships" || url.pathname === `/api/v1/memberships/${memberId}`) {
  111 |       const person = { tenant_membership_id: memberId, tenant_id: tenantId, user_identity_id: memberId, membership_state: "active", joined_at: "2026-09-25T12:00:00Z", ended_at: null, user_identity: { display_name: "Mario de prueba", email_normalized: "mario@example.test", lifecycle_state: "active", last_authenticated_at: null }, roles: assignedRoles };
  112 |       await route.fulfill({ json: url.pathname.endsWith(memberId) ? person : { items: [person], page: { has_more: false, next_cursor: null } } });
  113 |       return;
  114 |     }
  115 |     if (url.pathname === "/api/v1/roles") {
  116 |       await route.fulfill({ json: { items: [{ role_id: roleId, tenant_id: tenantId, ownership_class: "TENANT_OWNED", role_code: "PRIVACY_MANAGER", name: "Privacy Manager", is_baseline: true, lifecycle_state: "published" }], page: { has_more: false, next_cursor: null } } });
  117 |       return;
  118 |     }
  119 |     if (url.pathname === "/api/v1/platform/membership-invitations") {
  120 |       await route.fulfill({ json: { items: [{ tenant_membership_invitation_id: memberId, tenant_id: tenantId, invitee_email: "mario@example.test", lifecycle_state: "pending", effective_state: "expired", created_at: "2026-09-25T12:00:00Z", expires_at: "2026-09-26T12:00:00Z", accepted_at: null, revoked_at: null, tenant_membership_id: null, row_version: 1 }], page: { has_more: false, next_cursor: null } } });
  121 |       return;
  122 |     }
  123 |     expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
  124 |     const key = Object.keys(rows).find((path) => url.pathname.includes(path));
  125 |     const fixture = key ? rows[key] : [];
  126 |     if (key && url.pathname !== `/api/v1${key}`) {
  127 |       const detail = { ...fixture[0] };
  128 |       if (key === "/evidence") detail.versions = [{ evidence_version_id: tenantId, row_version: 2, lifecycle_state: "approved" }];
  129 |       await route.fulfill({ json: detail });
  130 |       return;
  131 |     }
  132 |     await route.fulfill({ json: { items: fixture, page: { has_more: false, next_cursor: null } } });
  133 |   });
  134 | }
  135 | 
  136 | const evidenceDirectory = process.env.TCDX_UI_EVIDENCE_DIR ?? "artifacts/phase5-iam-ui/local-playwright";
  137 | 
  138 | test.beforeAll(async () => { await mkdir(evidenceDirectory, { recursive: true }); });
  139 | test.beforeEach(({page})=>{page.on("pageerror",error=>console.error("BROWSER_ERROR",error.message));});
  140 | 
  141 | test("D3 IANA rejects a DST gap and serializes an explicit overlapping instant in UTC", async ({ page }) => {
  142 |   await mockRuntime(page);
  143 |   const item = { assurance_test_id: tenantId, row_version: 2, test_code: "IANA-LOCAL-SIMULATED", lifecycle_state: "in_progress" };
  144 |   let body: Record<string, unknown> | undefined;
  145 |   await page.route("**/api/v1/assurance-tests**", async route => {
  146 |     if (route.request().method() === "POST") {
  147 |       body = route.request().postDataJSON();
  148 |       await route.fulfill({ status: 202, json: { operation_id: "assuranceTestExecute", status: "completed", result: {} } });
  149 |     } else await route.fulfill({ json: new URL(route.request().url()).pathname === "/api/v1/assurance-tests" ? { items: [item], page: { has_more: false, next_cursor: null } } : item });
  150 |   });
  151 |   await page.goto("/pruebas");
  152 |   await page.getByRole("button", { name: "Ver detalle" }).click();
  153 |   await page.getByRole("button", { name: "Agregar elemento" }).click();
  154 |   const period = page.getByLabel(/^Inicio del período de muestra/);
  155 |   await expect(period).toBeVisible();
  156 |   await period.fill("2026-03-29T02:30:00+01:00");
  157 |   await expect(period).toHaveAttribute("aria-invalid", "true");
  158 |   await period.fill("2026-10-25T02:30:00+02:00");
  159 |   await expect(period).not.toHaveAttribute("aria-invalid", "true");
  160 |   await expect(page.getByText(/Europe\/Berlin/).first()).toBeVisible();
  161 |   await page.getByLabel("Código de muestra", { exact: true }).fill("SIMULATED-SHAPE");
  162 |   await page.getByLabel("Tamaño de la muestra", { exact: true }).fill("1");
  163 |   await page.getByLabel("Método de selección", { exact: true }).selectOption({ index: 1 });
  164 |   for (const select of await page.locator('.workflow-action > label select').all()) await select.selectOption({ index: 1 });
  165 |   await page.screenshot({ path: `${evidenceDirectory}/r6-iana-${test.info().project.name}.png`, fullPage: true });
  166 |   await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  167 |   await expect.poll(() => body).toBeDefined();
  168 |   expect((body!.samples as Array<Record<string, unknown>>)[0]!.sample_period_start).toBe("2026-10-25T00:30:00Z");
  169 | });
  170 | 
  171 | test("D3 IANA changes tenant context without retaining the prior zone", async ({ page }) => {
  172 |   await mockRuntime(page);
  173 |   const tenantB = "018f47f2-6170-7bd0-9d43-12f644a2b121";
  174 |   const requests: string[] = [];
  175 |   await page.route("**/api/v1/access/me", route => route.fulfill({ json: {
  176 |     available_tenant_contexts: [tenantId, tenantB].map((id, index) => ({ tenant_id: id,
  177 |       tenant_display_name: index ? "Empresa B simulada" : "Empresa A simulada",
  178 |       tenant_membership_id: id, membership_state: "active", effective_role_codes: ["GRC_MANAGER"] })), effective_platform_role_codes: []
  179 |   } }));
  180 |   await page.route("**/api/v2/auth/me/authorization", route => {
  181 |     const selected = route.request().headers()["x-tcdx-tenant-id"];
  182 |     expect([undefined, tenantId, tenantB]).toContain(selected);
  183 |     requests.push(selected ?? "none");
  184 |     return route.fulfill({ json: { evaluated_at: new Date().toISOString(), platform_permissions: [],
  185 |       tenant_permissions: selected ? { tenant_id: selected, default_timezone: selected === tenantB ? "Asia/Tokyo" : "Europe/Berlin", permissions: {} } : null } });
  186 |   });
  187 |   await page.goto("/pruebas");
  188 |   const selector = page.getByLabel("Empresa activa", { exact: true });
  189 |   await selector.selectOption(tenantId);
  190 |   await page.getByRole("button", { name: "Ver detalle" }).click();
> 191 |   await page.getByRole("button", { name: "Agregar elemento" }).click();
      |                                                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  192 |   await expect(page.getByText(/Europe\/Berlin/).first()).toBeVisible();
  193 |   await selector.selectOption(tenantB);
  194 |   await expect.poll(() => requests.at(-1)).toBe(tenantB);
  195 |   await page.getByRole("button", { name: "Ver detalle" }).click();
  196 |   await page.getByRole("button", { name: "Agregar elemento" }).click();
  197 |   await expect(page.getByText(/Asia\/Tokyo/).first()).toBeVisible();
  198 |   await expect(page.getByText(/Europe\/Berlin/)).toHaveCount(0);
  199 | });
  200 | 
  201 | test("Control base selector resolves an authorized ControlVersion without a human UUID field", async ({ page }) => {
  202 |   await mockRuntime(page);
  203 |   await page.route("**/api/v1/controls**", async (route) => {
  204 |     const path = new URL(route.request().url()).pathname;
  205 |     if (path === `/api/v1/controls/${tenantId}`) {
  206 |       await route.fulfill({ json: { control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", versions: [{ control_version_id: memberId, version_number: 1, lifecycle_state: "draft" }] } });
  207 |       return;
  208 |     }
  209 |     await route.fulfill({ json: { items: [{ control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", normative_frameworks: [{ framework_version_id: roleId, framework_name: "Marco autorizado", edition: "v1" }] }], page: { has_more: false, next_cursor: null } } });
  210 |   });
  211 |   await page.goto("/controles");
  212 |   await page.getByRole("button", { name: "Nuevo registro" }).click();
  213 |   await expect(page.getByLabel("Control base autorizado")).toBeVisible();
  214 |   await expect(page.getByLabel("ID del control base")).toHaveCount(0);
  215 |   await expect(page.getByRole("option", { name: /BASE-001.*Marco autorizado/ })).toBeAttached();
  216 |   await page.getByLabel("Control base autorizado").selectOption(tenantId);
  217 |   await expect(page.getByRole("dialog")).toBeVisible();
  218 |   await expect(page.getByLabel("Responsable de negocio", { exact: true })).toBeVisible();
  219 |   await expect(page.getByLabel("ID del responsable de negocio")).toHaveCount(0);
  220 |   await expect(page.getByRole("option", { name: /Operaciones.*Proceso/ })).toBeAttached();
  221 | });
  222 | 
  223 | test("Control catalog filters by an effective contracted framework", async ({ page }) => {
  224 |   await mockRuntime(page);
  225 |   const requestedFilters: string[] = [];
  226 |   await page.route("**/api/v1/controls**", async (route) => {
  227 |     const url = new URL(route.request().url());
  228 |     requestedFilters.push(url.searchParams.get("filter[framework_version_id]") ?? "");
  229 |     await route.fulfill({ json: {
  230 |       items: [{ control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", lifecycle_state: "active", normative_frameworks: [{ framework_version_id: roleId, framework_name: "Marco autorizado", edition: "v1" }] }],
  231 |       page: { has_more: false, next_cursor: null },
  232 |       framework_filters: [{ framework_version_id: roleId, framework_code: "MARCO-A", framework_name: "Marco autorizado", edition: "v1" }]
  233 |     } });
  234 |   });
  235 |   await page.goto("/controles");
  236 |   await page.getByLabel("Filtrar por norma o ley").selectOption(roleId);
  237 |   await expect.poll(() => requestedFilters).toContain(roleId);
  238 | });
  239 | 
  240 | test("Applicability offers only the approved decisions and requires a No aplica rationale", async ({ page }) => {
  241 |   await mockRuntime(page);
  242 |   await page.goto("/cumplimiento");
  243 |   await page.getByRole("button", { name: "Nuevo registro" }).click();
  244 |   const decision = page.getByLabel("Decisión de aplicabilidad");
  245 |   await expect(decision.locator("option")).toHaveCount(3);
  246 |   await expect(decision.locator('option[value="applicable"]')).toHaveText("Aplicable");
  247 |   await expect(decision.locator('option[value="not_applicable"]')).toHaveText("No aplicable");
  248 |   await decision.selectOption("not_applicable");
  249 |   await page.getByRole("button", { name: "Crear registro" }).click();
  250 |   await expect(page.getByRole("alert")).toContainText("justificación");
  251 | });
  252 | 
  253 | test("Tenant Admin sees own contracted frameworks without commercial commands", async ({ page }) => {
  254 |   await mockRuntime(page, ["TENANT_ADMIN"]);
  255 |   await page.goto("/configuraciones/empresas");
  256 |   await expect(page.getByRole("heading", { name: "Marcos contratados" })).toBeVisible();
  257 |   await expect(page.getByText("Marco contractual A")).toBeVisible();
  258 |   await expect(page.getByRole("button", { name: "Activar marco" })).toHaveCount(0);
  259 |   await expect(page.getByRole("button", { name: "Revocar" })).toHaveCount(0);
  260 | });
  261 | 
  262 | test("Tenant Admin reads validation access without platform actions", async ({ page }) => {
  263 |   await mockRuntime(page, ["TENANT_ADMIN"]);
  264 |   let candidateCalls = 0;
  265 |   await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", (route) => {
  266 |     candidateCalls += 1; return route.fulfill({ status: 403, json: {} });
  267 |   });
  268 |   await page.route("**/api/v1/regulatory-pack-validation-accesses/current", (route) => route.fulfill({ json: {
  269 |     items: [{ regulatory_pack_validation_access_id: memberId, pack_code: "ISO-QA", name: "Marco de validación",
  270 |       edition: "2022", license_classification: "NOT_YET_LICENSED", lifecycle_state: "active",
  271 |       effective_state: "effective", effective_from: "2026-09-01T00:00:00Z", effective_to: null, row_version: 3 }],
  272 |     page: { has_more: false, next_cursor: null }
  273 |   } }));
  274 |   await page.goto("/configuraciones/empresas");
  275 |   const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  276 |   await expect(validation).toContainText("Marco de validación");
  277 |   await expect(validation.getByRole("button", { name: /Revocar|Conceder|Crear acceso/ })).toHaveCount(0);
  278 |   await expect(validation.getByRole("columnheader", { name: "Acción" })).toHaveCount(0);
  279 |   expect(candidateCalls).toBe(0);
  280 | });
  281 | 
  282 | test("Platform Admin creates exact non-authoritative access from canonical candidates", async ({ page }, testInfo) => {
  283 |   await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  284 |   let candidateCalls = 0;
  285 |   let filteredCandidateCalls = 0;
  286 |   let accessListCalls = 0;
  287 |   let created = false;
  288 |   let commercialReads = 0;
  289 |   await page.route("**/api/v1/platform/regulatory-pack-versions", async (route) => {
  290 |     commercialReads += 1;
  291 |     await route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
```