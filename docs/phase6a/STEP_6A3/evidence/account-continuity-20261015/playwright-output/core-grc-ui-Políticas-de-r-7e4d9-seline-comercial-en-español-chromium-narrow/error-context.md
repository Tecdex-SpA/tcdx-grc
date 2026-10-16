# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core-grc-ui.spec.ts >> Políticas de retención mantiene la baseline comercial en español
- Location: e2e/core-grc-ui.spec.ts:911:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('tab', { name: 'Políticas de retención', exact: true })

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
        - tab "Solicitudes de evidencia" [selected] [ref=e54] [cursor=pointer]
        - tab "Evidencias" [ref=e55] [cursor=pointer]
      - generic [ref=e56]:
        - generic [ref=e57]:
          - paragraph [ref=e58]: Espacio operativo
          - heading "Solicitudes de evidencia" [level=1] [ref=e59]
          - paragraph [ref=e60]: Registros vigentes dentro de tu alcance autorizado.
        - generic [ref=e61]:
          - button "Nuevo registro" [ref=e62] [cursor=pointer]
          - generic [ref=e63]:
            - text: Estado
            - combobox "Filtrar por estado" [ref=e64]:
              - option "Todos" [selected]
              - option "Abierta"
              - option "Atendida"
              - option "Cancelada"
              - option "Vencida"
      - region "Solicitudes de evidencia" [ref=e65]:
        - table [ref=e67]:
          - rowgroup [ref=e68]:
            - row [ref=e69]:
              - columnheader "Identificador" [ref=e70]
              - columnheader "Referencia" [ref=e71]
              - columnheader "Estado" [ref=e72]
              - columnheader "Versión" [ref=e73]
              - columnheader "Acciones" [ref=e74]
          - rowgroup [ref=e76]:
            - row [ref=e77]:
              - cell [ref=e78]:
                - code [ref=e79]: 018f47f2…
              - cell [ref=e80]:
                - strong [ref=e81]: ER-NN-001
              - cell "Abierta" [ref=e82]
              - cell "1" [ref=e85]
              - cell [ref=e86]:
                - button "Ver detalle" [ref=e87] [cursor=pointer]
```

# Test source

```ts
  814  |   await expect(page.getByText("Rol asignado y auditado.", { exact: true })).toBeVisible();
  815  |   await page.screenshot({ path: `${evidenceDirectory}/admin-users-${testInfo.project.name}.png`, fullPage: true });
  816  | });
  817  | 
  818  | test("removing one tenant role requires human confirmation and preserves the other", async ({ page }) => {
  819  |   await mockRuntime(page, ["TENANT_ADMIN"], ["PLATFORM_ADMIN"]);
  820  |   const otherAssignmentId = "018f47f2-6170-7bd0-9d43-12f644a2b121";
  821  |   const futureAssignmentId = "018f47f2-6170-7bd0-9d43-12f644a2b122";
  822  |   const assignments = [
  823  |     { membership_role_id: roleId, role_id: roleId, role_code: "CONTROL_OWNER", role_name: "Control Owner", scope_kind: "tenant", valid_from: "2026-09-25T12:00:00Z", valid_to: null as string | null, etag: "a".repeat(64) },
  824  |     { membership_role_id: otherAssignmentId, role_id: otherAssignmentId, role_code: "EVIDENCE_OWNER", role_name: "Evidence Owner", scope_kind: "tenant", valid_from: "2026-09-25T12:00:00Z", valid_to: null, etag: "b".repeat(64) },
  825  |     { membership_role_id: futureAssignmentId, role_id: futureAssignmentId, role_code: "LEGAL_REVIEWER", role_name: "Legal Reviewer", scope_kind: "tenant", valid_from: new Date(Date.now() + 86_400_000).toISOString(), valid_to: null, etag: "c".repeat(64) }
  826  |   ];
  827  |   let revokeCount = 0;
  828  |   await page.route(/\/api\/v1\/(memberships|role-assignments\/)/, async (route) => {
  829  |     const url = new URL(route.request().url());
  830  |     if (url.pathname === `/api/v1/role-assignments/${roleId}:revoke`) {
  831  |       expect(url.searchParams.get("tenant_id")).toBe(tenantId);
  832  |       expect(route.request().headers()["x-tcdx-tenant-id"]).toBeUndefined();
  833  |       expect(route.request().headers()["if-match"]).toBe(`"${"a".repeat(64)}"`);
  834  |       expect(route.request().postDataJSON()).toEqual({ reason: "Preparar segregación SoD" });
  835  |       assignments[0]!.valid_to = new Date(Date.now() - 60_000).toISOString();
  836  |       revokeCount += 1;
  837  |       await route.fulfill({ status: 202, json: { operation_id: "membershipRoleRevoke", status: "completed", result: assignments[0] } });
  838  |       return;
  839  |     }
  840  |     if (url.pathname === "/api/v1/memberships" || url.pathname === `/api/v1/memberships/${memberId}`) {
  841  |       const person = { tenant_membership_id: memberId, tenant_id: tenantId, user_identity_id: memberId, membership_state: "active", joined_at: "2026-09-25T12:00:00Z", user_identity: { display_name: "Mario de prueba" }, roles: assignments };
  842  |       await route.fulfill({ json: url.pathname.endsWith(memberId) ? person : { items: [person], page: { has_more: false, next_cursor: null } } });
  843  |       return;
  844  |     }
  845  |     await route.fallback();
  846  |   });
  847  |   await page.goto(`/configuraciones/usuarios?tenant_id=${tenantId}`);
  848  |   await expect(page.getByRole("row", { name: /Mario de prueba/ })).toContainText("Responsable de control · Responsable de evidencia");
  849  |   await expect(page.getByRole("row", { name: /Mario de prueba/ })).not.toContainText("Revisor legal");
  850  |   await page.getByRole("button", { name: "Ver detalle" }).click();
  851  |   await expect(page.getByRole("dialog")).toContainText("Responsable de control");
  852  |   await expect(page.getByRole("dialog")).toContainText("Responsable de evidencia");
  853  |   await expect(page.getByRole("dialog")).toContainText("Vigencia futura");
  854  |   await expect(page.getByRole("dialog").getByRole("button", { name: "Quitar rol" })).toHaveCount(2);
  855  |   page.on("dialog", async (dialog) => {
  856  |     if (dialog.type() === "confirm") await dialog.accept();
  857  |     else if (dialog.type() === "prompt") await dialog.accept("Preparar segregación SoD");
  858  |   });
  859  |   await page.getByRole("button", { name: "Quitar rol" }).first().click();
  860  |   await expect(page.getByText("Rol revocado y auditado. Los demás roles se conservaron.")).toBeVisible();
  861  |   expect(revokeCount).toBe(1);
  862  |   await expect(page.getByRole("row", { name: /Mario de prueba/ })).toContainText("Responsable de evidencia");
  863  |   await expect(page.getByRole("row", { name: /Mario de prueba/ })).not.toContainText("Responsable de control");
  864  |   await expect(page.getByRole("dialog")).toContainText("Responsable de evidencia");
  865  |   await expect(page.getByRole("dialog")).toContainText("Vigencia finalizada");
  866  |   await expect(page.getByRole("dialog").getByRole("button", { name: "Quitar rol" })).toHaveCount(1);
  867  | });
  868  | 
  869  | test("dashboard visual contract, drill-down and accessibility", async ({ page }, testInfo) => {
  870  |   await mockRuntime(page);
  871  |   await page.goto("/dashboard");
  872  |   await expect(page.locator(".brand img")).toBeVisible();
  873  |   await expect.poll(() => page.locator(".brand img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  874  |   await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
  875  |   await expect(page.locator(".kpi-card")).toHaveCount(4);
  876  |   await expect(page.getByText("Registros visibles de la empresa")).toBeVisible();
  877  |   await expect(page.getByRole("heading", { name: "Estado de requisitos" })).toBeVisible();
  878  |   await expect(page.getByText("Sobre registros visibles · 2").first()).toBeVisible();
  879  |   await expect(page.getByText("Válido", { exact: true })).toBeVisible();
  880  |   await expect(page.getByText("Datos insuficientes", { exact: true })).toBeVisible();
  881  |   await expect(page.locator("body")).not.toContainText(/Fase 5|revisión visual humana|estado de implementación|result_status|insufficient_data|remediation_in_progress|in_review/);
  882  |   await expect(page.locator("body")).not.toContainText(/benchmark|puntaje global|tendencia de cumplimiento|meta anual/i);
  883  |   if (!testInfo.project.name.includes("narrow")) await expect(page.getByText("Responsable GRC")).toBeVisible();
  884  |   if (testInfo.project.name.includes("desktop") || testInfo.project.name.includes("laptop")) {
  885  |     const lowerVisual = await page.getByRole("heading", { name: "Estado de controles" }).boundingBox();
  886  |     expect(lowerVisual?.y).toBeLessThan(testInfo.project.name.includes("desktop") ? 1024 : 800);
  887  |   }
  888  |   await page.screenshot({ path: `${evidenceDirectory}/dashboard-${testInfo.project.name}.png`, fullPage: true });
  889  |   await page.keyboard.press("Tab");
  890  |   await expect(page.locator(":focus-visible")).toBeVisible();
  891  |   if (testInfo.project.name.includes("narrow")) {
  892  |     await expect(page.getByRole("button", { name: "Abrir navegación" })).toBeVisible();
  893  |     await page.getByRole("button", { name: "Abrir navegación" }).click();
  894  |     await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  895  |   }
  896  | });
  897  | 
  898  | for (const [routeName, heading, screenshot, openDetail] of [
  899  |   ["cumplimiento", "Aplicabilidad", "aplicabilidad", false],
  900  |   ["requisitos", "Evaluaciones de requisitos", "evaluaciones-requisitos", false],
  901  |   ["cumplimiento", "Declaración de aplicabilidad", "soa", false],
  902  |   ["controles", "Controles", "controles", false],
  903  |   ["controles", "Evaluaciones de control", "evaluaciones-control", false],
  904  |   ["controles", "Pruebas de aseguramiento", "pruebas-aseguramiento", true],
  905  |   ["evidencias", "Solicitudes de evidencia", "solicitudes-evidencia", false],
  906  |   ["evidencias", "Evidencias", "evidencias", true],
  907  |   ["evidencias", "Políticas de retención", "politicas-retencion", true],
  908  |   ["acciones", "Hallazgos y brechas", "hallazgos", false],
  909  |   ["acciones", "Acciones", "acciones", true]
  910  | ] as const) {
  911  |   test(`${heading} mantiene la baseline comercial en español`, async ({ page }, testInfo) => {
  912  |     await mockRuntime(page);
  913  |     await page.goto(`/${routeName}`);
> 914  |     await page.getByRole("tab", { name: heading, exact: true }).click();
       |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  915  |     await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  916  |     await expect(page.getByRole("table")).toBeVisible();
  917  |     await expect(page.locator("body")).not.toContainText(/Fase 5|revisión visual humana|estado de implementación/i);
  918  |     await expect(page.locator("body")).not.toContainText(/in_progress|in_review|under_review|remediation_in_progress|pending_verification/);
  919  |     if (openDetail) {
  920  |       await page.getByRole("button", { name: "Ver detalle" }).click();
  921  |       await expect(page.getByRole("dialog")).toBeVisible();
  922  |       await expect(page.getByRole("dialog").locator(".spinner")).toHaveCount(0);
  923  |     }
  924  |     await page.screenshot({ path: `${evidenceDirectory}/${screenshot}-${testInfo.project.name}.png`, fullPage: true });
  925  |   });
  926  | }
  927  | 
  928  | for (const result of ["valid", "no_data"] as const) {
  929  |   test(`Control assessment completes with ${result}, then refetches authoritative state`, async ({ page }) => {
  930  |     await mockRuntime(page);
  931  |     let state = "in_progress";
  932  |     let readsAfterCommand = 0;
  933  |     await page.route("**/api/v1/control-assessments**", async (route) => {
  934  |       const request = route.request();
  935  |       if (request.method() === "POST") {
  936  |         expect(new URL(request.url()).pathname).toBe(`/api/v1/control-assessments/${tenantId}:complete`);
  937  |         expect(request.postDataJSON()).toEqual(result === "valid"
  938  |           ? { expected_version: 2, result_status: result, domain_conclusion: "effective", design_effectiveness: 90, operating_effectiveness: 80, coverage_percent: 100 }
  939  |           : { expected_version: 2, result_status: result });
  940  |         expect(request.headers()["x-tcdx-tenant-id"]).toBe(tenantId);
  941  |         expect(request.headers()["idempotency-key"]).toBeTruthy();
  942  |         state = "completed";
  943  |         await route.fulfill({ status: 202, json: { operation_id: "controlAssessmentSubmit", status: "completed" } });
  944  |         return;
  945  |       }
  946  |       if (state === "completed") readsAfterCommand++;
  947  |       const row = { control_assessment_id: tenantId, row_version: state === "completed" ? 3 : 2, domain_conclusion: "Control QA", lifecycle_state: state };
  948  |       await route.fulfill({ json: new URL(request.url()).pathname.endsWith(tenantId) ? row : { items: [row], page: { has_more: false, next_cursor: null } } });
  949  |     });
  950  |     await page.goto("/evaluaciones-control");
  951  |     await page.getByRole("button", { name: "Ver detalle" }).click();
  952  |     await page.getByLabel("Estado del resultado", { exact: true }).selectOption(result);
  953  |     if (result === "valid") {
  954  |       await page.getByLabel("Conclusión", { exact: true }).selectOption("effective");
  955  |       await page.getByLabel("Efectividad de diseño", { exact: true }).fill("90");
  956  |       await page.getByLabel("Efectividad operativa", { exact: true }).fill("80");
  957  |       await page.getByLabel("Cobertura (%)", { exact: true }).fill("100");
  958  |     }
  959  |     await page.getByRole("dialog").getByRole("button", { name: "Completar", exact: true }).click();
  960  |     await expect(page.getByRole("dialog")).toHaveCount(0);
  961  |     await expect.poll(() => readsAfterCommand).toBeGreaterThan(0);
  962  |     await page.getByRole("button", { name: "Ver detalle" }).click();
  963  |     await expect(page.getByRole("dialog").getByRole("button", { name: "Revisar", exact: true })).toBeVisible();
  964  |     await expect(page.getByRole("dialog").getByRole("button", { name: "Completar", exact: true })).toHaveCount(0);
  965  |   });
  966  | }
  967  | 
  968  | test("Evidence request keeps backend denial and refetches successful fulfillment", async ({ page }) => {
  969  |   await mockRuntime(page);
  970  |   let state = "open";
  971  |   let commands = 0;
  972  |   await page.route("**/api/v1/evidence-requests**", async (route) => {
  973  |     if (route.request().method() === "POST") {
  974  |       expect(new URL(route.request().url()).pathname).toBe(`/api/v1/evidence-requests/${tenantId}:fulfill`);
  975  |       expect(route.request().postDataJSON()).toEqual({ expected_version: 1, evidence_version_id: memberId });
  976  |       expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
  977  |       commands++;
  978  |       if (commands === 1) {
  979  |         await route.fulfill({ status: 403, json: { type: "about:blank", title: "Denied", status: 403, code: "TCDX.AUTHORIZATION.DENIED" } });
  980  |       } else {
  981  |         state = "fulfilled";
  982  |         await route.fulfill({ status: 202, json: { operation_id: "evidenceRequestFulfill", status: "completed" } });
  983  |       }
  984  |       return;
  985  |     }
  986  |     const row = { evidence_request_id: tenantId, control_id:roleId, request_code: "QA-REQUEST", row_version: state === "open" ? 1 : 2, lifecycle_state: state };
  987  |     await route.fulfill({ json: new URL(route.request().url()).pathname.endsWith(tenantId) ? row : { items: [row], page: { has_more: false, next_cursor: null } } });
  988  |   });
  989  |   await page.route("**/api/v1/evidence/**",route=>route.fulfill({json:{evidence_id:tenantId,evidence_code:"Evidencia aprobada",versions:[{evidence_version_id:memberId,version_number:1,lifecycle_state:"approved",file_object_id:roleId}]}}));
  990  |   await page.route("**/api/v1/file-objects/**",route=>route.fulfill({json:{file_object_id:roleId,scan_status:"passed"}}));
  991  |   await page.route("**/api/v1/evidence-versions/**",route=>route.fulfill({json:{evidence_version_id:memberId,evidence_id:tenantId,version_number:1,lifecycle_state:"approved",links:[{control_id:roleId}]}}));
  992  |   await page.goto("/solicitudes-evidencia");
  993  |   await page.getByRole("button", { name: "Ver detalle" }).click();
  994  |   await page.getByLabel("Evidencia",{exact:true}).selectOption(tenantId);
  995  |   await page.getByLabel("Versión de evidencia aprobada",{exact:true}).selectOption(memberId);
  996  |   await page.getByRole("dialog").getByRole("button", { name: "Cumplir solicitud", exact: true }).click();
  997  |   await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  998  |   await expect(page.getByRole("dialog")).toBeVisible();
  999  |   await page.getByRole("dialog").getByRole("button", { name: "Cumplir solicitud", exact: true }).click();
  1000 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  1001 |   await expect(page.getByRole("row").filter({ hasText: "QA-REQUEST" })).toContainText("Atendida");
  1002 |   await page.getByRole("button", { name: "Ver detalle" }).click();
  1003 |   await expect(page.getByRole("dialog").getByRole("button", { name: "Cumplir solicitud", exact: true })).toHaveCount(0);
  1004 | });
  1005 | 
  1006 | for (const [module, domain, entityField] of [["requisitos", "compliance", "requirement_applicability_id"], ["evaluaciones-control", "controls", "control_id"]] as const) {
  1007 |   test(`${domain} assessment selects the published server methodology without a fabricated default`, async ({ page }) => {
  1008 |     await mockRuntime(page, ["COMPLIANCE_MANAGER", "GRC_MANAGER"]);
  1009 |     await page.route(`**/api/v1/${domain}-methodologies**`, route => route.fulfill({ json: { items: [{ methodology_version_ref: roleId, name: "Metodología publicada QA", version_number: 2 }], page: { has_more: false, next_cursor: null } } }));
  1010 |     let submitted = false;
  1011 |     await page.route(`**/api/v1/${domain === "compliance" ? "requirement" : "control"}-assessments`, async route => {
  1012 |       if (route.request().method() !== "POST") { await route.fallback(); return; }
  1013 |       expect(route.request().postDataJSON()).toMatchObject({ [entityField]: tenantId, methodology_version_ref: roleId });
  1014 |       expect(route.request().headers()["x-tcdx-tenant-id"]).toBe(tenantId);
```