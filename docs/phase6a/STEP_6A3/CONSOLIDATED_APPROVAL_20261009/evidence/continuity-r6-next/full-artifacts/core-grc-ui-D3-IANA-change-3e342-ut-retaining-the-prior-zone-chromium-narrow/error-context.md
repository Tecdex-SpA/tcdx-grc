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
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Empresa activa', { exact: true })
    - locator resolved to <select aria-label="Empresa activa">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - element is not visible
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - element is not visible
    - retrying select option action
      - waiting 100ms
    58 × waiting for element to be visible and enabled
       - element is not visible
     - retrying select option action
       - waiting 500ms

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
      - button "Abrir navegación" [ref=e45] [cursor=pointer]: ☰
      - generic [ref=e46]:
        - generic [ref=e47]: Buscar
        - searchbox "Buscar" [ref=e48]
      - generic [ref=e49]:
        - generic [ref=e50]: U
        - button "Cerrar sesión" [ref=e51] [cursor=pointer]
    - main [ref=e52]:
      - tablist "Submódulos" [ref=e53]:
        - tab "Pruebas de aseguramiento" [selected] [ref=e54] [cursor=pointer]
      - generic [ref=e55]:
        - generic [ref=e56]:
          - paragraph [ref=e57]: Espacio operativo
          - heading "Pruebas de aseguramiento" [level=1] [ref=e58]
          - paragraph [ref=e59]: Registros vigentes dentro de tu alcance autorizado.
        - generic [ref=e60]:
          - button "Nuevo registro" [ref=e61] [cursor=pointer]
          - generic [ref=e62]:
            - text: Estado
            - combobox "Filtrar por estado" [ref=e63]:
              - option "Todos" [selected]
              - option "Planificada"
              - option "En progreso"
              - option "Completada"
              - option "Revisada"
              - option "Aprobada"
      - region "Pruebas de aseguramiento" [ref=e64]:
        - table [ref=e66]:
          - rowgroup [ref=e67]:
            - row [ref=e68]:
              - columnheader "Identificador" [ref=e69]
              - columnheader "Referencia" [ref=e70]
              - columnheader "Estado" [ref=e71]
              - columnheader "Versión" [ref=e72]
              - columnheader "Acciones" [ref=e73]
          - rowgroup [ref=e75]:
            - row [ref=e76]:
              - cell [ref=e77]:
                - code [ref=e78]: 018f47f2…
              - cell [ref=e79]:
                - strong [ref=e80]: ZONE-SWITCH-SIMULATED
              - cell "En progreso" [ref=e81]
              - cell "2" [ref=e84]
              - cell [ref=e85]:
                - button "Ver detalle" [ref=e86] [cursor=pointer]
      - dialog [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - paragraph [ref=e90]: Detalle del registro
            - heading "ZONE-SWITCH-SIMULATED" [level=2] [ref=e91]
          - button "Cerrar detalle" [ref=e92] [cursor=pointer]: ×
        - generic [ref=e93]:
          - paragraph [ref=e94]: Procedencia del vocabulario contractual no registrada
          - generic [ref=e95]: En progreso
          - generic [ref=e97]:
            - term [ref=e98]: ID de prueba
            - definition [ref=e99]: Referencia vinculada
            - term [ref=e100]: Versión
            - definition [ref=e101]: "2"
            - term [ref=e102]: Código de prueba
            - definition [ref=e103]: ZONE-SWITCH-SIMULATED
            - term [ref=e104]: Estado
            - definition [ref=e105]: En progreso
          - generic [ref=e106]:
            - heading "Ejecutar" [level=3] [ref=e107]
            - generic [ref=e108]:
              - text: Estado del resultado
              - combobox "Estado del resultado" [ref=e109]:
                - option "Selecciona una opción" [selected]
                - option "Válido"
                - option "Sin datos"
                - option "Datos insuficientes"
                - option "Cobertura insuficiente"
                - option "Fuente desactualizada"
                - option "Fuentes en conflicto"
                - option "Dependencia pendiente"
                - option "Datos de entrada no válidos"
                - option "Error de la fuente"
                - option "Error de cálculo"
                - option "No aplicable"
                - option "Sustituida"
            - generic [ref=e110]:
              - text: Conclusión
              - combobox "Conclusión" [ref=e111]:
                - option "Selecciona una opción" [selected]
                - option "Efectivo"
                - option "Efectivo parcialmente"
                - option "No efectivo"
                - option "Sin probar"
                - option "Evidencia insuficiente"
            - group "Muestras" [ref=e112]:
              - group "Muestra 1" [ref=e114]:
                - generic [ref=e116]:
                  - text: Código de muestra
                  - textbox "Código de muestra" [ref=e117]
                - generic [ref=e118]:
                  - text: Tamaño de la población
                  - spinbutton "Tamaño de la población" [ref=e119]
                - generic [ref=e120]:
                  - text: Tamaño de la muestra
                  - spinbutton "Tamaño de la muestra" [ref=e121]
                - generic [ref=e122]:
                  - text: Método de selección
                  - combobox "Método de selección" [ref=e123]:
                    - option "Selecciona una opción" [selected]
                    - option "Censo"
                    - option "Aleatoria"
                    - option "Aleatoria estratificada"
                    - option "Sistemática"
                    - option "Por juicio profesional"
                - generic [ref=e124]:
                  - text: Inicio del período de muestra
                  - textbox "Inicio del período de muestra Indica fecha, hora y desfase explícito válido para la zona de la empresa, o un instante UTC terminado en Z. · Europe/Berlin" [ref=e125]:
                    - /placeholder: AAAA-MM-DDTHH:mm:ss±HH:mm
                  - generic [ref=e126]: Indica fecha, hora y desfase explícito válido para la zona de la empresa, o un instante UTC terminado en Z. · Europe/Berlin
                - generic [ref=e127]:
                  - text: Fin del período de muestra
                  - textbox "Fin del período de muestra Indica fecha, hora y desfase explícito válido para la zona de la empresa, o un instante UTC terminado en Z. · Europe/Berlin" [ref=e128]:
                    - /placeholder: AAAA-MM-DDTHH:mm:ss±HH:mm
                  - generic [ref=e129]: Indica fecha, hora y desfase explícito válido para la zona de la empresa, o un instante UTC terminado en Z. · Europe/Berlin
                - generic [ref=e130]:
                  - text: Estado del resultado
                  - combobox "Estado del resultado" [ref=e131]:
                    - option "Selecciona una opción" [selected]
                    - option "Válido"
                    - option "Sin datos"
                    - option "Datos insuficientes"
                    - option "Cobertura insuficiente"
                    - option "Fuente desactualizada"
                    - option "Fuentes en conflicto"
                    - option "Dependencia pendiente"
                    - option "Datos de entrada no válidos"
                    - option "Error de la fuente"
                    - option "Error de cálculo"
                    - option "No aplicable"
                    - option "Sustituida"
                - button "Quitar elemento" [ref=e132] [cursor=pointer]
              - button "Agregar elemento" [active] [ref=e133] [cursor=pointer]
            - button "Ejecutar" [ref=e134] [cursor=pointer]
```

# Test source

```ts
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
  187 |   // Existing generic fixture is completed; this temporal edit case requires an in-progress test.
  188 |   await page.route("**/api/v1/assurance-tests**", route => route.fulfill({ json:
  189 |     new URL(route.request().url()).pathname === "/api/v1/assurance-tests"
  190 |       ? { items: [{ assurance_test_id: tenantId, row_version: 2, test_code: "ZONE-SWITCH-SIMULATED", lifecycle_state: "in_progress" }], page: { has_more: false, next_cursor: null } }
  191 |       : { assurance_test_id: tenantId, row_version: 2, test_code: "ZONE-SWITCH-SIMULATED", lifecycle_state: "in_progress" }
  192 |   }));
  193 |   await page.goto("/pruebas");
  194 |   const selector = page.getByLabel("Empresa activa", { exact: true });
  195 |   await selector.selectOption(tenantId);
  196 |   await page.getByRole("button", { name: "Ver detalle" }).click();
  197 |   await page.getByRole("button", { name: "Agregar elemento" }).click();
  198 |   await expect(page.getByText(/Europe\/Berlin/).first()).toBeVisible();
  199 |   await page.keyboard.press("Escape");
> 200 |   await selector.selectOption(tenantB);
      |                  ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  201 |   await expect.poll(() => requests.at(-1)).toBe(tenantB);
  202 |   await page.getByRole("button", { name: "Ver detalle" }).click();
  203 |   await page.getByRole("button", { name: "Agregar elemento" }).click();
  204 |   await expect(page.getByText(/Asia\/Tokyo/).first()).toBeVisible();
  205 |   await expect(page.getByText(/Europe\/Berlin/)).toHaveCount(0);
  206 | });
  207 | 
  208 | test("Control base selector resolves an authorized ControlVersion without a human UUID field", async ({ page }) => {
  209 |   await mockRuntime(page);
  210 |   await page.route("**/api/v1/controls**", async (route) => {
  211 |     const path = new URL(route.request().url()).pathname;
  212 |     if (path === `/api/v1/controls/${tenantId}`) {
  213 |       await route.fulfill({ json: { control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", versions: [{ control_version_id: memberId, version_number: 1, lifecycle_state: "draft" }] } });
  214 |       return;
  215 |     }
  216 |     await route.fulfill({ json: { items: [{ control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", normative_frameworks: [{ framework_version_id: roleId, framework_name: "Marco autorizado", edition: "v1" }] }], page: { has_more: false, next_cursor: null } } });
  217 |   });
  218 |   await page.goto("/controles");
  219 |   await page.getByRole("button", { name: "Nuevo registro" }).click();
  220 |   await expect(page.getByLabel("Control base autorizado")).toBeVisible();
  221 |   await expect(page.getByLabel("ID del control base")).toHaveCount(0);
  222 |   await expect(page.getByRole("option", { name: /BASE-001.*Marco autorizado/ })).toBeAttached();
  223 |   await page.getByLabel("Control base autorizado").selectOption(tenantId);
  224 |   await expect(page.getByRole("dialog")).toBeVisible();
  225 |   await expect(page.getByLabel("Responsable de negocio", { exact: true })).toBeVisible();
  226 |   await expect(page.getByLabel("ID del responsable de negocio")).toHaveCount(0);
  227 |   await expect(page.getByRole("option", { name: /Operaciones.*Proceso/ })).toBeAttached();
  228 | });
  229 | 
  230 | test("Control catalog filters by an effective contracted framework", async ({ page }) => {
  231 |   await mockRuntime(page);
  232 |   const requestedFilters: string[] = [];
  233 |   await page.route("**/api/v1/controls**", async (route) => {
  234 |     const url = new URL(route.request().url());
  235 |     requestedFilters.push(url.searchParams.get("filter[framework_version_id]") ?? "");
  236 |     await route.fulfill({ json: {
  237 |       items: [{ control_id: tenantId, control_code: "BASE-001", name: "Control base autorizado", ownership_class: "PLATFORM_CONTROL", lifecycle_state: "active", normative_frameworks: [{ framework_version_id: roleId, framework_name: "Marco autorizado", edition: "v1" }] }],
  238 |       page: { has_more: false, next_cursor: null },
  239 |       framework_filters: [{ framework_version_id: roleId, framework_code: "MARCO-A", framework_name: "Marco autorizado", edition: "v1" }]
  240 |     } });
  241 |   });
  242 |   await page.goto("/controles");
  243 |   await page.getByLabel("Filtrar por norma o ley").selectOption(roleId);
  244 |   await expect.poll(() => requestedFilters).toContain(roleId);
  245 | });
  246 | 
  247 | test("Applicability offers only the approved decisions and requires a No aplica rationale", async ({ page }) => {
  248 |   await mockRuntime(page);
  249 |   await page.goto("/cumplimiento");
  250 |   await page.getByRole("button", { name: "Nuevo registro" }).click();
  251 |   const decision = page.getByLabel("Decisión de aplicabilidad");
  252 |   await expect(decision.locator("option")).toHaveCount(3);
  253 |   await expect(decision.locator('option[value="applicable"]')).toHaveText("Aplicable");
  254 |   await expect(decision.locator('option[value="not_applicable"]')).toHaveText("No aplicable");
  255 |   await decision.selectOption("not_applicable");
  256 |   await page.getByRole("button", { name: "Crear registro" }).click();
  257 |   await expect(page.getByRole("alert")).toContainText("justificación");
  258 | });
  259 | 
  260 | test("Tenant Admin sees own contracted frameworks without commercial commands", async ({ page }) => {
  261 |   await mockRuntime(page, ["TENANT_ADMIN"]);
  262 |   await page.goto("/configuraciones/empresas");
  263 |   await expect(page.getByRole("heading", { name: "Marcos contratados" })).toBeVisible();
  264 |   await expect(page.getByText("Marco contractual A")).toBeVisible();
  265 |   await expect(page.getByRole("button", { name: "Activar marco" })).toHaveCount(0);
  266 |   await expect(page.getByRole("button", { name: "Revocar" })).toHaveCount(0);
  267 | });
  268 | 
  269 | test("Tenant Admin reads validation access without platform actions", async ({ page }) => {
  270 |   await mockRuntime(page, ["TENANT_ADMIN"]);
  271 |   let candidateCalls = 0;
  272 |   await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", (route) => {
  273 |     candidateCalls += 1; return route.fulfill({ status: 403, json: {} });
  274 |   });
  275 |   await page.route("**/api/v1/regulatory-pack-validation-accesses/current", (route) => route.fulfill({ json: {
  276 |     items: [{ regulatory_pack_validation_access_id: memberId, pack_code: "ISO-QA", name: "Marco de validación",
  277 |       edition: "2022", license_classification: "NOT_YET_LICENSED", lifecycle_state: "active",
  278 |       effective_state: "effective", effective_from: "2026-09-01T00:00:00Z", effective_to: null, row_version: 3 }],
  279 |     page: { has_more: false, next_cursor: null }
  280 |   } }));
  281 |   await page.goto("/configuraciones/empresas");
  282 |   const validation = page.locator(".admin-section").filter({ has: page.getByRole("heading", { name: "Accesos de validación" }) });
  283 |   await expect(validation).toContainText("Marco de validación");
  284 |   await expect(validation.getByRole("button", { name: /Revocar|Conceder|Crear acceso/ })).toHaveCount(0);
  285 |   await expect(validation.getByRole("columnheader", { name: "Acción" })).toHaveCount(0);
  286 |   expect(candidateCalls).toBe(0);
  287 | });
  288 | 
  289 | test("Platform Admin creates exact non-authoritative access from canonical candidates", async ({ page }, testInfo) => {
  290 |   await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  291 |   let candidateCalls = 0;
  292 |   let filteredCandidateCalls = 0;
  293 |   let accessListCalls = 0;
  294 |   let created = false;
  295 |   let commercialReads = 0;
  296 |   await page.route("**/api/v1/platform/regulatory-pack-versions", async (route) => {
  297 |     commercialReads += 1;
  298 |     await route.fulfill({ json: { items: [], page: { has_more: false, next_cursor: null } } });
  299 |   });
  300 |   await page.route("**/api/v1/platform/regulatory-pack-validation-candidates**", async (route) => {
```