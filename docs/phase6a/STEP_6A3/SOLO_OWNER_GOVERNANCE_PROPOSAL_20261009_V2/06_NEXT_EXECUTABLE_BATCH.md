# BATCH-6A3-L01 — verificación ejecutable del contrato vigente

Estado inicial: AUTHORIZED_LOCAL_TESTS por mandato humano2026-10-09; no aprobación de SOG v2 ni publicación. Master activo v1.7. Task packet de este lote: añadir sólo apps/backend/src/core-grc/phase6a-methodology-boundaries.test.ts con pruebas locales en memoria para límites existentes de metodologías y configuración. Diagnóstico HTTP temporal permitido: apps/backend/src/core-grc/sog-v2-local-findings.test.ts, retirado al finalizar, usando Fastify.inject sin listen/red ni BD.

Fuentes cerradas: docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md:5 y :7; rector22 default DENY y separación tenant/platform; rector45:13..17 y :38..44. Comportamiento: permiso+scope+entitlement para catálogo; cursores tenant/domain; create mantiene EC opcional y validación same-tenant/domain; Controls calcula min y aplica coverage tipada; histórico conserva metodología. No se publica configuration_mode=none. El diagnóstico comprueba la ruta HTTP realmente registrada sin afirmar capability nueva.

Preflight: root/HEAD/branch/índice/diff/hashes capturados; rector íntegro; rutas nuevas ausentes; Node22.23.2/dependencias ya instaladas; sin credenciales/variables de integración ni conexión. Tests usan actores y respuestas efímeros en memoria, nunca tenants reales ni seeds/grants. El adaptador de pruebas no posee driver/socket y rechaza consultas imprevistas.

Autorizado: pruebas del lote, typecheck/lint backend sin emisión, contracts --check y rector. Prohibido: modificar cualquier archivo heredado, código runtime, contracts publicados, permisos/grants, migraciones, BD, QA/IAM/infra, imports, Git y deploy. Los owners siguen humanos y no se firman gates. Rollback local: retirar únicamente el archivo nuevo de este lote por hash; no reset/stash/clean ni revertir trabajo ajeno. Se registrarán resultados reales y patch del archivo nuevo, sin reclamar E2E/QA o autosuficiencia completa.

## Resultado real del primer lote mínimo independiente

`BATCH-6A3-L01=APPLIED_TEST_ONLY_AND_PASS`. Archivo nuevo `apps/backend/src/core-grc/phase6a-methodology-boundaries.test.ts` (SHA-256 `8d76b8470ff28a133c9cc822e024842cb4c9e8a36a282b4d9e4552f960a4d9ec`),16 tests;0 archivos runtime modificados. La autorización fue el mandato actual para pruebas locales y artefactos reversibles de6A.3, no una aprobaciónSOG ni gate humano. Criterios: guardas permiso/scope/entitlement del catálogo y cursor tenant/domain, contrato EC opcional/compatibilidad y aritmética/coverage/no-data del método actual. Se suman22 unit existentes y1 diagnóstico temporal;39 PASS finales. Typecheck/lint, rector, contracts --check y diff PASS. Cada prueba observa resultado/error/ausencia de operación posterior; no se inventa un método operativo nuevo.

**Preflight y rollback:** hashes de1.287 archivos heredados/HEAD/índice/diff capturados antes del lote; paths nuevos comprobados ausentes. Node22.23.2 existente. Adaptadores de memoria rechazan queries inesperadas y no tienen driver/pool/socket; no se usaron tenants o identidades reales, seeds o grants. Rollback acotado: retirar solamente el archivo nuevo deL01 por su hash y los artefactos propios si se autoriza; ningún revert/reset/clean/stash sobre trabajo ajeno. El test temporal ya fue retirado, dejando sólo código nuevo de pruebas durables.

**Siguiente lote de comportamiento empresarial: BLOCKED_CONTRACT_PUBLICATION_ONLY.** CT01/03/04 necesitan C-01..08/D01/D02 y contratos/permisos publicados antes de endpoints. CT02 no permite publicar none por NULL y la propuesta422 requiere delta sobre EC opcional. Vocab52/14/26 requiere manifest/versionado/inventario autorizado; UQ/default requiere gate físico y autorizaciónDDL distinta. Fuente exacta: rector22:85/:89,45:75,46:60; documentos27:134,28:30/:34,30:75/:77. No se paralizan análisis, diseños o pruebas del contrato vigente. No hay permiso para hacer adopción de formularios6A.4, cambiar frontend por comodidad o introducir un binding artificial para forzar avance.

No se entrega un parche de endpoints/grants que dependa de contratos no aprobados. El diff verificable independiente aplicado es el test-only siguiente; no se presenta como implementación de una capability pendiente.

## Patch técnico exacto deL01 — aplicado sólo al archivo nuevo de pruebas

```diff
--- /dev/null
+++ b/apps/backend/src/core-grc/phase6a-methodology-boundaries.test.ts
@@ -0,0 +1,196 @@
+import { describe, expect, it, vi } from "vitest";
+import { PostgresQueryCompiler, type Transaction } from "kysely";
+import type { FoundationDatabase } from "../database.js";
+import { newUuidV7 } from "../uuid.js";
+import { listMethodologies, type MethodologyDomain } from "./methodologies.js";
+import type { CoreActor } from "./model.js";
+import { mutations } from "./service.js";
+
+// In-memory domain evidence only: this adapter has no pool, driver or socket.
+type Query = { sql: string; parameters: readonly unknown[] };
+type Row = Record<string, unknown>;
+function executor(handler: (query: Query) => { rows: Row[] }) {
+  const compiler = new PostgresQueryCompiler();
+  const executeQuery = vi.fn(handler);
+  return {
+    database: {
+      executeQuery,
+      getExecutor: () => ({
+        transformQuery: (node: unknown) => node,
+        compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
+        executeQuery
+      })
+    } as unknown as Transaction<FoundationDatabase>,
+    executeQuery
+  };
+}
+
+function actor(): CoreActor {
+  const permissions = ["compliance.methodology.read", "controls.methodology.read", "controls.control_assessment.submit"];
+  return {
+    tenantId: newUuidV7(), membershipId: newUuidV7(), userIdentityId: newUuidV7(),
+    permissions: new Set(permissions), scopes: new Set(["tenant"]),
+    permissionScopes: new Map(permissions.map(permission => [permission, new Set(["tenant"] as const)])),
+    capabilityGroups: new Set(["ISO_COMPLIANCE", "CONTROLS_ASSURANCE"]), roles: []
+  };
+}
+
+function method(domain: MethodologyDomain, minimumCoverage = 80): Row {
+  return {
+    methodology_version_ref: newUuidV7(), methodology_code: domain === "compliance" ? "BASELINE_COMPLIANCE" : "BASELINE_CONTROL_EFFECTIVENESS",
+    version_number: 1, name: "Methodology fixture", minimum_coverage: minimumCoverage,
+    ...(domain === "compliance" ? { partial_compliance_factor: 0.5 } : {}),
+    formula_definition_id: newUuidV7(), rector_source: "unit fixture", rector_version: "unit fixture",
+    effective_from: new Date(0), effective_to: null, published_at: new Date(0)
+  };
+}
+
+describe("STEP6A.3 existing methodology catalog authority", () => {
+  it.each(["compliance", "controls"] as const)("denies %s catalog without its permission before database execution", async domain => {
+    const principal = actor();
+    const db = executor(() => { throw new Error("No database query expected"); });
+    await expect(listMethodologies(db.database, { ...principal, permissions: new Set() }, domain, {}))
+      .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });
+    expect(db.executeQuery).not.toHaveBeenCalled();
+  });
+
+  it.each(["compliance", "controls"] as const)("denies %s catalog without entitlement or with only platform scope", async domain => {
+    const principal = actor();
+    const db = executor(() => { throw new Error("No database query expected"); });
+    for (const candidate of [
+      { ...principal, capabilityGroups: new Set<string>() },
+      { ...principal, permissionScopes: new Map([[`${domain}.methodology.read`, new Set(["platform"] as const)]]) }
+    ]) {
+      await expect(listMethodologies(db.database, candidate, domain, {}))
+        .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });
+    }
+    expect(db.executeQuery).not.toHaveBeenCalled();
+  });
+
+  it.each(["tenant", "domain"] as const)("rejects cursor reuse after a %s change before another database execution", async change => {
+    const principal = actor();
+    const db = executor(() => ({ rows: [method("compliance"), method("compliance")] }));
+    const page = await listMethodologies(db.database, principal, "compliance", { "page[size]": 1 });
+    expect(page.page.has_more).toBe(true);
+    expect(page.page.next_cursor).not.toBeNull();
+    const candidate = change === "tenant" ? { ...principal, tenantId: newUuidV7() } : principal;
+    await expect(listMethodologies(db.database, candidate, change === "domain" ? "controls" : "compliance", { "page[cursor]": page.page.next_cursor }))
+      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400 });
+    expect(db.executeQuery).toHaveBeenCalledTimes(1);
+  });
+});
+
+describe("STEP6A.3 existing optional assessment configuration", () => {
+  it.each(["compliance", "controls"] as const)("preserves %s absence as NULL without reading EC or declaring none", async domain => {
+    const principal = actor();
+    const definition = mutations.get(domain === "compliance" ? "requirementAssessmentCreate" : "controlAssessmentCreate")!;
+    let persisted: Row | undefined;
+    const db = executor(query => {
+      if (query.sql.includes("FROM config.effective_configurations")) throw new Error("Absent EC must not be resolved");
+      if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [method(domain)] };
+      if (query.sql.trimStart().startsWith("SELECT 1 AS found")) return { rows: [{ found: 1 }] };
+      if (query.sql.startsWith("INSERT INTO")) {
+        const columns = [...query.sql.matchAll(/"([a-z_]+)"/g)].map(match => match[1]!);
+        persisted = Object.fromEntries(columns.map((column, index) => [column, query.parameters[index]]));
+        return { rows: [persisted] };
+      }
+      throw new Error(`Unexpected query: ${query.sql}`);
+    });
+    const body = domain === "compliance"
+      ? { methodology_version_ref: newUuidV7(), requirement_applicability_id: newUuidV7() }
+      : { methodology_version_ref: newUuidV7(), control_id: newUuidV7(), control_version_id: newUuidV7() };
+    await definition.execute({ transaction: db.database, actor: principal, body });
+    expect(persisted).toMatchObject({ tenant_id: principal.tenantId, methodology_version_ref: body.methodology_version_ref, effective_configuration_id: null });
+    expect(persisted).not.toHaveProperty("configuration_mode");
+  });
+
+  it.each(["compliance", "controls"] as const)("accepts compatible EC for %s under the current contract, rather than publishing none", async domain => {
+    const definition = mutations.get(domain === "compliance" ? "requirementAssessmentCreate" : "controlAssessmentCreate")!;
+    const principal = actor();
+    const ecId = newUuidV7();
+    let persisted: Row | undefined;
+    const db = executor(query => {
+      if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [method(domain)] };
+      if (query.sql.includes("FROM config.effective_configurations")) {
+        expect(query.parameters).toEqual([ecId, principal.tenantId, domain]);
+        return { rows: [{ effective_configuration_id: ecId }] };
+      }
+      if (query.sql.trimStart().startsWith("SELECT 1 AS found")) return { rows: [{ found: 1 }] };
+      if (query.sql.startsWith("INSERT INTO")) {
+        const columns = [...query.sql.matchAll(/"([a-z_]+)"/g)].map(match => match[1]!);
+        persisted = Object.fromEntries(columns.map((column, index) => [column, query.parameters[index]]));
+        return { rows: [persisted] };
+      }
+      throw new Error(`Unexpected query: ${query.sql}`);
+    });
+    const body = domain === "compliance"
+      ? { methodology_version_ref: newUuidV7(), requirement_applicability_id: newUuidV7(), effective_configuration_id: ecId }
+      : { methodology_version_ref: newUuidV7(), control_id: newUuidV7(), control_version_id: newUuidV7(), effective_configuration_id: ecId };
+    await definition.execute({ transaction: db.database, actor: principal, body });
+    expect(persisted).toMatchObject({ effective_configuration_id: ecId });
+  });
+
+  it.each(["compliance", "controls"] as const)("rejects incompatible %s EC before assessment persistence", async domain => {
+    const definition = mutations.get(domain === "compliance" ? "requirementAssessmentCreate" : "controlAssessmentCreate")!;
+    const db = executor(query => {
+      if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [method(domain)] };
+      if (query.sql.includes("FROM config.effective_configurations")) return { rows: [] };
+      throw new Error("No persistence or later reference resolution expected");
+    });
+    await expect(definition.execute({ transaction: db.database, actor: actor(), body: { methodology_version_ref: newUuidV7(), effective_configuration_id: newUuidV7() } }))
+      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400 });
+    expect(db.executeQuery).toHaveBeenCalledTimes(2);
+  });
+});
+
+function submissionFixture(minimumCoverage: number) {
+  const principal = actor();
+  const id = newUuidV7();
+  const methodId = newUuidV7();
+  const definition = mutations.get("controlAssessmentSubmit")!;
+  let saved: Row | undefined;
+  const db = executor(query => {
+    if (query.sql.startsWith("SELECT") && query.sql.includes("FROM controls.control_assessments t")) {
+      return { rows: [{ control_assessment_id: id, methodology_version_ref: methodId, effective_configuration_id: null, row_version: 1, lifecycle_state: "in_progress" }] };
+    }
+    if (query.sql.includes("WITH current_edges")) return { rows: [{ to_state: "completed", audit_event_code: definition.auditEvent, sod_policy_ref: "none", scope_kind: "tenant" }] };
+    if (query.sql.includes("JOIN data.formula_definitions")) return { rows: [{ ...method("controls", minimumCoverage), methodology_version_ref: methodId }] };
+    if (query.sql.startsWith("UPDATE controls.control_assessments SET")) {
+      const assignments = [...query.sql.matchAll(/"([a-z_]+)"=\$(\d+)/g)];
+      saved = Object.fromEntries(assignments.map(match => [match[1]!, query.parameters[Number(match[2]) - 1]]));
+      return { rows: [{ ...saved, control_assessment_id: id, row_version: 2 }] };
+    }
+    throw new Error(`Unexpected query: ${query.sql}`);
+  });
+  return { run: (body: Row) => definition.execute({ transaction: db.database, actor: principal, targetId: id, body: { expected_version: 1, ...body } }), saved: () => saved };
+}
+
+describe("STEP6A.3 existing Controls calculation, not methodological signoff", () => {
+  it("calculates the conservative minimum with EC absent", async () => {
+    const fixture = submissionFixture(80);
+    await fixture.run({ result_status: "valid", domain_conclusion: "effective", design_effectiveness: 90, operating_effectiveness: 70, coverage_percent: 80 });
+    expect(fixture.saved()).toMatchObject({ overall_effectiveness: 70, result_status: "valid", coverage_percent: 80 });
+  });
+
+  it("uses the method's typed coverage threshold rather than assuming the baseline value", async () => {
+    const fixture = submissionFixture(90);
+    await expect(fixture.run({ result_status: "valid", domain_conclusion: "effective", design_effectiveness: 90, operating_effectiveness: 90, coverage_percent: 85 }))
+      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400 });
+    expect(fixture.saved()).toBeUndefined();
+  });
+
+  it("retains below-threshold preview as insufficient_coverage", async () => {
+    const fixture = submissionFixture(80);
+    await fixture.run({ result_status: "insufficient_coverage", design_effectiveness: 90, operating_effectiveness: 70, coverage_percent: 79 });
+    expect(fixture.saved()).toMatchObject({ overall_effectiveness: 70, result_status: "insufficient_coverage", coverage_percent: 79 });
+  });
+
+  it("preserves a measured zero without turning absent dimensions into zero", async () => {
+    const measured = submissionFixture(80);
+    await measured.run({ result_status: "valid", domain_conclusion: "ineffective", design_effectiveness: 0, operating_effectiveness: 90, coverage_percent: 80 });
+    expect(measured.saved()).toMatchObject({ overall_effectiveness: 0 });
+    const absent = submissionFixture(80);
+    await absent.run({ result_status: "no_data" });
+    expect(absent.saved()).toMatchObject({ overall_effectiveness: null, design_effectiveness: null, operating_effectiveness: null });
+  });
+});
```

## Diagnóstico temporal HTTP — código exacto para reproducción local

Se ejecutó como `apps/backend/src/core-grc/sog-v2-local-findings.test.ts` y fue retirado; hash `74a7784d8f8adb2fc63476448facbada61920b5daf677a7c2a7aff0a03cc46f7`. Para repetir, recrear sólo ese archivo temporal cuando no exista, usar el comando de04 y retirar únicamente ese archivo propio. No cambiar el test permanente para exigir que una futura capability siga ausente.

```ts
import { describe, expect, it, vi } from "vitest";
import type { Kysely } from "kysely";
import { readFileSync } from "node:fs";
import { buildApp } from "../app.js";
import type { FoundationDatabase } from "../database.js";
import { BlockedIdentityVerifier } from "../security/authentication.js";
import { UnavailableFileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";

describe("SOG v2 one-off local route finding", () => {
  it("distinguishes the published EC declaration from the routes actually registered by buildApp", async () => {
    const contract = readFileSync("docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml", "utf8");
    expect(contract).toContain('"/effective-configurations/{id}":');
    expect(contract).toContain("operationId: effectiveConfigurationGet");
    const executeQuery = vi.fn(() => { throw new Error("No database query authorized"); });
    const app = buildApp(async () => false, {
      database: { executeQuery } as unknown as Kysely<FoundationDatabase>,
      identityVerifier: new BlockedIdentityVerifier(),
      fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: "test"
    });
    try {
      await app.ready();
      expect(app.hasRoute({ method: "GET", url: "/api/v1/compliance-methodologies" })).toBe(true);
      expect(app.hasRoute({ method: "GET", url: "/api/v1/controls-methodologies" })).toBe(true);
      const url = `/api/v1/effective-configurations/${newUuidV7()}`;
      expect(app.hasRoute({ method: "GET", url })).toBe(false);
      const response = await app.inject({ method: "GET", url });
      expect(response.statusCode).toBe(404);
      expect(executeQuery).not.toHaveBeenCalled();
      const methodology = await app.inject({ method: "GET", url: "/api/v1/compliance-methodologies" });
      expect(methodology.statusCode).toBe(401);
      expect(executeQuery).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
```


## Continuidad ejecutiva 2026-10-09 — BATCH-6A3-L02

Task packet autorizado por el nuevo mandato humano «La dirección del PO autoriza análisis, edición local de código y pruebas locales no destructivas para STEP6A.3, así como preparación de delta rector y lotes de implementación». No se atribuye una aprobación de texto/hash, competencia o firma no pronunciada. La aprobación de dirección OWNER_FINAL_AUTHORITY está recibida; SOG v2 conserva su hash original y no está efectiva.

- Objetivo independiente cerrado: reforzar en el comando de assessment existente la separación tenant de las capas de una EC ya persistida; conservar EC opcional, owner domain, definición publicada y todos los parámetros metodológicos. Fuente activa: físico01:228–229 (misma tenant y lineage); ejecutable03:158 (EC y todas sus capas same tenant); ejecutable27:7 (compatibilidad de EC por tenant/domain); rector22:11 y §11 (DENY/scope desde relaciones canónicas). No se crea binding contextual ni configuration_mode.
- Archivos activos permitidos: apps/backend/src/core-grc/service.ts (sólo SQL de assertAssessmentConfiguration); apps/backend/src/core-grc/phase6a-configuration-integrity.test.ts (nuevo). Pruebas existentes, frontend, contratos y modelo físico permanecen intactos. Documentación: append mínimo en04/05/06 y campo separado de continuidad en07; sin tocar01,03,26 ni master.
- Criterio SQL: EC sólo se valida si su tenant coincide con actor y no existe una capa referenciada cuya tenant difiera de la EC. No inventar enums, parentescos, vigencia, defaults o configuración nueva; igualdad Definition/override adicional no se infiere aquí. Preservar la incompatibilidad como400 TCDX.VALIDATION.FAILED y ausencia comoNULL, nunca none. No calcular ni materializar EC al leer.
- Preflight: branch/HEAD/índice/diff y hashes de1.295 archivos heredados capturados; hash01 v2 coincide; rectorPASS. Node22.23.2 instalado. Sin conexión BD/red ni cambios de catálogo.
- Pruebas: reproducir diagnóstico EC404; ejecutar38 unit vigentes más1 diagnóstico=39; añadir SQL contract/negativas del guard existente. Probar candidato GET únicamente en copia temporal aislada sin escuchar sockets ni conectarBD si su exposición real sigue bloqueada. Los tests de adapter en memoria no prueban SQL/RLS en PostgreSQL.
- Exposición HTTP activa de GET EC: BLOCKED_OPERATION_SPECIFIC_RESPONSE_AND_OBJECT_POLICY_UNPUBLISHED. El permiso sí está publicado (ejecutable05:230; migration20260916000900:405–406); no se bloquea por una supuesta ausencia de permiso. OpenAPI02:6644 remite a contrato específico; el schema de proyección/códigos/policy en21§8 es DRAFT. Preparar patch DRAFT verificable sin registrar esa ruta en checkout activo.
- Owners: mandato PO de continuidad para lote local; aprobaciones específicas de contenido/contrato/seguridad no constan y siguenPENDING_REVIEW. Prohibidas activación, publicación, DDL/migraciones, QA/IAM/BD real, imports, Git/deploy y6A.4. Rollback: retirar sólo guardL02 por diff conocido y su test nuevo por hash, conservar todo cambio heredado. No usar reset/clean/stash.


### Resultado L02 y diff real activo

L02_LOCAL_DEFENSE=APPLIED; 43 PASS activos +24 PASS del candidato aislado +8 comprobaciones aritméticas separadas. Único cambio de runtime: SQL del guard EC en comando ya publicado; archivo nuevo de4 tests. No ruta ni grant publicado. El estado404 activo y200 candidato se distinguen en04/07.

```diff
diff --git a/apps/backend/src/core-grc/service.ts b/apps/backend/src/core-grc/service.ts
index 25e371a..e60738b 100644
--- a/apps/backend/src/core-grc/service.ts
+++ b/apps/backend/src/core-grc/service.ts
@@ -263,7 +263,14 @@ async function createApplicability({ transaction: tx, actor, body }: MutationCon
 async function assertAssessmentConfiguration(tx: Transaction<FoundationDatabase>, actor: CoreActor, body: Body, domain: string): Promise<void> {
   const id = optionalString(body, "effective_configuration_id");
   if (!id) return;
-  const result = await tx.executeQuery(CompiledQuery.raw(`SELECT ec.effective_configuration_id FROM config.effective_configurations ec JOIN config.configuration_definitions cd ON cd.configuration_definition_id=ec.configuration_definition_id WHERE ec.effective_configuration_id=$1::uuid AND ec.tenant_id=$2::uuid AND cd.owner_domain=$3 AND cd.lifecycle_state='published'`, [id, actor.tenantId, domain]));
+  const result = await tx.executeQuery(CompiledQuery.raw(`SELECT ec.effective_configuration_id
+    FROM config.effective_configurations ec
+    JOIN config.configuration_definitions cd ON cd.configuration_definition_id=ec.configuration_definition_id
+    WHERE ec.effective_configuration_id=$1::uuid AND ec.tenant_id=$2::uuid
+      AND cd.owner_domain=$3 AND cd.lifecycle_state='published'
+      AND NOT EXISTS (SELECT 1 FROM config.effective_configuration_layers layer
+        WHERE layer.effective_configuration_id=ec.effective_configuration_id
+          AND layer.tenant_id <> ec.tenant_id)`, [id, actor.tenantId, domain]));
   if (!result.rows.length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Configuration is not compatible with this tenant assessment", 400, false, { field: "effective_configuration_id" });
 }
 
```

### Candidato técnico GET EC — DRAFT, SIN APLICAR

Hash de este patch exacto UTF-8: `538f0a23afec7a4818f576f2a13d09d2ff1b03623d25b4676cfc64e8a5415a5b`. Aplicación **BLOCKED_OPERATION_SPECIFIC_RESPONSE_AND_OBJECT_POLICY_UNPUBLISHED**; no falta permiso. Gate de activación SOG independiente. Usa sólo path/operation/permiso/capability ya publicados; nuevas líneas viven únicamente en copia temporal. Sólo grant tenant habilita lectura; relaciones de organizational_unit/process/service/assigned_object/owned_object no se inventan. Metadata minimizada y códigos persistidos passthrough, sin tabla nueva, enum, configuración none, cálculo o snapshot. Orden ordinal del candidato sólo es presentación provisional; no resolución de precedencia ni certificación de ausencia de conflicto. DTO int64 numeric seguro falla cerrado fuera de precisión; cerrar representación contractual antes de publicar. Completar DTO/códigos/orden/409 contractuales y revisar delta antes de aplicar; el patch no autoriza una ampliación funcional.

**Próximo lote acotado L03 recomendado:** tras publicación humana real del DTO/ObjectPolicy/error/orden/códigos exactos, aplicar este cableado ajustado sólo al contrato aprobado a routes.ts y configuration/effective-read.ts y sus tests; ejecutar39+4 actuales y24 pruebas HTTP del candidato, typecheck/lint/rector/contratos y pruebas SQL autorizadas cuando haya ambiente. Preflight: hash/diff/HEAD/índice/catálogo actual, no sobrescribir paths existentes. Rollback: retirar sólo import/route/helper/test propios por diff/hash, preservar herencia; no DDL/QA/IAM/Git/deploy. No abre6A.4 ni publica44grants/52valores.

Para reproducir sólo pruebas del candidato: copiar apps/backend, tsconfig.base.json, vitest.config.ts y package.json a directorio temporal; enlazar node_modules raíz/apps-backend y packages/docs a dependencias/fuentes existentes de lectura; extraer este bloque a un patch y aplicarlo sólo a la copia. No aplicarlo al checkout gobernado antes del gate. Ejecutar Node22.23.2 con vitest explícito de effective-read.test.ts; ningún test abre socket o pool. Los resultados del mock no prueban ejecución SQL/RLS.

```diff
--- a/apps/backend/src/core-grc/routes.ts
+++ b/apps/backend/src/core-grc/routes.ts
@@ -15,6 +15,7 @@
 import { listTenantNormativeContent } from "../regulatory/tenant-read.js";
 import { listValidationAccessCandidates } from "../regulatory/validation-candidates.js";
 import { listMethodologies } from "./methodologies.js";
+import { readEffectiveConfiguration } from "../configuration/effective-read.js";
 import { listSelectableSubjects } from "./subject-read.js";
 import { subjectCreate } from "./subject-create.js";
 import { activatePack, listPackAssignments, packAssignmentDetail, packUuid, revokePack } from "../regulatory/pack-contract.js";
@@ -121,6 +122,12 @@
 ];
 
 export function registerCoreGrcRoutes(app: FastifyInstance, dependencies: CoreGrcDependencies): void {
+  app.get("/api/v1/effective-configurations/:id", async (request: FastifyRequest<{ Params: Params; Querystring: Record<string, unknown> }>, reply) => {
+    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
+    if (Object.keys(request.query).length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query", 400);
+    const result = await readEffectiveConfiguration(dependencies.database, actor, validId(request.params.id));
+    return { operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: correlation(reply), result };
+  });
   for (const domain of ["compliance", "controls"] as const) {
     app.get(`/api/v1/${domain}-methodologies`, async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>) => {
       const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
--- /dev/null
+++ b/apps/backend/src/configuration/effective-read.ts
@@ -0,0 +1,58 @@
+// DRAFT ONLY: operation-specific projection/policy approval required before use.
+import { CompiledQuery, type Kysely } from "kysely";
+import type { FoundationDatabase } from "../database.js";
+import { FoundationError } from "../errors.js";
+import type { CoreActor } from "../core-grc/model.js";
+import { requireAccess } from "../core-grc/security.js";
+
+type Resolution = {
+  effective_configuration_id: string; configuration_definition_id: string;
+  configuration_code: string; version_number: string | number;
+  resolved_for_subject_id: string | null; effective_at: Date | string;
+  resolved_at: Date | string; resolution_status: string; input_hash: string;
+};
+type Layer = {
+  tenant_id: string; configuration_definition_id: string;
+  configuration_override_id: string | null; precedence_level: string;
+  ordinal: number; was_selected: boolean;
+};
+
+export async function readEffectiveConfiguration(database: Kysely<FoundationDatabase>, actor: CoreActor, id: string) {
+  // No canonical relationship maps the narrower grants to this derived object yet.
+  // Candidate limits ALLOW to the existing tenant grant; never creator=owner.
+  requireAccess(actor, "configuration.effective_configuration.read", "CORE_PLATFORM", ["tenant"]);
+  const result = await database.executeQuery<Resolution>(CompiledQuery.raw(`
+    SELECT ec.effective_configuration_id,ec.configuration_definition_id,
+           cd.configuration_code,cd.version_number,ec.resolved_for_subject_id,
+           ec.effective_at,ec.resolved_at,ec.resolution_status,ec.input_hash
+      FROM config.effective_configurations ec
+      JOIN config.configuration_definitions cd ON cd.configuration_definition_id=ec.configuration_definition_id
+     WHERE ec.effective_configuration_id=$1::uuid AND ec.tenant_id=$2::uuid
+       AND NOT EXISTS (SELECT 1 FROM config.effective_configuration_layers layer
+         WHERE layer.effective_configuration_id=ec.effective_configuration_id AND layer.tenant_id <> ec.tenant_id)
+  `, [id, actor.tenantId]));
+  const row = result.rows[0];
+  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
+  const versionNumber = Number(row.version_number);
+  if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) {
+    throw new FoundationError("TCDX.INTERNAL.FAILURE", "Internal failure", 500);
+  }
+  const layers = await database.executeQuery<Layer>(CompiledQuery.raw(`
+    SELECT tenant_id,configuration_definition_id,configuration_override_id,
+           precedence_level,ordinal,was_selected
+      FROM config.effective_configuration_layers
+     WHERE effective_configuration_id=$1::uuid AND tenant_id=$2::uuid
+     ORDER BY ordinal,configuration_override_id
+  `, [id, actor.tenantId]));
+  // Stored strings are retained; no unpublished resolution/precedence enum is invented.
+  return {
+    effective_configuration_id: row.effective_configuration_id,
+    configuration_definition: { configuration_definition_id: row.configuration_definition_id,
+      configuration_code: row.configuration_code, version_number: versionNumber },
+    resolved_for_subject_id: row.resolved_for_subject_id,
+    effective_at: row.effective_at instanceof Date ? row.effective_at.toISOString() : row.effective_at,
+    resolved_at: row.resolved_at instanceof Date ? row.resolved_at.toISOString() : row.resolved_at,
+    resolution_status: row.resolution_status, input_hash: row.input_hash,
+    layers: layers.rows.map(({ tenant_id: _tenantId, ...layer }) => layer)
+  };
+}
--- /dev/null
+++ b/apps/backend/src/configuration/effective-read.test.ts
@@ -0,0 +1,161 @@
+import { describe, expect, it, vi } from "vitest";
+import { PostgresQueryCompiler, type Kysely } from "kysely";
+import { buildApp } from "../app.js";
+import type { FoundationDatabase } from "../database.js";
+import { FoundationError } from "../errors.js";
+import { UnavailableFileStoragePort } from "../ports/file-storage.js";
+import { newUuidV7 } from "../uuid.js";
+import type { VerifiedIdentity } from "../security/authentication.js";
+
+type Options = {
+  permission?: string; scope?: string; capability?: boolean; membership?: boolean;
+  found?: boolean; foreignLayer?: boolean; failRead?: boolean;
+  resolutionStatus?: string; versionNumber?: string;
+};
+function fixture(options: Options = {}) {
+  const tenantId = newUuidV7();
+  const configurationId = newUuidV7();
+  const definitionId = newUuidV7();
+  const identity: VerifiedIdentity = {
+    principalClass: "HUMAN_INTERACTIVE", principalId: newUuidV7(),
+    tokenId: newUuidV7(), expiresAt: new Date("2099-01-01T00:00:00.000Z")
+  };
+  const compiler = new PostgresQueryCompiler();
+  const executeQuery = vi.fn((query: { sql: string; parameters: readonly unknown[] }) => {
+    if (query.sql.includes("FROM iam.tenant_memberships")) {
+      expect(query.parameters).toEqual([tenantId, identity.principalId]);
+      return { rows: options.membership === false ? [] : [{ tenant_membership_id: newUuidV7() }] };
+    }
+    if (query.sql.includes("FROM iam.membership_roles")) return { rows: [
+      { permission_code: options.permission ?? "configuration.effective_configuration.read", scope_kind: options.scope ?? "tenant", role_code: "DATA_ADMIN" },
+      { permission_code: "controls.control.read", scope_kind: "tenant", role_code: "DATA_ADMIN" }
+    ] };
+    if (query.sql.includes("FROM platform.subscriptions")) return { rows: options.capability === false ? [] : [{ capability_group: "CORE_PLATFORM" }] };
+    if (query.sql.includes("FROM config.effective_configurations")) {
+      expect(query.parameters).toEqual([configurationId, tenantId]);
+      expect(query.sql).toContain("ec.tenant_id=$2::uuid");
+      expect(query.sql).toContain("layer.tenant_id <> ec.tenant_id");
+      if (options.failRead) throw new Error("private database hostname and secret must not escape");
+      return { rows: options.found === false || options.foreignLayer ? [] : [{
+        effective_configuration_id: configurationId, configuration_definition_id: definitionId,
+        configuration_code: "FIXTURE_ONLY", version_number: options.versionNumber ?? "1", resolved_for_subject_id: null,
+        effective_at: new Date(0), resolved_at: new Date(0),
+        resolution_status: options.resolutionStatus ?? "stored_fixture_status", input_hash: "a".repeat(64),
+        effective_text_value: "must not expose stored values", created_by_user_identity_id: identity.principalId
+      }] };
+    }
+    if (query.sql.includes("FROM config.effective_configuration_layers")) {
+      expect(query.parameters).toEqual([configurationId, tenantId]);
+      expect(query.sql).toContain("tenant_id=$2::uuid");
+      return { rows: [1, 2].map(ordinal => ({ tenant_id: tenantId, configuration_definition_id: definitionId,
+        configuration_override_id: null, precedence_level: "stored_fixture_level", ordinal, was_selected: ordinal === 2 })) };
+    }
+    throw new Error("Unexpected query; writes and transactions not available");
+  });
+  const database = {
+    executeQuery, getExecutor: () => ({ transformQuery: (node: unknown) => node,
+      compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId), executeQuery })
+  } as unknown as Kysely<FoundationDatabase>;
+  const verifyBearerToken = vi.fn(async (token: string) => {
+    if (token !== "local-fixture") throw new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);
+    return identity;
+  });
+  const app = buildApp(async () => false, { database, identityVerifier: { verifyBearerToken }, fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: "test" });
+  const url = `/api/v1/effective-configurations/${configurationId}`;
+  const headers = { authorization: "Bearer local-fixture", "x-tcdx-tenant-id": tenantId };
+  return { app, url, headers, executeQuery, verifyBearerToken, tenantId, configurationId };
+}
+function configReads(f: ReturnType<typeof fixture>) {
+  return f.executeQuery.mock.calls.filter(([q]) => q.sql.includes("FROM config.effective_configur"));
+}
+async function request(options: Options, expected: number, headers?: Record<string, string>, suffix = "") {
+  const f = fixture(options);
+  try {
+    const response = await f.app.inject({ method: "GET", url: f.url + suffix, headers: headers ?? f.headers });
+    expect(response.statusCode).toBe(expected);
+    if (expected >= 400) {
+      expect(response.headers["content-type"]).toContain("application/problem+json");
+      expect(response.json()).toMatchObject({ retryable: false, correlation_id: response.headers["x-correlation-id"] });
+    }
+    return { response, reads: configReads(f).length, calls: f.executeQuery.mock.calls.length };
+  } finally { await f.app.close(); }
+}
+
+describe("DRAFT EC handler local integration — not approved or registered in active checkout", () => {
+  it("returns 200 for the existing tenant permission and CORE_PLATFORM entitlement", async () => {
+    const { response } = await request({}, 200);
+    expect(response.json()).toMatchObject({ operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: response.headers["x-correlation-id"] });
+  });
+  it("minimizes attributes and returns the complete stored lineage without JSON values or actors", async () => {
+    const { response } = await request({}, 200); const result = response.json().result;
+    expect(Object.keys(result).sort()).toEqual(["effective_configuration_id", "configuration_definition", "resolved_for_subject_id", "effective_at", "resolved_at", "resolution_status", "input_hash", "layers"].sort());
+    expect(result.layers).toHaveLength(2); expect(result.layers[0]).not.toHaveProperty("tenant_id");
+    expect(result.configuration_definition.version_number).toBe(1);
+    expect(result.effective_at).toBe("1970-01-01T00:00:00.000Z");
+    expect(response.body).not.toContain("must not expose"); expect(response.body).not.toContain("created_by");
+  });
+  it("rejects a missing bearer with 401 before any database query", async () => {
+    expect((await request({}, 401, {})).calls).toBe(0);
+  });
+  it("rejects an invalid bearer with 401 before any database query", async () => {
+    expect((await request({}, 401, { authorization: "Bearer invalid" })).calls).toBe(0);
+  });
+  it("rejects missing tenant context with 403 before any database query", async () => {
+    expect((await request({}, 403, { authorization: "Bearer local-fixture" })).calls).toBe(0);
+  });
+  it("conceals a missing active membership with 404 before a configuration read", async () => {
+    expect((await request({ membership: false }, 404)).reads).toBe(0);
+  });
+  it("does not infer EC permission from a different permission", async () => {
+    expect((await request({ permission: "controls.control.read" }, 403)).reads).toBe(0);
+  });
+  it("denies permission without entitlement", async () => {
+    expect((await request({ capability: false }, 403)).reads).toBe(0);
+  });
+  it.each(["platform", "assigned_object", "owned_object", "organizational_unit", "process", "service"])("does not elevate unbound %s scope from another permission's tenant grant", async scope => {
+    expect((await request({ scope }, 403)).reads).toBe(0);
+  });
+  it("conceals an inaccessible EC with 404 and never loads layers", async () => {
+    expect((await request({ found: false }, 404)).reads).toBe(1);
+  });
+  it("fails closed when the root query excludes cross-tenant lineage", async () => {
+    expect((await request({ foreignLayer: true }, 404)).reads).toBe(1);
+  });
+  it("binds another legitimate selected tenant rather than reusing a prior response", async () => {
+    const first = fixture(); const second = fixture({ found: false });
+    try {
+      const good = await first.app.inject({ method: "GET", url: first.url, headers: first.headers }); expect(good.statusCode).toBe(200);
+      const concealed = await second.app.inject({ method: "GET", url: second.url, headers: second.headers }); expect(concealed.statusCode).toBe(404);
+      expect(first.tenantId).not.toBe(second.tenantId); expect(concealed.body).not.toContain(first.configurationId);
+    } finally { await first.app.close(); await second.app.close(); }
+  });
+  it("rejects malformed path UUID without reading EC", async () => {
+    const f = fixture();
+    try { const r = await f.app.inject({ method: "GET", url: "/api/v1/effective-configurations/not-a-uuid", headers: f.headers }); expect(r.statusCode).toBe(400); expect(configReads(f)).toHaveLength(0); }
+    finally { await f.app.close(); }
+  });
+  it("rejects contextual query parameters absent from the existing detail operation", async () => {
+    expect((await request({}, 400, undefined, "?methodology_version_ref=not-published")).reads).toBe(0);
+  });
+  it("sanitizes a backend failure instead of returning empty success", async () => {
+    const { response } = await request({ failRead: true }, 500);
+    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(response.body).not.toContain("private database");
+  });
+  it("preserves historical stored codes without aliasing them into proposed enums", async () => {
+    const { response } = await request({ resolutionStatus: "historical_fixture" }, 200);
+    expect(response.json().result.resolution_status).toBe("historical_fixture");
+  });
+  it.each(["9007199254740993", "0"])("does not silently corrupt stored version %s when producing the proposed numeric projection", async versionNumber => {
+    const { response, reads } = await request({ versionNumber }, 500);
+    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(reads).toBe(1);
+  });
+  it("repeats an idempotent read without writes, transactions or materialization", async () => {
+    const f = fixture();
+    try {
+      const first = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
+      const second = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
+      expect(first.statusCode).toBe(200); expect(second.statusCode).toBe(200); expect(first.json().result).toEqual(second.json().result);
+      expect(configReads(f)).toHaveLength(4);
+    } finally { await f.app.close(); }
+  });
+});
```


## Mandato GET EC / L03 — task packet de decisión mínima y trabajo independiente

El mandato actual autoriza diseño/código local/pruebas y prohíbe publicación contractual. GET EC continúa dependiente del delta21§8 no publicado; inspeccionar y verificar íntegro L03 heredado, conservarlo sin aplicar y redactar un único delta exacto. No se reabre SOG ni las48 cláusulas. Fuentes: OpenAPI02:3478–3501/6644–6652, matriz03:158, permiso05:230, rector45:33–44/68–81 y46:60.

Lote independiente **L03-TENANT-CONTEXT-VALIDATION**: proteger el tipo UUID ya contratado de X-TCDX-Tenant-Id antes de ejecutar un cast SQL. Fuentes OpenAPI02:4420–4426/4879–4882 y ejecutable06:30 (400 shape/type), rector22:11/§11. Mantener403 para contexto ausente/principal machine,404 idéntico para membership ausente, tenant/identity/estado/vigencia persistidos y permiso+scope+capability existentes. No imponer una versiónUUID nueva ni una nueva policy.

Archivos activos permitidos: apps/backend/src/security/tenant-context.ts (sólo validación sintáctica ya contratada); apps/backend/src/security/tenant-context.test.ts (nuevo). No modificar cambios heredados enservice/tests/UI, contratos ejecutables,21/26, baseline/manifiestos/master, BD/IAM/infra ni SOG01/03. Documentación: append mínimo en04/06 y nuevo objeto de ejecución en07; no nuevo paquete de gobernanza. Owners: mandato PO local, sin firma técnica simulada ni aceptación contractual inferida.

Preflight: main/HEAD/índice/diff y1.296 hashes preservados; rectorPASS; L03 original SHA538f0a23afec7a4818f576f2a13d09d2ff1b03623d25b4676cfc64e8a5415a5b verificado; rutas nuevas ausentes. Pruebas locales: reproducir defecto antes del fix; validar unidad/HTTP con executor sin driver/socket, suite43 activa y24 L03 heredado en copia temporal; typecheck/lint/rector/contratos/diff y scope. Rollback sólo líneas nuevas de validación/import y test propio por hash, sin descartar herencia. Operaciones de ambiente, publicación, Git/deploy y6A.4 prohibidas. Mocks no prueban PostgreSQL/RLS. ZIP fundacional no materializado entre archivos del repositorio; ZIP normativo reservado no abierto.


Extensión cerrada del lote local: apps/backend/src/app.ts, sólo emitir WWW-Authenticate: Bearer en errores401 existentes. Fuente ejecutable06:31: «missing or invalid JWT/trust validation; WWW-Authenticate: Bearer». No cambia el body, código, status, autenticación ni autorización. La prueba HTTP del lote comprueba ese header y el orden401 antes de tenant/SQL. Sin nuevo contrato o ruta. Rollback sólo esa línea adicional/import validación/test propio. No modificar archivos heredados adicionales.


### EC-DETAIL-READ-v1-L03-R1 — delta único propuesto

**DRAFT_NOT_APPROVED_NOT_PUBLISHED.** No modifica21, OpenAPI, permisos, runtime ni SOG. El permiso está publicado; el impedimento preciso es21:175: «la firma debe aprobar códigos concretos antes del schema executable», junto con el DTO aún propuesto21:157–173 y el orden21:177. Rector45:32–46 impide escoger estas alternativas como si ya estuvieran decididas. El mandato autoriza diseño/pruebas, excluye publicación. Un parche probado no cierra ese gate.

Fuentes abreviadas (todas locales):
- O = docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml.
- M = docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md.
- P = docs/executable-contracts/05_PERMISSION_CATALOG.md.
- E = docs/executable-contracts/06_ERROR_MODEL.md.
- F = docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md.
- D = docs/phase6a/STEP_6A3/21_P_CONFIG_BINDING_EVIDENCE_AND_ARCHITECTURE_OPTIONS.md.
- R22 = docs/rector/baseline/22_RBAC_PERMISSION_SCOPE_MATRIX.md.
- R29 = docs/rector/baseline/29_CONFIGURACION_PARAMETRIZACION_Y_EXTENSIBILIDAD.md.
- R45 = docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md.
- R46 = docs/rector/baseline/46_REGENTE_MAESTRO_DEL_DESARROLLO.md.

| Decisión | Estado actual | Fuente:línea / consecuencia |
|---|---|---|
| GET /api/v1/effective-configurations/{id}; effectiveConfigurationGet; sin endpoint alternativo | ALREADY_CONTRACTED | O:3478–3494; parámetros no incluyen discovery/contextual query. |
| Bearer, TenantContext, identidad/membership vigente; CORE_PLATFORM y permiso EC.read | ALREADY_CONTRACTED | O:3484–3487/3494/4420–4426; P:230. Seeds publicados database/migrations/20260916000900_canonical_seeds.sql:405–406. No permiso nuevo. |
| Root del tenant y todas las layers mismo tenant; Definition/Override global-compatible | ALREADY_CONTRACTED | M:158; F:224/227–229; R22:11. Nunca devolver sólo las capas que pasaron filtro. |
| ObjectPolicy completa del DTO y bindings de scopes estrechos | REQUIRES_CONTRACT_DELTA / UNRESOLVED | O:3487 sólo «tenant/scoped object»; D:157–175 propone lectura. No relación canónica demostrada para assigned/owned/org/process/service: permanecen DENY; no equiparar creator a owner. |
| Envelope, read-only, idempotencia, audit/domain NONE | ALREADY_CONTRACTED | O:3488–3491/6452–6462/6644–6652. La descripción exige contrato específico de respuesta. No escribir AuditEvent por este GET. |
| Campos, requiredness y whitelist cerrada de respuesta | REQUIRES_CONTRACT_DELTA | D:161–172 no publicado; F:224/228–229 fija origen/tipos físicos, no DTO HTTP. Schema literal debajo. |
| version_number positivo int64 representado como decimal string | REQUIRES_CONTRACT_DELTA | D:164/F:224. R1 conserva todo int64; L03 heredado numérico rechazaba9007199254740993 para evitar redondeo. No cambia columna ni otras operaciones. |
| Códigos originales bounded string, sin alias/enum nuevo en lectura histórica | REQUIRES_CONTRACT_DELTA | D:175 exige firma; F:228–229 varchar32. Propuesta modifica sólo exigencia de enum para este GET metadata; los enums/selector/resolución/writes siguen pendientes. No publica resolved/platform_default ni otros códigos. |
| Interpretación oficial de estados/niveles históricos | UNRESOLVED | D:175 códigos sólo propuestos. El GET propuesto conserva bytes; no interpreta ni valida elegibilidad, suficiencia o precedencia metodológica. |
| Orden de presentación y snapshot coherente, sin paginación | REQUIRES_CONTRACT_DELTA | D:177 ordena por ranking no publicado. R1 propone ordinal/raw code/tie-break y una sola sentencia; no altera R29:23/25 precedencia funcional. |
| 400/401/403/404, error envelope, conflicto explícito | ALREADY_CONTRACTED | O:3497–3501; E:30–34/45/47. Missing/foreign/out-of-scope idéntico404.401 Bearer challenge. |
| Cuándo devolver409 frente a200 con status conflict persistido;500 por corrupción | REQUIRES_CONTRACT_DELTA | M:158/E:34/45/47/F:229; cerrar comportamiento concreto por esta propuesta. No422 para lectura de metadata. |
| Headers no-store/Vary; minimización sin atributos administrativos | REQUIRES_CONTRACT_DELTA | D:177 propone minimización; evitar reutilización de metadata entre identidades/contextos. No autorización por cache. |

**Texto normativo exacto propuesto (cláusulas EC-R1.1..8; autoridad requerida: decisión humana específica de contrato, sin firmas imputadas):**

1. **EC-R1.1 Operación y autorización.** La única operación es effectiveConfigurationGet, GET /api/v1/effective-configurations/{id}, sólo lectura de EC persistida, sin query contextual ni discovery. Bearer humano válido, TenantContext seleccionado y membership vigente son requisitos; CORE_PLATFORM y configuration.effective_configuration.read son acumulativos. No se conceden permisos/grants. ObjectPolicy de este delta admite sólo un grant tenant de ese permiso sobre el tenant persistido del actor. Scopes platform/assigned_object/owned_object/organizational_unit/process/service sin binding publicado para esta proyección permanecen DENY, incluso si otro permiso tiene grant tenant; no se amplían scopes ni se finge que quedaron implementados.

2. **EC-R1.2 Aislamiento y historia.** Buscar EC por (id,tenant del actor), Definition raíz y Definitions/Overrides de todas las layers del mismo tenant o global-compatible; todas las layers de la EC deben tener el tenant raíz. Si cualquier referencia resulta inaccesible o la EC no existe, no devolver metadata parcial:404 idéntico. No usar lifecycle actual, reloj ni publicación actual para reinterpretar la vigencia histórica de referencias existentes; no declarar legalmente aplicable, seleccionar nueva EC ni inferir binding Methodology→Definition/Subject/effective_at. FKs físicas existentes siguen exigidas. La SQL candidata comprueba tenant/global ownership; ejecución real RLS y constraints no demostrada en esta ejecución.

3. **EC-R1.3 Respuesta cerrada.** Envelope operation_id=effectiveConfigurationGet, status=completed, correlation_id UUID y result obligatorio. Result contiene exclusivamente ocho campos: effective_configuration_id UUID; configuration_definition objeto con configuration_definition_id UUID, configuration_code string1..128 y version_number decimal string positiva1..9223372036854775807; resolved_for_subject_id UUID|null; effective_at y resolved_at date-time UTC con Z; resolution_status string de longitud0..32; input_hash hexadecimal64 preservando mayúsculas/minúsculas; layers array íntegro de objetos cerrados con configuration_definition_id UUID, configuration_override_id UUID|null, precedence_level string0..32, ordinal entero1..2147483647 y was_selected boolean. Todos los campos son required, null sólo donde se indica. No tenantId, layerId, identityId, email, roles, actor, typed values, secretos o JSON persistido. UUID identifica referencias técnicas de API, no presentación empresarial. El schema literal anexo es parte del texto propuesto.

4. **EC-R1.4 Códigos históricos y ausencia.** resolution_status/precedence_level son códigos originales persistidos bounded string; no enum cerrado nuevo ni alias, traducción o cambio de valor. Este delta sustituiría la condición D:175 sólo para lectura histórica minimizada; cualquier interpretación operativa/selector/resolución/escritura requiere su contrato y enum competente. Una EC persistida con status de conflicto u otro código desconocido se devuelve200 con su código literal, sin resultado oficial ni valor efectivo. EC inexistente404; EC existente sin layers devuelve layers=[], sin fabricar default, none, resolved o empty success frente a error. La lectura no resuelve ni evalúa autosuficiencia.

5. **EC-R1.5 Coherencia y orden.** Leer root+Definition+todas las layers y verificar ownership en una sentencia SQL, usando el snapshot de esa sentencia, sin escrituras/transaction de comando ni dos lecturas que puedan divergir. Devolver todas las layers sin paginación/truncamiento. Orden exclusivamente de presentación: ordinal ascendente, precedence_level textual COLLATE C ascendente, configuration_override_id ascendente con NULL primero, effective_configuration_layer_id ascendente como último desempate interno no expuesto. No emplear ranking propuesto platform_default/metodología/tenant/object. Este orden sustituiría D:177 sólo en el detalle; no altera precedencia de resolución R29 ni recalcula was_selected.

6. **EC-R1.6 Errores y conflictos.** Envelope de E/O vigente.400 TCDX.VALIDATION.FAILED para id/tenant sintácticamente inválido o query no permitida;401 REQUIRED/INVALID y WWW-Authenticate: Bearer;403 AUTHORIZATION.DENIED para contexto ausente, machine, entitlement/permiso/scope no autorizado;404 RESOURCE.NOT_FOUND y mensaje Resource not found para ausencia/objeto inaccesible/membership no vigente. Denegación de permiso precede lectura del objeto. Duplicado de (precedence_level,ordinal) o más de un was_selected=true en el mismo nivel viola F:229:409 TCDX.CONFLICT.RESOURCE, sin escoger ganador por orden. No confundir ese conflicto estructural con resolution_status persistido (EC-R1.4).500 TCDX.INTERNAL.FAILURE sanitizado para fallo inesperado/corrupción de metadata requerida o versión fuera de int64; no retornar[]/200 ante fallo ni filtrar SQL/stack. Propuesta documenta respuesta500 de esta operación con ErrorEnvelope existente O:5478/E:45. No exige resultado oficial, no introduce422 ni código nuevo. Orden de autenticación/contexto/permiso existente conservado.

7. **EC-R1.7 Cache y trazabilidad.** Cache-Control: no-store; Vary: Authorization, X-TCDX-Tenant-Id. Preservar correlation/request IDs y telemetría protegida de error. audit/domain NONE según operación publicada; ninguna escritura de auditoría simulada. Lectura NATURALLY_IDEMPOTENT y RO. Repetición no materializa, modifica, selecciona o crea snapshots ni consume Idempotency-Key de comando.

8. **EC-R1.8 Límites y activación.** Este delta no publica permisos, grants, códigos o vocabularios, no modifica metodologías, EC opcional, configuration_mode, modelo físico, UQ/default, IAM, UI, QA/BD, SOG ni fases. La decisión específica y la publicación versionada del contrato son actos separados de aplicación local de L03-R1 y de despliegue. Ninguno está realizado por este documento. SOG v2 permanece DRAFT. No habilitar GET activo antes del gate contractual; PostgreSQL/RLS y aceptación runtime real quedan pendientes sin PASS ficticio.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EffectiveConfigurationDetailReadResult-v1-L03-R1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "operation_id",
    "status",
    "correlation_id",
    "result"
  ],
  "properties": {
    "operation_id": {
      "const": "effectiveConfigurationGet"
    },
    "status": {
      "const": "completed"
    },
    "correlation_id": {
      "type": "string",
      "format": "uuid"
    },
    "result": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "effective_configuration_id",
        "configuration_definition",
        "resolved_for_subject_id",
        "effective_at",
        "resolved_at",
        "resolution_status",
        "input_hash",
        "layers"
      ],
      "properties": {
        "effective_configuration_id": {
          "type": "string",
          "format": "uuid"
        },
        "configuration_definition": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "configuration_definition_id",
            "configuration_code",
            "version_number"
          ],
          "properties": {
            "configuration_definition_id": {
              "type": "string",
              "format": "uuid"
            },
            "configuration_code": {
              "type": "string",
              "minLength": 1,
              "maxLength": 128
            },
            "version_number": {
              "type": "string",
              "pattern": "^(?:[1-9][0-9]{0,17}|[1-8][0-9]{18}|9[0-1][0-9]{17}|92[0-1][0-9]{16}|922[0-2][0-9]{15}|9223[0-2][0-9]{14}|92233[0-6][0-9]{13}|922337[0-1][0-9]{12}|92233720[0-2][0-9]{10}|922337203[0-5][0-9]{9}|9223372036[0-7][0-9]{8}|92233720368[0-4][0-9]{7}|922337203685[0-3][0-9]{6}|9223372036854[0-6][0-9]{5}|92233720368547[0-6][0-9]{4}|922337203685477[0-4][0-9]{3}|9223372036854775[0-7][0-9]{2}|922337203685477580[0-6]|9223372036854775807)$",
              "description": "Decimal canónico, sin ceros iniciales, rango 1..9223372036854775807; nunca number JSON."
            }
          }
        },
        "resolved_for_subject_id": {
          "anyOf": [
            {
              "type": "string",
              "format": "uuid"
            },
            {
              "type": "null"
            }
          ]
        },
        "effective_at": {
          "type": "string",
          "format": "date-time",
          "pattern": "Z$"
        },
        "resolved_at": {
          "type": "string",
          "format": "date-time",
          "pattern": "Z$"
        },
        "resolution_status": {
          "type": "string",
          "maxLength": 32
        },
        "input_hash": {
          "type": "string",
          "pattern": "^[0-9a-fA-F]{64}$"
        },
        "layers": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "configuration_definition_id",
              "configuration_override_id",
              "precedence_level",
              "ordinal",
              "was_selected"
            ],
            "properties": {
              "configuration_definition_id": {
                "type": "string",
                "format": "uuid"
              },
              "configuration_override_id": {
                "anyOf": [
                  {
                    "type": "string",
                    "format": "uuid"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "precedence_level": {
                "type": "string",
                "maxLength": 32
              },
              "ordinal": {
                "type": "integer",
                "minimum": 1,
                "maximum": 2147483647
              },
              "was_selected": {
                "type": "boolean"
              }
            }
          }
        }
      }
    }
  }
}
```

SHA-256 del texto normativo EC-R1.1..8 + tabla/fuentes + schema (bytes UTF-8 de bloque desde `### EC-DETAIL-READ-v1-L03-R1` hasta el cierre del JSON y newline): **159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163**. No es hash de SOG ni firma humana.

**Única decisión humana material pendiente:** «Adoptar como delta contractual de GET effectiveConfigurationGet el texto EC-DETAIL-READ-v1-L03-R1 y su schema identificados por SHA-256 159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163: proyección cerrada, int64 decimal string, ObjectPolicy tenant con scopes no vinculados DENY, lectura histórica de códigos sin enums nuevos, orden sólo de presentación, conflictos estructurales409 y metadata persistida200. Mantener separados su publicación versionada y la autorización de integrar L03-R1; no autorizar grants, DDL, QA o deploy mediante esta decisión». Texto para revisión; no se atribuye aprobación, identidad, fecha ni competencia. No requiere repetir dirección funcional del PO/SOG/48 cláusulas.

La política contractual futura que permita integración debe registrarse según R45:32–46/R46:60; el mandato actual excluye publicación. No aplicar el parche mientras ese contrato siga candidato.

### Parche refinado L03-R1 listo, NO APLICADO

SHA-256 parche UTF-8: 2cc0bd41aa88d3f04a4ef921a39d9b6aa04c05d27b4334f3a56a651fb50c2635. Contra routes.ts activo preservado, añade sólo lector/test desacoplados y cablea la única ruta publicada. No incluye cambios activos app/tenant-context ya implementados ni altera patch heredado538f0a23…; diffs explícitos: int64 string en lugar de número rechazado, una sentencia en vez de dos lecturas, conflictos físicos explícitos, orden sólo de presentación, cache no-store/Vary.31/31 PASS en copia temporal; mocks no prueban SQL/RLS real.

```diff
diff --git a/apps/backend/src/core-grc/routes.ts b/apps/backend/src/core-grc/routes.ts
--- a/apps/backend/src/core-grc/routes.ts
+++ b/apps/backend/src/core-grc/routes.ts
@@ -15,6 +15,7 @@
 import { listTenantNormativeContent } from "../regulatory/tenant-read.js";
 import { listValidationAccessCandidates } from "../regulatory/validation-candidates.js";
 import { listMethodologies } from "./methodologies.js";
+import { readEffectiveConfiguration } from "../configuration/effective-read.js";
 import { listSelectableSubjects } from "./subject-read.js";
 import { subjectCreate } from "./subject-create.js";
 import { activatePack, listPackAssignments, packAssignmentDetail, packUuid, revokePack } from "../regulatory/pack-contract.js";
@@ -121,6 +122,13 @@
 ];
 
 export function registerCoreGrcRoutes(app: FastifyInstance, dependencies: CoreGrcDependencies): void {
+  app.get("/api/v1/effective-configurations/:id", async (request: FastifyRequest<{ Params: Params; Querystring: Record<string, unknown> }>, reply) => {
+    reply.header("cache-control", "no-store").header("vary", "Authorization, X-TCDX-Tenant-Id");
+    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
+    if (Object.keys(request.query).length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query", 400);
+    const result = await readEffectiveConfiguration(dependencies.database, actor, validId(request.params.id));
+    return { operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: correlation(reply), result };
+  });
   for (const domain of ["compliance", "controls"] as const) {
     app.get(`/api/v1/${domain}-methodologies`, async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>) => {
       const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
diff --git a/apps/backend/src/configuration/effective-read.ts b/apps/backend/src/configuration/effective-read.ts
--- /dev/null
+++ b/apps/backend/src/configuration/effective-read.ts
@@ -0,0 +1,74 @@
+// DRAFT L03-R1: requires the exact EC detail contract delta before integration.
+import { CompiledQuery, type Kysely } from "kysely";
+import type { FoundationDatabase } from "../database.js";
+import { FoundationError } from "../errors.js";
+import type { CoreActor } from "../core-grc/model.js";
+import { requireAccess } from "../core-grc/security.js";
+
+type ResolutionRow = {
+  effective_configuration_id: string; configuration_definition_id: string;
+  configuration_code: string; version_number: string;
+  resolved_for_subject_id: string | null; effective_at: Date | string;
+  resolved_at: Date | string; resolution_status: string; input_hash: string;
+  layer_id: string | null; layer_definition_id: string | null;
+  configuration_override_id: string | null; precedence_level: string | null;
+  ordinal: number | null; was_selected: boolean | null;
+};
+export async function readEffectiveConfiguration(database: Kysely<FoundationDatabase>, actor: CoreActor, id: string) {
+  requireAccess(actor, "configuration.effective_configuration.read", "CORE_PLATFORM", ["tenant"]);
+  // One statement snapshot: do not validate a root and then read different layers.
+  const result = await database.executeQuery<ResolutionRow>(CompiledQuery.raw(`
+    SELECT ec.effective_configuration_id,ec.configuration_definition_id,
+           cd.configuration_code,cd.version_number::text AS version_number,
+           ec.resolved_for_subject_id,ec.effective_at,ec.resolved_at,ec.resolution_status,ec.input_hash,
+           l.effective_configuration_layer_id AS layer_id,l.configuration_definition_id AS layer_definition_id,
+           l.configuration_override_id,l.precedence_level,l.ordinal,l.was_selected
+      FROM config.effective_configurations ec
+      JOIN config.configuration_definitions cd ON cd.configuration_definition_id=ec.configuration_definition_id
+      LEFT JOIN config.effective_configuration_layers l
+        ON l.effective_configuration_id=ec.effective_configuration_id AND l.tenant_id=ec.tenant_id
+     WHERE ec.effective_configuration_id=$1::uuid AND ec.tenant_id=$2::uuid
+       AND (cd.tenant_id IS NULL OR cd.tenant_id=ec.tenant_id)
+       AND NOT EXISTS (
+         SELECT 1 FROM config.effective_configuration_layers layer
+         LEFT JOIN config.configuration_definitions ld ON ld.configuration_definition_id=layer.configuration_definition_id
+         LEFT JOIN config.configuration_overrides lo ON lo.configuration_override_id=layer.configuration_override_id
+         WHERE layer.effective_configuration_id=ec.effective_configuration_id
+           AND (layer.tenant_id <> ec.tenant_id
+             OR (ld.tenant_id IS NOT NULL AND ld.tenant_id <> ec.tenant_id)
+             OR (lo.tenant_id IS NOT NULL AND lo.tenant_id <> ec.tenant_id))
+       )
+     ORDER BY l.ordinal ASC NULLS LAST,l.precedence_level COLLATE "C" ASC NULLS LAST,
+              l.configuration_override_id ASC NULLS FIRST,l.effective_configuration_layer_id ASC NULLS LAST
+  `, [id, actor.tenantId]));
+  const row = result.rows[0];
+  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
+  if (!/^[1-9][0-9]{0,18}$/.test(row.version_number) || BigInt(row.version_number) > 9223372036854775807n) {
+    throw new FoundationError("TCDX.INTERNAL.FAILURE", "Internal failure", 500);
+  }
+  const keys = new Set<string>();
+  const selectedLevels = new Set<string>();
+  const layers = result.rows.filter(layer => layer.layer_id !== null).map(layer => {
+    if (layer.layer_definition_id === null || layer.precedence_level === null || layer.ordinal === null || layer.was_selected === null) {
+      throw new FoundationError("TCDX.INTERNAL.FAILURE", "Internal failure", 500);
+    }
+    const key = JSON.stringify([layer.precedence_level, layer.ordinal]);
+    if (keys.has(key) || (layer.was_selected && selectedLevels.has(layer.precedence_level))) {
+      throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Configuration lineage conflict", 409);
+    }
+    keys.add(key);
+    if (layer.was_selected) selectedLevels.add(layer.precedence_level);
+    return { configuration_definition_id: layer.layer_definition_id,
+      configuration_override_id: layer.configuration_override_id, precedence_level: layer.precedence_level,
+      ordinal: layer.ordinal, was_selected: layer.was_selected };
+  });
+  return {
+    effective_configuration_id: row.effective_configuration_id,
+    configuration_definition: { configuration_definition_id: row.configuration_definition_id,
+      configuration_code: row.configuration_code, version_number: row.version_number },
+    resolved_for_subject_id: row.resolved_for_subject_id,
+    effective_at: row.effective_at instanceof Date ? row.effective_at.toISOString() : row.effective_at,
+    resolved_at: row.resolved_at instanceof Date ? row.resolved_at.toISOString() : row.resolved_at,
+    resolution_status: row.resolution_status, input_hash: row.input_hash, layers
+  };
+}
diff --git a/apps/backend/src/configuration/effective-read.test.ts b/apps/backend/src/configuration/effective-read.test.ts
--- /dev/null
+++ b/apps/backend/src/configuration/effective-read.test.ts
@@ -0,0 +1,181 @@
+import { describe, expect, it, vi } from "vitest";
+import { PostgresQueryCompiler, type Kysely } from "kysely";
+import { buildApp } from "../app.js";
+import type { FoundationDatabase } from "../database.js";
+import { FoundationError } from "../errors.js";
+import { UnavailableFileStoragePort } from "../ports/file-storage.js";
+import { newUuidV7 } from "../uuid.js";
+import type { VerifiedIdentity } from "../security/authentication.js";
+
+type Options = {
+  permission?: string; scope?: string; capability?: boolean; membership?: boolean;
+  found?: boolean; foreignLayer?: boolean; failRead?: boolean;
+  resolutionStatus?: string; versionNumber?: string; emptyLayers?: boolean; duplicateKey?: boolean; duplicateSelected?: boolean;
+};
+function fixture(options: Options = {}) {
+  const tenantId = newUuidV7();
+  const configurationId = newUuidV7();
+  const definitionId = newUuidV7();
+  const identity: VerifiedIdentity = {
+    principalClass: "HUMAN_INTERACTIVE", principalId: newUuidV7(),
+    tokenId: newUuidV7(), expiresAt: new Date("2099-01-01T00:00:00.000Z")
+  };
+  const compiler = new PostgresQueryCompiler();
+  const executeQuery = vi.fn((query: { sql: string; parameters: readonly unknown[] }) => {
+    if (query.sql.includes("FROM iam.tenant_memberships")) {
+      expect(query.parameters).toEqual([tenantId, identity.principalId]);
+      return { rows: options.membership === false ? [] : [{ tenant_membership_id: newUuidV7() }] };
+    }
+    if (query.sql.includes("FROM iam.membership_roles")) return { rows: [
+      { permission_code: options.permission ?? "configuration.effective_configuration.read", scope_kind: options.scope ?? "tenant", role_code: "DATA_ADMIN" },
+      { permission_code: "controls.control.read", scope_kind: "tenant", role_code: "DATA_ADMIN" }
+    ] };
+    if (query.sql.includes("FROM platform.subscriptions")) return { rows: options.capability === false ? [] : [{ capability_group: "CORE_PLATFORM" }] };
+    if (query.sql.includes("FROM config.effective_configurations")) {
+      expect(query.parameters).toEqual([configurationId, tenantId]);
+      expect(query.sql).toContain("ec.tenant_id=$2::uuid");
+      expect(query.sql).toContain("layer.tenant_id <> ec.tenant_id");
+      if (options.failRead) throw new Error("private database hostname and secret must not escape");
+      const root = {
+        effective_configuration_id: configurationId, configuration_definition_id: definitionId,
+        configuration_code: "FIXTURE_ONLY", version_number: options.versionNumber ?? "1", resolved_for_subject_id: null,
+        effective_at: new Date(0), resolved_at: new Date(0),
+        resolution_status: options.resolutionStatus ?? "stored_fixture_status", input_hash: "a".repeat(64),
+        effective_text_value: "must not expose stored values", created_by_user_identity_id: identity.principalId
+      };
+      expect(query.sql).toContain("cd.version_number::text");
+      expect(query.sql).toContain('l.precedence_level COLLATE "C"');
+      expect(query.sql).toContain("lo.tenant_id <> ec.tenant_id");
+      expect(query.sql).toContain("ld.tenant_id <> ec.tenant_id");
+      const rows = options.emptyLayers ? [{ ...root, layer_id: null, layer_definition_id: null, configuration_override_id: null, precedence_level: null, ordinal: null, was_selected: null }]
+        : [1, 2].map(ordinal => ({ ...root, layer_id: newUuidV7(), layer_definition_id: definitionId,
+          configuration_override_id: null, precedence_level: "stored_fixture_level", ordinal: options.duplicateKey ? 1 : ordinal,
+          was_selected: options.duplicateSelected || ordinal === 2 }));
+      return { rows: options.found === false || options.foreignLayer ? [] : rows };
+    }
+    throw new Error("Unexpected query; writes and transactions not available");
+  });
+  const database = {
+    executeQuery, getExecutor: () => ({ transformQuery: (node: unknown) => node,
+      compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId), executeQuery })
+  } as unknown as Kysely<FoundationDatabase>;
+  const verifyBearerToken = vi.fn(async (token: string) => {
+    if (token !== "local-fixture") throw new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);
+    return identity;
+  });
+  const app = buildApp(async () => false, { database, identityVerifier: { verifyBearerToken }, fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: "test" });
+  const url = `/api/v1/effective-configurations/${configurationId}`;
+  const headers = { authorization: "Bearer local-fixture", "x-tcdx-tenant-id": tenantId };
+  return { app, url, headers, executeQuery, verifyBearerToken, tenantId, configurationId };
+}
+function configReads(f: ReturnType<typeof fixture>) {
+  return f.executeQuery.mock.calls.filter(([q]) => q.sql.includes("FROM config.effective_configur"));
+}
+async function request(options: Options, expected: number, headers?: Record<string, string>, suffix = "") {
+  const f = fixture(options);
+  try {
+    const response = await f.app.inject({ method: "GET", url: f.url + suffix, headers: headers ?? f.headers });
+    expect(response.statusCode).toBe(expected);
+    if (expected >= 400) {
+      expect(response.headers["content-type"]).toContain("application/problem+json");
+      expect(response.json()).toMatchObject({ retryable: false, correlation_id: response.headers["x-correlation-id"] });
+    }
+    return { response, reads: configReads(f).length, calls: f.executeQuery.mock.calls.length };
+  } finally { await f.app.close(); }
+}
+
+describe("DRAFT EC handler local integration — not approved or registered in active checkout", () => {
+  it("returns 200 for the existing tenant permission and CORE_PLATFORM entitlement", async () => {
+    const { response } = await request({}, 200);
+    expect(response.json()).toMatchObject({ operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: response.headers["x-correlation-id"] });
+  });
+  it("minimizes attributes and returns the complete stored lineage without JSON values or actors", async () => {
+    const { response } = await request({}, 200); const result = response.json().result;
+    expect(Object.keys(result).sort()).toEqual(["effective_configuration_id", "configuration_definition", "resolved_for_subject_id", "effective_at", "resolved_at", "resolution_status", "input_hash", "layers"].sort());
+    expect(result.layers).toHaveLength(2); expect(result.layers[0]).not.toHaveProperty("tenant_id");
+    expect(result.configuration_definition.version_number).toBe("1");
+    expect(result.effective_at).toBe("1970-01-01T00:00:00.000Z");
+    expect(response.body).not.toContain("must not expose"); expect(response.body).not.toContain("created_by");
+  });
+  it("rejects a missing bearer with 401 before any database query", async () => {
+    expect((await request({}, 401, {})).calls).toBe(0);
+  });
+  it("rejects an invalid bearer with 401 before any database query", async () => {
+    expect((await request({}, 401, { authorization: "Bearer invalid" })).calls).toBe(0);
+  });
+  it("rejects missing tenant context with 403 before any database query", async () => {
+    expect((await request({}, 403, { authorization: "Bearer local-fixture" })).calls).toBe(0);
+  });
+  it("conceals a missing active membership with 404 before a configuration read", async () => {
+    expect((await request({ membership: false }, 404)).reads).toBe(0);
+  });
+  it("does not infer EC permission from a different permission", async () => {
+    expect((await request({ permission: "controls.control.read" }, 403)).reads).toBe(0);
+  });
+  it("denies permission without entitlement", async () => {
+    expect((await request({ capability: false }, 403)).reads).toBe(0);
+  });
+  it.each(["platform", "assigned_object", "owned_object", "organizational_unit", "process", "service"])("does not elevate unbound %s scope from another permission's tenant grant", async scope => {
+    expect((await request({ scope }, 403)).reads).toBe(0);
+  });
+  it("conceals an inaccessible EC with 404 and never loads layers", async () => {
+    expect((await request({ found: false }, 404)).reads).toBe(1);
+  });
+  it("fails closed when the root query excludes cross-tenant lineage", async () => {
+    expect((await request({ foreignLayer: true }, 404)).reads).toBe(1);
+  });
+  it("binds another legitimate selected tenant rather than reusing a prior response", async () => {
+    const first = fixture(); const second = fixture({ found: false });
+    try {
+      const good = await first.app.inject({ method: "GET", url: first.url, headers: first.headers }); expect(good.statusCode).toBe(200);
+      const concealed = await second.app.inject({ method: "GET", url: second.url, headers: second.headers }); expect(concealed.statusCode).toBe(404);
+      expect(first.tenantId).not.toBe(second.tenantId); expect(concealed.body).not.toContain(first.configurationId);
+    } finally { await first.app.close(); await second.app.close(); }
+  });
+  it("rejects malformed path UUID without reading EC", async () => {
+    const f = fixture();
+    try { const r = await f.app.inject({ method: "GET", url: "/api/v1/effective-configurations/not-a-uuid", headers: f.headers }); expect(r.statusCode).toBe(400); expect(configReads(f)).toHaveLength(0); }
+    finally { await f.app.close(); }
+  });
+  it("rejects contextual query parameters absent from the existing detail operation", async () => {
+    expect((await request({}, 400, undefined, "?methodology_version_ref=not-published")).reads).toBe(0);
+  });
+  it("sanitizes a backend failure instead of returning empty success", async () => {
+    const { response } = await request({ failRead: true }, 500);
+    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(response.body).not.toContain("private database");
+  });
+  it("preserves historical stored codes without aliasing them into proposed enums", async () => {
+    const { response } = await request({ resolutionStatus: "historical_fixture" }, 200);
+    expect(response.json().result.resolution_status).toBe("historical_fixture");
+  });
+  it.each(["9223372036854775808", "0"])("does not silently corrupt stored version %s when producing the proposed numeric projection", async versionNumber => {
+    const { response, reads } = await request({ versionNumber }, 500);
+    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(reads).toBe(1);
+  });
+  it.each(["9007199254740993", "9223372036854775807"])("preserves positive int64 version %s exactly as a decimal string", async versionNumber => {
+    const { response, reads } = await request({ versionNumber }, 200);
+    expect(response.json().result.configuration_definition.version_number).toBe(versionNumber); expect(reads).toBe(1);
+  });
+  it.each(["duplicateKey", "duplicateSelected"] as const)("rejects %s lineage ambiguity with the published conflict code", async defect => {
+    const { response } = await request({ [defect]: true }, 409); expect(response.json().code).toBe("TCDX.CONFLICT.RESOURCE");
+  });
+  it("returns all persisted metadata with an empty layer collection, without fabricating a default", async () => {
+    const { response } = await request({ emptyLayers: true }, 200); expect(response.json().result.layers).toEqual([]);
+  });
+  it("retains a persisted conflict status as metadata, without publishing an official value or recalculating", async () => {
+    const { response } = await request({ resolutionStatus: "configuration_conflict" }, 200); expect(response.json().result.resolution_status).toBe("configuration_conflict");
+  });
+  it("supplies the contracted Bearer challenge and proposed private cache policy", async () => {
+    const { response } = await request({}, 401, {}); expect(response.headers["www-authenticate"]).toBe("Bearer"); expect(response.headers["cache-control"]).toBe("no-store");
+    expect(response.headers.vary).toBe("Authorization, X-TCDX-Tenant-Id");
+  });
+  it("repeats an idempotent read without writes, transactions or materialization", async () => {
+    const f = fixture();
+    try {
+      const first = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
+      const second = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
+      expect(first.statusCode).toBe(200); expect(second.statusCode).toBe(200); expect(first.json().result).toEqual(second.json().result);
+      expect(configReads(f)).toHaveLength(2);
+    } finally { await f.app.close(); }
+  });
+});
```

### Estado ejecutado y siguiente lote

Código independiente terminado: validación UUID de tenant antes de cast SQL y WWW-Authenticate: Bearer en401;15 tests nuevos, preservando todas las modificaciones heredadas. GET activo sigue404 sin registro; L03 heredado200 en24 tests y L03-R1200 en31 tests de copias temporales. **GET_EC_RUNTIME=DECLARED_NOT_REGISTERED; L03=ISOLATED_NOT_APPLIED.**

Siguiente lote concreto después de contrato aprobado/publicado: integrar exclusivamente las tres rutas de archivo del parche anterior; verificar hash, preflight de índice/worktree/rector, patch --check, typecheck/lint y31 tests HTTP más61 activos pertinentes. Sin cambios en permisos/migraciones/BD/infra/UI; comprobar que la respuesta incluye exactamente el DTO firmado. Rollback local mediante diff inverso sólo de ese lote previa comparación de hashes, preservando herencia; ninguna operación externa autorizada. La prueba real PostgreSQL/RLS requiere un lote/ambiente autorizado posterior; no se suplanta por mock. Actualmente no hay otro slice CT01/03/04/VOC/CFG-D demostrablemente independiente que pueda habilitarse: proyecciones/valores/none permanecen contractualmente pendientes. Las dos correcciones comunes autorizadas sí quedan entregadas.


## EC-R1 — mandato de cierre y autorización posterior de publicación local — 2026-10-09

TASK_ID=STEP_6A3_EC_DETAIL_R1_LOCAL_PUBLICATION_AND_IMPLEMENTATION. Fuente humana: mandato «TCDX GRC — Mandato ejecutivo de cierre STEP6A.3 / EC-DETAIL-READ-v1-L03-R1» y mensaje posterior literal «Architecture, Backend y Security \& Privacy autorizan para publicar, procede». El primero adopta EC-R1.1..8/tabla/schema SHA159c2fac9a5d2006900f49ee020521146f2e85baeec9233c8a8f07429bc28163; el segundo aporta los roles de aprobación que faltaban. Identidad declarada: Product Owner único emisor de estos mandatos; no se suministra nombre civil ni se atribuyen personas distintas, firma criptográfica, independencia o credenciales. Funciones de aprobación: Architecture Owner, Backend Owner, Security & Privacy Reviewer según autorización humana posterior; acumulación interna permitida por rector43:116. No es una aprobación SOG/48 cláusulas ni aceptación runtime/release.

Rectorv1.7 prevalece; R45:68–81 exige DR, fuentes actualizadas y aprobación registrada antes de código; OpenAPI02:19–23 y matriz03:5–6 identifican roles. Decisión humana resuelve sólo ese gate contractual local de GET metadata. Permiso/entitlement publicados se conservan. Autoriza publicación local versionada del delta de GET y cableado/pruebas; todos los gates de entorno/QA/DB/deploy siguen sin autorización.

Archivos permitidos: executable02 (schema/respuesta/metadata de aprobación de esta operación),03 (fila/nota),28_EFFECTIVE_CONFIGURATION_DETAIL_READ.md (nuevo contrato versionado y referencia a DR); ledger26 (append únicamente de procedencia/roles para esta decisión, no cambiar48 estados),21 (append de supersesión acotada del detalle, conservar §8original);04/06/07 existentes (resultados/diffs/inventario);MASTER_EXECUTION_STATUS (append cierre parcial real). Backend: core-grc/routes.ts, configuration/effective-read.ts y.test.ts nuevos; service.ts sólo reforzar ownership/existencia de referencias EC ya exigidos por modelo físico; test nuevo phase6a-configuration-reference-integrity.test.ts. Preservar tests/guard/i18n y cambios heredados; no editarapp/tenant-context ya correctos, SOG01/03, baseline/manifiestos, modelo físico, permisos/grants/migraciones/infra/frontend.

Criterios de aceptación: source/patch hash idénticos antes de refinamientos; schema int64 exacto/longitudes/UUID/null/UTC; SQL una sentencia con existencia explícita deDefinition/Override y lineage íntegro,200/400/401/403/404/409/500,scope tenant,DENY otros,membership/entitlement,metadatacorrupta sanitizada;61referencias activas más suiteGET fortalecida, typecheck/lint/rector/contracts/diff/scope. Mocks no prueban PG/RLS. Rollback local sólo diff nuevo identificado por hash y archivos nuevos propios, preservando herencia; no reset/clean/stash/checkout ni operaciones externas. Código refinado puede cambiar bytes del parche para corregir joins/validación sin cambiar texto/schema adoptados; registrar hashes/versiones técnicas nuevas y diff. EC opcional/CFG-D/UQ/default/48cláusulas/44grants/52valores/6A.4 siguen pendientes.

Extensión de pruebas autorizadas del lote EC: configuration/effective-read.postgres.test.ts (nuevo). PostgreSQL16 aislado existente, container tcdx-grc-phase3-postgres-16 con binding127.0.0.1:55432; verificación sólo de catalog/metadatos y SQL real del lector sobre CTE VALUES sintéticos, sin INSERT/UPDATE/DELETE/DDL ni tenants persistidos. Conexión obligatoria localhost puerto55432/base tcdx-grc y default_transaction_read_only=on; nuncaloadConfig condefaultsQA. Los nombres de tablas se sustituyen únicamente en el executor de prueba por CTEs tipados; no es implementación paralela ni evidencia de filas reales/RLS. RLS sin activar según modelo físico05:32–34; no cambia policies. Reportar esa limitación y constraints inspeccionados en catálogo, sin PASS de materialización/QA/IAM.


## EC-R1 — integración final aplicada y trazabilidad de diferencias

GET_EC_CONTRACT=PUBLISHED_LOCAL_CONTRACT; L03_R1_INTEGRATION=APPLIED_ACTIVE_CHECKOUT. Source/patch aprobados conservan hashes originales159c2fac… /2cc0bd41…; no se aplicó patch a ciegas. Refinamientos mecánicos: comprobar existencia explícita deDefinition/Override yDefinitionreferenciada porOverride; retirar filtro parcial de layers; validar metadata UUID/bounds/int64/hash/UTC y sentinelzero-layer; validar shape después deBearer antes deSQL; contar claves porlevel+ordinal; tests negativos adicionales. Ninguna semántica nueva. Schema adoptado byte-equivalente por contenido, sin corrección o versiónnormativa extra: la hipótesis sobre `$` fue rechazada por pruebasECMAScript/Ajv26PASS/0FAIL,38SKIPPED porfiltro; no registrar un defecto inexistente.

Parche integrado final SHA-256 d75160f4421229b17771f683f964e383d2f83b52fc8c1acd6c780d921eb6601d, relativo a losbytes del preflight, incluyendo sólo código nuevo y refuerzo independiente del guard deassessment. Guard heredado/layers mismo tenant y4tests preservados. No incluye cambios heredadosfrontend/app/tenant-context.130PASSactivos (64GET+60regresión+6guard),16PASS SQLPostgreSQLreadonlyCTE,19schema checks. Probe decheckout activo confirma200/400/401/403/404/409/500. SQLdatos1statement; auth3lecturas separadas normales; nuncaN+1 o writes.

```diff
diff --git a/apps/backend/src/core-grc/routes.ts b/apps/backend/src/core-grc/routes.ts
--- a/apps/backend/src/core-grc/routes.ts
+++ b/apps/backend/src/core-grc/routes.ts
@@ -6,7 +6,7 @@
 import type { CoreGrcDependencies, ResourceKey } from "./model.js";
 import { resources } from "./model.js";
 import { detailResource, getResource, listResource } from "./repository.js";
-import { availablePlatformRoleCodes, availableTenantContexts, grantedScopes, requireAccess, resolveAuthenticatedIdentity, resolveCoreActor } from "./security.js";
+import { availablePlatformRoleCodes, availableTenantContexts, grantedScopes, requireAccess, resolveAuthenticatedIdentity, resolveCoreActor, resolveTenantActor } from "./security.js";
 import type { AuthorizedFileAccess } from "../ports/file-storage.js";
 import { executeMutation, mutations } from "./service.js";
 import { membershipCreate, membershipInvitationCreate, membershipInvitationRevoke, membershipRoleAssign, membershipRoleRevoke, subscriptionCreate, tenantCreate } from "../security/platform-iam-service.js";
@@ -15,6 +15,7 @@
 import { listTenantNormativeContent } from "../regulatory/tenant-read.js";
 import { listValidationAccessCandidates } from "../regulatory/validation-candidates.js";
 import { listMethodologies } from "./methodologies.js";
+import { readEffectiveConfiguration } from "../configuration/effective-read.js";
 import { listSelectableSubjects } from "./subject-read.js";
 import { subjectCreate } from "./subject-create.js";
 import { activatePack, listPackAssignments, packAssignmentDetail, packUuid, revokePack } from "../regulatory/pack-contract.js";
@@ -121,6 +122,15 @@
 ];
 
 export function registerCoreGrcRoutes(app: FastifyInstance, dependencies: CoreGrcDependencies): void {
+  app.get("/api/v1/effective-configurations/:id", async (request: FastifyRequest<{ Params: Params; Querystring: Record<string, unknown> }>, reply) => {
+    reply.header("cache-control", "no-store").header("vary", "Authorization, X-TCDX-Tenant-Id");
+    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier, request);
+    const id = validId(request.params.id);
+    if (Object.keys(request.query).length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query", 400);
+    const actor = await resolveTenantActor(dependencies.database, identity, request.headers["x-tcdx-tenant-id"]);
+    const result = await readEffectiveConfiguration(dependencies.database, actor, id);
+    return { operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: correlation(reply), result };
+  });
   for (const domain of ["compliance", "controls"] as const) {
     app.get(`/api/v1/${domain}-methodologies`, async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>) => {
       const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
diff --git a/apps/backend/src/core-grc/service.ts b/apps/backend/src/core-grc/service.ts
--- a/apps/backend/src/core-grc/service.ts
+++ b/apps/backend/src/core-grc/service.ts
@@ -270,7 +270,19 @@
       AND cd.owner_domain=$3 AND cd.lifecycle_state='published'
       AND NOT EXISTS (SELECT 1 FROM config.effective_configuration_layers layer
         WHERE layer.effective_configuration_id=ec.effective_configuration_id
-          AND layer.tenant_id <> ec.tenant_id)`, [id, actor.tenantId, domain]));
+          AND layer.tenant_id <> ec.tenant_id)
+      AND (cd.tenant_id IS NULL OR cd.tenant_id=ec.tenant_id)
+      AND NOT EXISTS (SELECT 1 FROM config.effective_configuration_layers layer
+        LEFT JOIN config.configuration_definitions ld ON ld.configuration_definition_id=layer.configuration_definition_id
+        LEFT JOIN config.configuration_overrides lo ON lo.configuration_override_id=layer.configuration_override_id
+        LEFT JOIN config.configuration_definitions od ON od.configuration_definition_id=lo.configuration_definition_id
+        WHERE layer.effective_configuration_id=ec.effective_configuration_id
+          AND (ld.configuration_definition_id IS NULL
+            OR (ld.tenant_id IS NOT NULL AND ld.tenant_id <> ec.tenant_id)
+            OR (layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL)
+            OR (lo.tenant_id IS NOT NULL AND lo.tenant_id <> ec.tenant_id)
+            OR (layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL)
+            OR (od.tenant_id IS NOT NULL AND od.tenant_id <> ec.tenant_id)))`, [id, actor.tenantId, domain]));
   if (!result.rows.length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Configuration is not compatible with this tenant assessment", 400, false, { field: "effective_configuration_id" });
 }
 
diff --git a/apps/backend/src/configuration/effective-read.ts b/apps/backend/src/configuration/effective-read.ts
--- /dev/null
+++ b/apps/backend/src/configuration/effective-read.ts
@@ -0,0 +1,105 @@
+// EC-DETAIL-READ-v1-L03-R1; executable contract28 and DR-STEP6A3-EC-DETAIL-R1-20261009.
+import { CompiledQuery, type Kysely } from "kysely";
+import { validate as validateUuid } from "uuid";
+import type { FoundationDatabase } from "../database.js";
+import { FoundationError } from "../errors.js";
+import type { CoreActor } from "../core-grc/model.js";
+import { requireAccess } from "../core-grc/security.js";
+
+type ResolutionRow = {
+  effective_configuration_id: string; configuration_definition_id: string;
+  configuration_code: string; version_number: string;
+  resolved_for_subject_id: string | null; effective_at: Date | string;
+  resolved_at: Date | string; resolution_status: string; input_hash: string;
+  layer_id: string | null; layer_definition_id: string | null;
+  configuration_override_id: string | null; precedence_level: string | null;
+  ordinal: number | null; was_selected: boolean | null;
+};
+function metadataFailure(): never { throw new FoundationError("TCDX.INTERNAL.FAILURE", "Internal failure", 500); }
+function isUuid(value: unknown): value is string { return typeof value === "string" && validateUuid(value); }
+function boundedText(value: unknown, minimum: number, maximum: number): value is string {
+  return typeof value === "string" && [...value].length >= minimum && [...value].length <= maximum;
+}
+function utcTimestamp(value: Date | string): string {
+  if (value instanceof Date) {
+    if (!Number.isFinite(value.getTime())) metadataFailure();
+    value = value.toISOString();
+  }
+  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) metadataFailure();
+  const parsed = new Date(value);
+  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,19) !== value.slice(0,19)) metadataFailure();
+  return value;
+}
+export async function readEffectiveConfiguration(database: Kysely<FoundationDatabase>, actor: CoreActor, id: string) {
+  requireAccess(actor, "configuration.effective_configuration.read", "CORE_PLATFORM", ["tenant"]);
+  // One statement snapshot. Missing joined references must not masquerade as global ownership.
+  const result = await database.executeQuery<ResolutionRow>(CompiledQuery.raw(`
+    SELECT ec.effective_configuration_id,ec.configuration_definition_id,
+           cd.configuration_code,cd.version_number::text AS version_number,
+           ec.resolved_for_subject_id,ec.effective_at,ec.resolved_at,ec.resolution_status,ec.input_hash,
+           l.effective_configuration_layer_id AS layer_id,l.configuration_definition_id AS layer_definition_id,
+           l.configuration_override_id,l.precedence_level,l.ordinal,l.was_selected
+      FROM config.effective_configurations ec
+      JOIN config.configuration_definitions cd ON cd.configuration_definition_id=ec.configuration_definition_id
+      LEFT JOIN config.effective_configuration_layers l
+        ON l.effective_configuration_id=ec.effective_configuration_id
+     WHERE ec.effective_configuration_id=$1::uuid AND ec.tenant_id=$2::uuid
+       AND (cd.tenant_id IS NULL OR cd.tenant_id=ec.tenant_id)
+       AND NOT EXISTS (
+         SELECT 1 FROM config.effective_configuration_layers layer
+         LEFT JOIN config.configuration_definitions ld ON ld.configuration_definition_id=layer.configuration_definition_id
+         LEFT JOIN config.configuration_overrides lo ON lo.configuration_override_id=layer.configuration_override_id
+         LEFT JOIN config.configuration_definitions od ON od.configuration_definition_id=lo.configuration_definition_id
+         WHERE layer.effective_configuration_id=ec.effective_configuration_id
+           AND (layer.tenant_id <> ec.tenant_id
+             OR ld.configuration_definition_id IS NULL
+             OR (ld.tenant_id IS NOT NULL AND ld.tenant_id <> ec.tenant_id)
+             OR (layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL)
+             OR (lo.tenant_id IS NOT NULL AND lo.tenant_id <> ec.tenant_id)
+             OR (layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL)
+             OR (od.tenant_id IS NOT NULL AND od.tenant_id <> ec.tenant_id))
+       )
+     ORDER BY l.ordinal ASC NULLS LAST,l.precedence_level COLLATE "C" ASC NULLS LAST,
+              l.configuration_override_id ASC NULLS FIRST,l.effective_configuration_layer_id ASC NULLS LAST
+  `, [id, actor.tenantId]));
+  const row = result.rows[0];
+  if (!row) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
+  if (!isUuid(row.effective_configuration_id) || row.effective_configuration_id !== id || !isUuid(row.configuration_definition_id)
+    || !boundedText(row.configuration_code,1,128) || !boundedText(row.resolution_status,0,32)
+    || (row.resolved_for_subject_id !== null && !isUuid(row.resolved_for_subject_id))
+    || typeof row.input_hash !== "string" || !/^[0-9a-fA-F]{64}$/.test(row.input_hash)
+    || typeof row.version_number !== "string" || !/^[1-9][0-9]{0,18}$/.test(row.version_number)
+    || BigInt(row.version_number) > 9223372036854775807n) metadataFailure();
+  const effectiveAt = utcTimestamp(row.effective_at);
+  const resolvedAt = utcTimestamp(row.resolved_at);
+  const keys = new Map<string, Set<number>>();
+  const selectedLevels = new Set<string>();
+  const layers = result.rows.flatMap(layer => {
+    if (layer.layer_id === null) {
+      if (result.rows.length !== 1 || layer.layer_definition_id !== null || layer.configuration_override_id !== null
+        || layer.precedence_level !== null || layer.ordinal !== null || layer.was_selected !== null) metadataFailure();
+      return [];
+    }
+    if (!isUuid(layer.layer_id) || !isUuid(layer.layer_definition_id)
+      || (layer.configuration_override_id !== null && !isUuid(layer.configuration_override_id))
+      || !boundedText(layer.precedence_level,0,32) || !Number.isInteger(layer.ordinal)
+      || layer.ordinal === null || layer.ordinal < 1 || layer.ordinal > 2147483647
+      || typeof layer.was_selected !== "boolean") metadataFailure();
+    const ordinals = keys.get(layer.precedence_level) ?? new Set<number>();
+    if (ordinals.has(layer.ordinal) || (layer.was_selected && selectedLevels.has(layer.precedence_level))) {
+      throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Configuration lineage conflict", 409);
+    }
+    ordinals.add(layer.ordinal); keys.set(layer.precedence_level,ordinals);
+    if (layer.was_selected) selectedLevels.add(layer.precedence_level);
+    return [{ configuration_definition_id: layer.layer_definition_id,
+      configuration_override_id: layer.configuration_override_id, precedence_level: layer.precedence_level,
+      ordinal: layer.ordinal, was_selected: layer.was_selected }];
+  });
+  return {
+    effective_configuration_id: row.effective_configuration_id,
+    configuration_definition: { configuration_definition_id: row.configuration_definition_id,
+      configuration_code: row.configuration_code, version_number: row.version_number },
+    resolved_for_subject_id: row.resolved_for_subject_id, effective_at: effectiveAt, resolved_at: resolvedAt,
+    resolution_status: row.resolution_status, input_hash: row.input_hash, layers
+  };
+}
diff --git a/apps/backend/src/configuration/effective-read.test.ts b/apps/backend/src/configuration/effective-read.test.ts
--- /dev/null
+++ b/apps/backend/src/configuration/effective-read.test.ts
@@ -0,0 +1,251 @@
+import { describe, expect, it, vi } from "vitest";
+import { PostgresQueryCompiler, type Kysely } from "kysely";
+import { buildApp } from "../app.js";
+import type { FoundationDatabase } from "../database.js";
+import { FoundationError } from "../errors.js";
+import { UnavailableFileStoragePort } from "../ports/file-storage.js";
+import { newUuidV7 } from "../uuid.js";
+import type { VerifiedIdentity } from "../security/authentication.js";
+
+type Options = {
+  permission?: string; scope?: string; capability?: boolean; membership?: boolean;
+  found?: boolean; foreignLayer?: boolean; failRead?: boolean;
+  principalClass?: VerifiedIdentity["principalClass"]; concealedReference?: boolean; rowPatch?: Record<string, unknown>; layerPatches?: Array<Record<string, unknown>>;
+  resolutionStatus?: string; versionNumber?: string; emptyLayers?: boolean; duplicateKey?: boolean; duplicateSelected?: boolean;
+};
+function fixture(options: Options = {}) {
+  const tenantId = newUuidV7();
+  const configurationId = newUuidV7();
+  const definitionId = newUuidV7();
+  const identity: VerifiedIdentity = {
+    principalClass: options.principalClass ?? "HUMAN_INTERACTIVE", principalId: newUuidV7(),
+    tokenId: newUuidV7(), expiresAt: new Date("2099-01-01T00:00:00.000Z")
+  };
+  const compiler = new PostgresQueryCompiler();
+  const executeQuery = vi.fn((query: { sql: string; parameters: readonly unknown[] }) => {
+    if (query.sql.includes("FROM iam.tenant_memberships")) {
+      expect(query.parameters).toEqual([tenantId, identity.principalId]);
+      return { rows: options.membership === false ? [] : [{ tenant_membership_id: newUuidV7() }] };
+    }
+    if (query.sql.includes("FROM iam.membership_roles")) return { rows: [
+      { permission_code: options.permission ?? "configuration.effective_configuration.read", scope_kind: options.scope ?? "tenant", role_code: "DATA_ADMIN" },
+      { permission_code: "controls.control.read", scope_kind: "tenant", role_code: "DATA_ADMIN" }
+    ] };
+    if (query.sql.includes("FROM platform.subscriptions")) return { rows: options.capability === false ? [] : [{ capability_group: "CORE_PLATFORM" }] };
+    if (query.sql.includes("FROM config.effective_configurations")) {
+      expect(query.parameters).toEqual([configurationId, tenantId]);
+      expect(query.sql).toContain("ec.tenant_id=$2::uuid");
+      expect(query.sql).toContain("layer.tenant_id <> ec.tenant_id");
+      expect(query.sql).toContain("ld.configuration_definition_id IS NULL");
+      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL");
+      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL");
+      expect(query.sql).not.toMatch(/l\.tenant_id\s*=\s*ec\.tenant_id/);
+      if (options.failRead) throw new Error("private database hostname and secret must not escape");
+      const root = {
+        effective_configuration_id: configurationId, configuration_definition_id: definitionId,
+        configuration_code: "FIXTURE_ONLY", version_number: options.versionNumber ?? "1", resolved_for_subject_id: null,
+        effective_at: new Date(0), resolved_at: new Date(0),
+        resolution_status: options.resolutionStatus ?? "stored_fixture_status", input_hash: "a".repeat(64),
+        effective_text_value: "must not expose stored values", created_by_user_identity_id: identity.principalId
+      };
+      expect(query.sql).toContain("cd.version_number::text");
+      expect(query.sql).toContain('l.precedence_level COLLATE "C"');
+      expect(query.sql).toContain("lo.tenant_id <> ec.tenant_id");
+      expect(query.sql).toContain("ld.tenant_id <> ec.tenant_id");
+      const rows = options.emptyLayers ? [{ ...root, layer_id: null, layer_definition_id: null, configuration_override_id: null, precedence_level: null, ordinal: null, was_selected: null }]
+        : [1, 2].map(ordinal => ({ ...root, layer_id: newUuidV7(), layer_definition_id: definitionId,
+          configuration_override_id: null, precedence_level: "stored_fixture_level", ordinal: options.duplicateKey ? 1 : ordinal,
+          was_selected: options.duplicateSelected || ordinal === 2 }));
+      return { rows: options.found === false || options.foreignLayer || options.concealedReference ? [] : rows.map((row,index) => ({ ...row, ...options.rowPatch, ...options.layerPatches?.[index] })) };
+    }
+    throw new Error("Unexpected query; writes and transactions not available");
+  });
+  const database = {
+    executeQuery, getExecutor: () => ({ transformQuery: (node: unknown) => node,
+      compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId), executeQuery })
+  } as unknown as Kysely<FoundationDatabase>;
+  const verifyBearerToken = vi.fn(async (token: string) => {
+    if (token !== "local-fixture") throw new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401);
+    return identity;
+  });
+  const app = buildApp(async () => false, { database, identityVerifier: { verifyBearerToken }, fileStorage: new UnavailableFileStoragePort(), runtimeEnvironment: "test" });
+  const url = `/api/v1/effective-configurations/${configurationId}`;
+  const headers = { authorization: "Bearer local-fixture", "x-tcdx-tenant-id": tenantId };
+  return { app, url, headers, executeQuery, verifyBearerToken, tenantId, configurationId };
+}
+function configReads(f: ReturnType<typeof fixture>) {
+  return f.executeQuery.mock.calls.filter(([q]) => q.sql.includes("FROM config.effective_configur"));
+}
+async function request(options: Options, expected: number, headers?: Record<string, string>, suffix = "") {
+  const f = fixture(options);
+  try {
+    const response = await f.app.inject({ method: "GET", url: f.url + suffix, headers: headers ?? f.headers });
+    expect(response.statusCode).toBe(expected);
+    if (expected >= 400) {
+      expect(response.headers["content-type"]).toContain("application/problem+json");
+      expect(response.json()).toMatchObject({ retryable: false, correlation_id: response.headers["x-correlation-id"] });
+    }
+    return { response, reads: configReads(f).length, calls: f.executeQuery.mock.calls.length };
+  } finally { await f.app.close(); }
+}
+
+describe("EC detail v1 authorized HTTP integration — memory query executor, not PostgreSQL/RLS", () => {
+  it("returns 200 for the existing tenant permission and CORE_PLATFORM entitlement", async () => {
+    const { response } = await request({}, 200);
+    expect(response.json()).toMatchObject({ operation_id: "effectiveConfigurationGet", status: "completed", correlation_id: response.headers["x-correlation-id"] });
+  });
+  it("minimizes attributes and returns the complete stored lineage without JSON values or actors", async () => {
+    const { response } = await request({}, 200); const result = response.json().result;
+    expect(Object.keys(result).sort()).toEqual(["effective_configuration_id", "configuration_definition", "resolved_for_subject_id", "effective_at", "resolved_at", "resolution_status", "input_hash", "layers"].sort());
+    expect(result.layers).toHaveLength(2); expect(result.layers[0]).not.toHaveProperty("tenant_id");
+    expect(result.configuration_definition.version_number).toBe("1");
+    expect(result.effective_at).toBe("1970-01-01T00:00:00.000Z");
+    expect(response.body).not.toContain("must not expose"); expect(response.body).not.toContain("created_by");
+  });
+  it("rejects a missing bearer with 401 before any database query", async () => {
+    expect((await request({}, 401, {})).calls).toBe(0);
+  });
+  it("rejects an invalid bearer with 401 before any database query", async () => {
+    expect((await request({}, 401, { authorization: "Bearer invalid" })).calls).toBe(0);
+  });
+  it("rejects missing tenant context with 403 before any database query", async () => {
+    expect((await request({}, 403, { authorization: "Bearer local-fixture" })).calls).toBe(0);
+  });
+  it("conceals a missing active membership with 404 before a configuration read", async () => {
+    expect((await request({ membership: false }, 404)).reads).toBe(0);
+  });
+  it("does not infer EC permission from a different permission", async () => {
+    expect((await request({ permission: "controls.control.read" }, 403)).reads).toBe(0);
+  });
+  it("denies permission without entitlement", async () => {
+    expect((await request({ capability: false }, 403)).reads).toBe(0);
+  });
+  it.each(["platform", "assigned_object", "owned_object", "organizational_unit", "process", "service"])("does not elevate unbound %s scope from another permission's tenant grant", async scope => {
+    expect((await request({ scope }, 403)).reads).toBe(0);
+  });
+  it("conceals an inaccessible EC with 404 and never loads layers", async () => {
+    expect((await request({ found: false }, 404)).reads).toBe(1);
+  });
+  it("fails closed when the root query excludes cross-tenant lineage", async () => {
+    expect((await request({ foreignLayer: true }, 404)).reads).toBe(1);
+  });
+  it("binds another legitimate selected tenant rather than reusing a prior response", async () => {
+    const first = fixture(); const second = fixture({ found: false });
+    try {
+      const good = await first.app.inject({ method: "GET", url: first.url, headers: first.headers }); expect(good.statusCode).toBe(200);
+      const concealed = await second.app.inject({ method: "GET", url: second.url, headers: second.headers }); expect(concealed.statusCode).toBe(404);
+      expect(first.tenantId).not.toBe(second.tenantId); expect(concealed.body).not.toContain(first.configurationId);
+    } finally { await first.app.close(); await second.app.close(); }
+  });
+  it("rejects malformed path UUID without reading EC", async () => {
+    const f = fixture();
+    try { const r = await f.app.inject({ method: "GET", url: "/api/v1/effective-configurations/not-a-uuid", headers: f.headers }); expect(r.statusCode).toBe(400); expect(configReads(f)).toHaveLength(0); expect(f.executeQuery).not.toHaveBeenCalled(); }
+    finally { await f.app.close(); }
+  });
+  it("rejects contextual query parameters absent from the existing detail operation", async () => {
+    const result = await request({}, 400, undefined, "?methodology_version_ref=not-published"); expect(result.reads).toBe(0); expect(result.calls).toBe(0);
+  });
+  it("sanitizes a backend failure instead of returning empty success", async () => {
+    const { response } = await request({ failRead: true }, 500);
+    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(response.body).not.toContain("private database");
+  });
+  it("preserves historical stored codes without aliasing them into proposed enums", async () => {
+    const { response } = await request({ resolutionStatus: "historical_fixture" }, 200);
+    expect(response.json().result.resolution_status).toBe("historical_fixture");
+  });
+  it.each(["9223372036854775808", "0"])("does not silently corrupt stored version %s when producing the contracted decimal string projection", async versionNumber => {
+    const { response, reads } = await request({ versionNumber }, 500);
+    expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE"); expect(reads).toBe(1);
+  });
+  it.each(["9007199254740993", "9223372036854775807"])("preserves positive int64 version %s exactly as a decimal string", async versionNumber => {
+    const { response, reads } = await request({ versionNumber }, 200);
+    expect(response.json().result.configuration_definition.version_number).toBe(versionNumber); expect(reads).toBe(1);
+  });
+  it.each(["duplicateKey", "duplicateSelected"] as const)("rejects %s lineage ambiguity with the published conflict code", async defect => {
+    const { response } = await request({ [defect]: true }, 409); expect(response.json().code).toBe("TCDX.CONFLICT.RESOURCE");
+  });
+  it("returns all persisted metadata with an empty layer collection, without fabricating a default", async () => {
+    const { response } = await request({ emptyLayers: true }, 200); expect(response.json().result.layers).toEqual([]);
+  });
+  it("retains a persisted conflict status as metadata, without publishing an official value or recalculating", async () => {
+    const { response } = await request({ resolutionStatus: "configuration_conflict" }, 200); expect(response.json().result.resolution_status).toBe("configuration_conflict");
+  });
+  it("supplies the contracted Bearer challenge and contracted private cache policy", async () => {
+    const { response } = await request({}, 401, {}); expect(response.headers["www-authenticate"]).toBe("Bearer"); expect(response.headers["cache-control"]).toBe("no-store");
+    expect(response.headers.vary).toBe("Authorization, X-TCDX-Tenant-Id");
+  });
+  it("repeats an idempotent read without writes, transactions or materialization", async () => {
+    const f = fixture();
+    try {
+      const first = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
+      const second = await f.app.inject({ method: "GET", url: f.url, headers: f.headers });
+      expect(first.statusCode).toBe(200); expect(second.statusCode).toBe(200); expect(first.json().result).toEqual(second.json().result);
+      expect(configReads(f)).toHaveLength(2);
+    } finally { await f.app.close(); }
+  });
+});
+
+
+describe("EC detail defensive projection and reference policy", () => {
+  it("denies machine identity without SQL", async () => {
+    expect((await request({ principalClass: "MACHINE_TO_MACHINE" },403)).calls).toBe(0);
+  });
+  it("rejects malformed tenant context before SQL", async () => {
+    const f=fixture();
+    try { const response=await f.app.inject({method:"GET",url:f.url,headers:{...f.headers,"x-tcdx-tenant-id":"invalid"}});
+      expect(response.statusCode).toBe(400);expect(f.executeQuery).not.toHaveBeenCalled(); }
+    finally {await f.app.close();}
+  });
+  it("conceals an unavailable referenced object with identical absence response (executor boundary, not SQL proof)", async () => {
+    const absent=await request({found:false},404);const hidden=await request({concealedReference:true},404);
+    expect(hidden.response.json().code).toBe(absent.response.json().code);
+    expect(hidden.response.json().message).toBe(absent.response.json().message);expect(hidden.reads).toBe(1);
+  });
+  it.each([
+    {configuration_code:""},{configuration_code:"x".repeat(129)},
+    {resolution_status:"x".repeat(33)},{resolution_status:null},{input_hash:"invalid"},
+    {resolved_for_subject_id:"private-invalid-reference"},{configuration_definition_id:"invalid"},
+    {effective_at:"invalid"},{effective_at:"2026-02-30T00:00:00Z"},{effective_at:"2026-10-09T00:00:00+00:00"},
+    {resolved_at:new Date(NaN)},{version_number:"1\n"},{version_number:"1\r\n"},{input_hash:"a".repeat(64)+"\n"},{version_number:1},{version_number:"01"},{version_number:"-1"},
+    {layer_id:"invalid"},{layer_definition_id:null},{configuration_override_id:"invalid"},
+    {precedence_level:"x".repeat(33)},{ordinal:0},{ordinal:1.5},{ordinal:2147483648},{was_selected:1}
+  ])("rejects corrupt metadata with opaque500: %o",async rowPatch=>{
+    const {response}=await request({rowPatch},500);expect(response.json().code).toBe("TCDX.INTERNAL.FAILURE");
+    expect(response.body).not.toContain("private-invalid-reference");expect(response.body).not.toContain("configuration_definition");
+  });
+  it("does not confuse a corrupt nonempty layer with the LEFT JOIN zero-layer sentinel", async()=>{
+    await request({emptyLayers:true,rowPatch:{ordinal:1}},500);
+  });
+  it("counts Unicode characters consistently with PostgreSQL varchar and JSON Schema", async()=>{
+    const {response}=await request({rowPatch:{configuration_code:"😀".repeat(128),resolution_status:"😀".repeat(32)}},200);
+    expect([...response.json().result.configuration_definition.configuration_code]).toHaveLength(128);
+  });
+  it("preserves UTC timestamp text precision and nullable references without coercion", async()=>{
+    const {response}=await request({rowPatch:{effective_at:"2026-10-09T00:00:00.123456Z",configuration_override_id:newUuidV7(),resolved_for_subject_id:newUuidV7()}},200);
+    expect(response.json().result.effective_at).toBe("2026-10-09T00:00:00.123456Z");
+  });
+  it("accepts separate selected levels and repeated ordinals across levels", async()=>{
+    // SQL order/predicates are inspected by the fixture; actual PG execution is a separate gate.
+    const {response}=await request({layerPatches:[{precedence_level:"historical_a",ordinal:1,was_selected:true},{precedence_level:"historical_b",ordinal:1,was_selected:true}]},200);expect(response.json().result.layers.map((x:{ordinal:number})=>x.ordinal)).toEqual([1,1]);
+  });
+});
+
+
+it("matches the published closed OpenAPI response schema and exact int64 boundaries",async()=>{
+  const {readFileSync}=await import("node:fs");const {createRequire}=await import("node:module");
+  const require=createRequire(import.meta.url);const fastifyRequire=createRequire(require.resolve("fastify"));
+  const compilerRequire=createRequire(fastifyRequire.resolve("@fastify/ajv-compiler"));
+  const Ajv=compilerRequire("ajv");const addFormats=compilerRequire("ajv-formats");
+  const ajv=new Ajv({strict:true,allErrors:true});addFormats(ajv);
+  const openApi=readFileSync(new URL("../../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml",import.meta.url),"utf8");
+  const schema=JSON.parse(openApi.split("    EffectiveConfigurationDetailReadResult:\n")[1]!.split("    OperationResult:\n")[0]!);
+  const validate=ajv.compile(schema);const {response}=await request({},200);const envelope=response.json();
+  expect(validate(envelope)).toBe(true);
+  for (const version of ["1","9007199254740993","9223372036854775807"]) {
+    const valid=structuredClone(envelope);valid.result.configuration_definition.version_number=version;expect(validate(valid)).toBe(true);
+  }
+  for (const version of ["0","-1","01","9223372036854775808","1\n","1\r\n",1]) {
+    const invalid=structuredClone(envelope);invalid.result.configuration_definition.version_number=version;expect(validate(invalid)).toBe(false);
+  }
+  const extra=structuredClone(envelope);extra.result.secret_value="not_public";expect(validate(extra)).toBe(false);
+});
diff --git a/apps/backend/src/configuration/effective-read.postgres.test.ts b/apps/backend/src/configuration/effective-read.postgres.test.ts
--- /dev/null
+++ b/apps/backend/src/configuration/effective-read.postgres.test.ts
@@ -0,0 +1,70 @@
+import { describe, expect, it } from "vitest";
+import { Pool } from "pg";
+import type { Kysely } from "kysely";
+import type { FoundationDatabase } from "../database.js";
+import type { CoreActor } from "../core-grc/model.js";
+import { newUuidV7 } from "../uuid.js";
+import { readEffectiveConfiguration } from "./effective-read.js";
+
+const enabled = process.env.TCDX_EC_READONLY_POSTGRES === "true";
+// Executes the actual reader SQL on PostgreSQL with typed VALUES CTE fixtures.
+// Table substitution is test-only; no persisted fixtures, DDL, IAM or RLS proof.
+type Defect = "none" | "global" | "foreign_root" | "foreign_layer" | "missing_layer_definition" | "foreign_layer_definition"
+  | "missing_override" | "foreign_override" | "missing_override_definition" | "foreign_override_definition"
+  | "absent" | "empty" | "duplicate_key" | "duplicate_selected" | "different_levels" | "stored_conflict";
+
+async function fixture(defect: Defect) {
+  if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432" || process.env.DATABASE_NAME !== "tcdx-grc") {
+    throw new Error("EC_READ_TEST_REQUIRES_EXPLICIT_ISOLATED_LOCAL_POSTGRES");
+  }
+  const pool = new Pool({ host: "127.0.0.1", port: 55432, database: "tcdx-grc", user: process.env.DATABASE_USER ?? "postgres",
+    ...(process.env.DATABASE_PASSWORD ? { password: process.env.DATABASE_PASSWORD } : {}),
+    options: "-c default_transaction_read_only=on", connectionTimeoutMillis: 2000, max: 1 });
+  const tenant = newUuidV7(), foreignTenant = newUuidV7(), ec = newUuidV7(), definition = newUuidV7(), layerDefinition = newUuidV7(), overrideDefinition = newUuidV7(), override = newUuidV7();
+  const actor: CoreActor = {tenantId: tenant,membershipId:newUuidV7(),userIdentityId:newUuidV7(),roles:[],permissions:new Set(["configuration.effective_configuration.read"]),
+    scopes:new Set(["tenant"]),permissionScopes:new Map([["configuration.effective_configuration.read",new Set(["tenant"])]]),capabilityGroups:new Set(["CORE_PLATFORM"])};
+  const parameters: unknown[] = [ec, tenant];
+  const bind = (value: unknown, type: string) => { parameters.push(value); return `$${parameters.length}::${type}`; };
+  const definitions = [
+    [definition, defect === "global" ? null : defect === "foreign_root" ? foreignTenant : tenant, "READER_LOCAL_FIXTURE", "9223372036854775807"],
+    [layerDefinition, defect === "global" ? null : defect === "foreign_layer_definition" ? foreignTenant : tenant, "LAYER_LOCAL_FIXTURE", "1"],
+    [overrideDefinition, defect === "global" ? null : defect === "foreign_override_definition" ? foreignTenant : tenant, "OVERRIDE_LOCAL_FIXTURE", "1"]
+  ].filter(([id]) => !(defect === "missing_layer_definition" && id === layerDefinition) && !(defect === "missing_override_definition" && id === overrideDefinition));
+  const defsSQL = definitions.map(([id,owner,code,version]) => `(${bind(id,"uuid")},${bind(owner,"uuid")},${bind(code,"varchar(128)")},${bind(version,"bigint")})`).join(",");
+  const overrideSQL = `SELECT ${bind(override,"uuid")} AS configuration_override_id,${bind(defect==="global"?null:defect==="foreign_override"?foreignTenant:tenant,"uuid")} AS tenant_id,${bind(overrideDefinition,"uuid")} AS configuration_definition_id${defect==="missing_override"?" WHERE FALSE":""}`;
+  const ecSQL = `SELECT ${bind(ec,"uuid")} AS effective_configuration_id,${bind(tenant,"uuid")} AS tenant_id,${bind(definition,"uuid")} AS configuration_definition_id,NULL::uuid AS resolved_for_subject_id,
+    '2026-10-09T03:00:00+03:00'::timestamptz AS effective_at,'2026-10-09T00:00:00Z'::timestamptz AS resolved_at,
+    ${bind(defect==="stored_conflict"?"configuration_conflict":"historical_fixture","varchar(32)")} AS resolution_status,${bind("A".repeat(64),"char(64)")} AS input_hash${defect==="absent"?" WHERE FALSE":""}`;
+  const layersSQL = [2,1].map(ordinal => `(${bind(newUuidV7(),"uuid")},${bind(ec,"uuid")},${bind(defect==="foreign_layer"?foreignTenant:tenant,"uuid")},${bind(layerDefinition,"uuid")},${bind(override,"uuid")},${bind(defect==="different_levels"?`historical_${ordinal}`:"historical_level","varchar(32)")},${bind(defect==="duplicate_key"||defect==="different_levels"?1:ordinal,"integer")},${bind(defect==="duplicate_selected"||defect==="different_levels"||ordinal===2,"boolean")})`).join(",");
+  let reads = 0;
+  const database = {executeQuery: async (query:{sql:string;parameters:readonly unknown[]})=>{
+    reads++;expect(query.parameters).toEqual([ec,tenant]);
+    const ctes = `WITH fixture_definitions(configuration_definition_id,tenant_id,configuration_code,version_number) AS (VALUES ${defsSQL}),
+      fixture_overrides AS (${overrideSQL}),fixture_ec AS (${ecSQL}),
+      fixture_layers_values(effective_configuration_layer_id,effective_configuration_id,tenant_id,configuration_definition_id,configuration_override_id,precedence_level,ordinal,was_selected) AS (VALUES ${layersSQL}),
+      fixture_layers AS (SELECT * FROM fixture_layers_values${defect==="empty"?" WHERE FALSE":""})`;
+    const sql = query.sql.replaceAll("config.effective_configuration_layers","fixture_layers").replaceAll("config.effective_configurations","fixture_ec")
+      .replaceAll("config.configuration_definitions","fixture_definitions").replaceAll("config.configuration_overrides","fixture_overrides");
+    const result = await pool.query(ctes+sql,parameters);return {rows:result.rows};
+  }} as unknown as Kysely<FoundationDatabase>;
+  return {pool,read:()=>readEffectiveConfiguration(database,actor,ec),reads:()=>reads};
+}
+
+describe.skipIf(!enabled)("EC reader SQL on existing local PostgreSQL — read-only CTE fixtures",()=>{
+  it.each(["none","global","different_levels","stored_conflict"] as const)("returns complete coherent metadata for %s",async scenario=>{
+    const f=await fixture(scenario);try {const result=await f.read();expect(result.configuration_definition.version_number).toBe("9223372036854775807");expect(result.layers).toHaveLength(2);
+      expect(result.effective_at).toBe("2026-10-09T00:00:00.000Z");expect(f.reads()).toBe(1);
+      if(scenario==="none")expect(result.layers.map(x=>x.ordinal)).toEqual([1,2]);
+      if(scenario==="stored_conflict")expect(result.resolution_status).toBe("configuration_conflict");
+    }finally {await f.pool.end();}
+  });
+  it.each(["foreign_root","foreign_layer","missing_layer_definition","foreign_layer_definition","missing_override","foreign_override","missing_override_definition","foreign_override_definition","absent"] as const)("conceals %s with404 rather than partial/global access",async scenario=>{
+    const f=await fixture(scenario);try {await expect(f.read()).rejects.toMatchObject({statusCode:404,code:"TCDX.RESOURCE.NOT_FOUND",message:"Resource not found"});expect(f.reads()).toBe(1);}finally {await f.pool.end();}
+  });
+  it.each(["duplicate_key","duplicate_selected"] as const)("returns409 for %s without resolving by order",async scenario=>{
+    const f=await fixture(scenario);try {await expect(f.read()).rejects.toMatchObject({statusCode:409,code:"TCDX.CONFLICT.RESOURCE"});}finally {await f.pool.end();}
+  });
+  it("distinguishes zero persisted layers from invalid references",async()=>{
+    const f=await fixture("empty");try {expect((await f.read()).layers).toEqual([]);expect(f.reads()).toBe(1);}finally {await f.pool.end();}
+  });
+});
diff --git a/apps/backend/src/core-grc/phase6a-configuration-reference-integrity.test.ts b/apps/backend/src/core-grc/phase6a-configuration-reference-integrity.test.ts
--- /dev/null
+++ b/apps/backend/src/core-grc/phase6a-configuration-reference-integrity.test.ts
@@ -0,0 +1,47 @@
+import { describe, expect, it, vi } from "vitest";
+import { PostgresQueryCompiler, type Transaction } from "kysely";
+import type { FoundationDatabase } from "../database.js";
+import { newUuidV7 } from "../uuid.js";
+import type { CoreActor } from "./model.js";
+import { mutations } from "./service.js";
+
+// Compiled SQL/command-boundary evidence; no PostgreSQL execution or RLS claim.
+function fixture(domain: "compliance" | "controls", eligible: boolean, includeEC = true) {
+  const tenantId=newUuidV7(),configurationId=newUuidV7(),methodId=newUuidV7();
+  const compiler=new PostgresQueryCompiler();let inserted=false;
+  const actor:CoreActor={tenantId,membershipId:newUuidV7(),userIdentityId:newUuidV7(),permissions:new Set(),scopes:new Set(),permissionScopes:new Map(),capabilityGroups:new Set(),roles:[]};
+  const executeQuery=vi.fn((query:{sql:string;parameters:readonly unknown[]})=>{
+    if(query.sql.includes("JOIN data.formula_definitions"))return {rows:[{methodology_version_ref:methodId,version_number:1,minimum_coverage:80,...(domain==="compliance"?{partial_compliance_factor:0.5}:{})}]};
+    if(query.sql.includes("FROM config.effective_configurations")){
+      expect(query.parameters).toEqual([configurationId,tenantId,domain]);
+      expect(query.sql).toContain("cd.tenant_id IS NULL OR cd.tenant_id=ec.tenant_id");
+      expect(query.sql).toContain("layer.tenant_id <> ec.tenant_id");
+      expect(query.sql).toContain("ld.configuration_definition_id IS NULL");
+      expect(query.sql).toContain("ld.tenant_id <> ec.tenant_id");
+      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND lo.configuration_override_id IS NULL");
+      expect(query.sql).toContain("lo.tenant_id <> ec.tenant_id");
+      expect(query.sql).toContain("layer.configuration_override_id IS NOT NULL AND od.configuration_definition_id IS NULL");
+      expect(query.sql).toContain("od.tenant_id <> ec.tenant_id");
+      return {rows:eligible?[{effective_configuration_id:configurationId}]:[]};
+    }
+    if(query.sql.trimStart().startsWith("SELECT 1 AS found"))return {rows:[{found:1}]};
+    if(query.sql.startsWith("INSERT INTO")){inserted=true;return {rows:[]};}
+    throw new Error("Unexpected memory executor query");
+  });
+  const transaction={executeQuery,getExecutor:()=>({transformQuery:(node:unknown)=>node,compileQuery:(node:Parameters<PostgresQueryCompiler["compileQuery"]>[0],queryId:Parameters<PostgresQueryCompiler["compileQuery"]>[1])=>compiler.compileQuery(node,queryId),executeQuery})} as unknown as Transaction<FoundationDatabase>;
+  const body={methodology_version_ref:methodId,...(includeEC?{effective_configuration_id:configurationId}:{}),...(domain==="compliance"?{requirement_applicability_id:newUuidV7()}:{control_id:newUuidV7(),control_version_id:newUuidV7()})};
+  const command=mutations.get(domain==="compliance"?"requirementAssessmentCreate":"controlAssessmentCreate")!;
+  return {run:()=>command.execute({transaction,actor,body}),inserted:()=>inserted,executeQuery};
+}
+
+describe("Assessment configuration canonical reference guards",()=>{
+  it.each(["compliance","controls"] as const)("binds all reference checks for compatible %s EC",async domain=>{
+    const f=fixture(domain,true);await f.run();expect(f.inserted()).toBe(true);
+  });
+  it.each(["compliance","controls"] as const)("prevents %s persistence when reference policy returns no eligible EC",async domain=>{
+    const f=fixture(domain,false);await expect(f.run()).rejects.toMatchObject({statusCode:400,code:"TCDX.VALIDATION.FAILED"});expect(f.inserted()).toBe(false);expect(f.executeQuery).toHaveBeenCalledTimes(2);
+  });
+  it.each(["compliance","controls"] as const)("keeps %s EC optional without fabricating a configuration/default",async domain=>{
+    const f=fixture(domain,true,false);await f.run();expect(f.inserted()).toBe(true);expect(f.executeQuery.mock.calls.some(([q])=>q.sql.includes("FROM config.effective_configurations"))).toBe(false);
+  });
+});
```


## Cierre residual 2026-10-09 — paquete único de cinco decisiones

EC R1 no se vuelve a aprobar. La decisión funcional CFG-D consta en26 como DR-STEP6A3-CFGD-FUNCTIONAL-20261009. Las48 filas históricas conservan procedencia/estado; la cobertura técnica actual y los44 pares individuales están en07.residual_closure_20261009. **SOG v2 DRAFT_NOT_EFFECTIVE; STEP6A.3 PARTIAL_BLOCKED; STEP6A.4 NOT_STARTED.** Cada decisión siguiente tiene un único estado PENDING_REVIEW y requiere firmas dentro de la competencia real declarada; Codex no firma ni se autopromueve. Una firma de criterios no es aceptación de pruebas inexistentes.

### DR-STEP6A3-CFGD-SOD-R1

Estado: **PENDING_REVIEW**. Autoridad: Methodology + Configuration + Compliance y Controls/Assurance + Architecture + Data Model + Backend + Security, cada cual en sus cláusulas; autor/revisor/publicador distintos donde SoD lo exija.

Texto exacto adoptable (UTF-8, incluye salto final); SHA-256 `69e6e4c0dc3645b76cfe2f50b07d4ab9d37ebf502d307d243532c8e07386e4a8`:

```text
Adopto para revisión competente las tres cláusulas literales CFG-D-COMPLIANCE-V1, CFG-D-CONTROLS-V1 y CFG-D-PUBLICATION identificadas por sus hashes individuales en este paquete, junto con CFG-D-HISTORY. La firma de autosuficiencia de cada versión debe identificar entradas, reglas publicadas, resultados reproducibles, autor, revisor y publicador conforme al rector. No se permite publicar none por NULL u opcionalidad EC, alterar v1 inmutable, rechazar EC hoy admitida ni exceptuar SoD. Si una regla necesaria no está publicada o no está cerrada, esa versión conserva su contrato vigente y la publicación queda bloqueada hasta el delta específico competente.
```

Operación bloqueada: Publicar configuration_mode=none o modificar create/read metodológico.

Fuentes selladas:

- `docs/phase6a/STEP_6A3/28_CONFIG_CFGD_CONDITIONAL_DECISION_AND_PHYSICAL_RECONCILIATION.md` SHA-256 `28b0f1b9b7a0fa4718b0612f447b81d71dd8a7653e7a3f8bf5458b2333660b48`.
- `docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md` SHA-256 `eedf85debfb5eb48e25d4abdd5ff4332c5dba8197ab7b96a66b97f640cfef4df`.
- `database/migrations/20261007000200_phase5_methodology_binding.sql` SHA-256 `fa178ad731d48045313a11b22f1bdf3c228be502dafa1883136162ad48127850`.

Dependencias: Firmas específicas de las cláusulas indicadas; Fecha efectiva y vínculo/versionado verificables cuando haya publicación; Autorización operacional separada para acciones reservadas. Opciones rechazadas: Aprobación funcional como firma competente; Autopromoción por Codex; Aprobación EC R1 extendida por arrastre. Las consecuencias y límites de seguridad están expresamente contenidos en el texto.

Cláusulas metodológicas originales, sin reescritura:

CFG-D-COMPLIANCE-V1 SHA-256 `77ac7a4a1f94333dbe11cb2d6987c08b75ce0eadfcf719588e667639de1de307`:

```text
Confirmo que BASELINE_COMPLIANCE v1 y su FormulaDefinition v1 publicada, los parámetros tipados minimum_coverage/partial_compliance_factor, las reglas rectoras de status/suficiencia y los inputs/pesos autorizados por Pack son metodológicamente autosuficientes. No requieren EffectiveConfiguration adicional para nuevos usos de esa versión. Apruebo publicar la declaración versionada configuration_mode=none sólo después de revisar su vínculo e inmutabilidad en CFG-D-PUBLICATION y la compatibilidad CFG-D-HISTORY; vigencia será la explícita del manifest firmado. Esta decisión no modifica parámetros, código/version ni resultados históricos
```

CFG-D-CONTROLS-V1 SHA-256 `843b2ea54c7e019d75b5852dfe0edd4844b991d62be40855a2deda291d05a12c`:

```text
Confirmo que BASELINE_CONTROL_EFFECTIVENESS v1 y su FormulaDefinition v1 publicada, minimum_coverage y los inputs/reglas autorizados de diseño, operación, evidencia, recencia, cobertura y conclusión son metodológicamente autosuficientes y no requieren EffectiveConfiguration adicional. Apruebo publicar configuration_mode=none para nuevos usos de la versión exacta sólo tras CFG-D-PUBLICATION/HISTORY, con vigencia explícita del manifest firmado y preservación de referencias/resultados históricos
```

CFG-D-PUBLICATION SHA-256 `b4f4be685090b423a832e51aacc063b8429e41d47ed74f413e6e47e8370bede7`:

```text
revisar un manifest contractual versionado por metodología que asocie su identidad/version exacta, fórmula/version y hash, declaración none, firma y effective interval explícito. No publicar modo en código por comparación con dos nombres; no cambiar filas metodológicas publicadas inmutables. Architecture/Methodology/Data Model/Backend deben aprobar si la declaración adicional preserva el significado original de v1 o exige nueva versión metodológica. Si exige v2 o un vínculo físico adicional, detener publicación y preparar delta exacto para decisión competente/PO donde afecte dirección; no inventar schema. Enlace a release/traceability existente puede probar provenance sólo después de aprobación verificable. No asumir que audit JSON genérico ya satisface ese binding.
```

### DR-STEP6A3-CT-RBAC-R1

Estado: **PENDING_REVIEW**. Autoridad: Architecture + Backend + Security + Compliance + IAM + Evidence/Remediation + Privacy/Legal + Data Model, según C-01..C-08 y D01/D02.

Texto exacto adoptable (UTF-8, incluye salto final); SHA-256 `c1ae7f1adc4d183737950469a174b6aa925eb54c9b79275a1821596c8878d901`:

```text
Apruebo para publicación contractual local los candidatos 20 §§4–10 y 27 íntegros identificados por hash: las tres lecturas CT01/CT03/CT04, las extensiones exactas de recursos/permissions del rector22 y los 44 pares F13/M17/R14 exclusivamente para los propósitos y policies allí definidos. Platform no obtiene autoridad tenant; selección exige command grant independiente; historia sólo FK exacta del parent autorizado. Apruebo C-03B/C-04W como deltas de revalidación transaccional. C-04G-3 conserva DENY de contractual/hold global sin binding: ese DENY no acredita aplicabilidad jurídica ni cierre de CT04. Para RBAC-D01 adopto el catálogo de cinco roles action.create, excluyendo AUDITOR; el seed extra exige una futura compensación auditada separadamente autorizada. Para RBAC-D02 adopto los once lectores contractuales de Requirement como distribución futura explícita, independiente de F13. No autorizo ejecución de seeds, grants, revocaciones, DDL, QA, IAM ni deploy con esta firma documental.
```

Operación bloqueada: Registrar endpoints CT01/03/04, publicar permissions/grants o compensar D01/D02.

Fuentes selladas:

- `docs/phase6a/STEP_6A3/20_P_RBAC_PUBLICATION_DECISION_PACKET.md` SHA-256 `5d6768ed6b806f5795d387dd3bd48ba0f744c60002c4e36d1a1452a69ea592af`.
- `docs/phase6a/STEP_6A3/27_RBAC_CONTRACT_PUBLICATION_CANDIDATE.md` SHA-256 `029ba9a9e2a0f13a726b3133bd43be71b2caf209ecb11c6381074da40a1bf247`.

Dependencias: Firmas específicas de las cláusulas indicadas; Fecha efectiva y vínculo/versionado verificables cuando haya publicación; Autorización operacional separada para acciones reservadas. Opciones rechazadas: Aprobación funcional como firma competente; Autopromoción por Codex; Aprobación EC R1 extendida por arrastre. Las consecuencias y límites de seguridad están expresamente contenidos en el texto.

### DR-STEP6A3-VOC52-R1

Estado: **PENDING_REVIEW**. Autoridad: Owners de cada familia + Architecture + Backend + Security + Data Model + QA para criterios; no sustituibles por dirección PO.

Texto exacto adoptable (UTF-8, incluye salto final); SHA-256 `88e5c0020406fd2eb4821d764fa231b2386faa8a91ac59365eb33d03e2040e71`:

```text
Apruebo para publicación contractual versionada las 52 filas exactas del CSV22 y el manifest29 identificados por hash, con las reglas23/30 y las 26 ocurrencias. Cada owner firma su familia; CV08-I/A/C requiere las tres decisiones; los códigos históricos upload/uploaded se conservan sin coerción ni alias. Las fechas efectivas y la versión de publicación deben constar expresamente en la firma antes de generar contratos activos. No se habilitan selectores ni enforcement mientras falte una firma requerida, vigencia o provenance verificable por ocurrencia. CV14 no concede IAM; valores opcionales NULL no adquieren defaults. No autorizo cambios físicos ni importación normativa.
```

Operación bloqueada: Publicar enums, activar dropdowns/validaciones, reinterpretar historia.

Fuentes selladas:

- `docs/phase6a/STEP_6A3/22_P_VOC_CANONICAL_VALUE_PROPOSALS.csv` SHA-256 `8a9669d3389eba33be3640756777c35642a5d910567082cdd1fc12bf91c66239`.
- `docs/phase6a/STEP_6A3/23_P_VOC_DECISION_AND_PROVENANCE.md` SHA-256 `de3feae44235a7cdc905671f75769d3606f5c61b7bf8314f0fd32be87df7bab3`.
- `docs/phase6a/STEP_6A3/29_VOC_PUBLICATION_MANIFEST_CANDIDATE.csv` SHA-256 `5106f98f64a950ed7dddb5618f14a11864b166421be1dac7613682863492dc5e`.
- `docs/phase6a/STEP_6A3/30_VOC_TECHNICAL_SIGNOFF_AND_COMPATIBILITY.md` SHA-256 `d20d1bfa04f61c43b5c7fdb6767cf5c2046a68b24a33ef4d7638b6afdd733c0e`.

Dependencias: Firmas específicas de las cláusulas indicadas; Fecha efectiva y vínculo/versionado verificables cuando haya publicación; Autorización operacional separada para acciones reservadas. Opciones rechazadas: Aprobación funcional como firma competente; Autopromoción por Codex; Aprobación EC R1 extendida por arrastre. Las consecuencias y límites de seguridad están expresamente contenidos en el texto.

### DR-STEP6A3-UQ-DEFAULT-R1

Estado: **PENDING_REVIEW**. Autoridad: Data Model + Architecture + DBA/Backend para diseño y disponibilidad; autorización operacional DDL independiente.

Texto exacto adoptable (UTF-8, incluye salto final); SHA-256 `314f8cf7d5792e2a4ea8c039f548042e1eaf0ad2ec3f233cdab3bb8a7d3ff764`:

```text
Apruebo exclusivamente el diseño forward-only identificado por los hashes de preflight.readonly.sql, forward-only.candidate.sql y constraints.isolated.prepared.sql, fuera de las migraciones activas: claves canónicas EC NULLS NOT DISTINCT y layers por parent/nivel/ordinal; exactamente un default compatible con el value_type del candidato. Data Model debe adoptar expresamente el mapping de tipos y su efecto sobre drafts antes de activarlo. Datos incompatibles bloquean, sin backfill inventado, borrado o renumeración. Las constraints nuevas preceden al retiro de las tres constraints heredadas enumeradas; PK/FK/tenant UQ permanecen. Asignar un nuevo ID mediante el ledger de migraciones canónico después de revisión, nunca modificar SQL histórico. La firma aprueba diseño y preparación; no autoriza ejecutar DDL, migrar bases existentes o modificar QA.
```

Operación bloqueada: Activar migration, ejecutar DDL/backfill o retirar constraints vigentes.

Fuentes selladas:

- `docs/phase6a/STEP_6A3/physical-reconciliation/constraints.isolated.prepared.sql` SHA-256 `445249e12448cf16054f96366c35b98a6999b2d8cbf2eecd9e3b68d45feaab72`.
- `docs/phase6a/STEP_6A3/physical-reconciliation/forward-only.candidate.sql` SHA-256 `becec9afbe1f7b91c5dca3641c8979639a7d57c6dd6b1136ce13ee83776a2893`.
- `docs/phase6a/STEP_6A3/physical-reconciliation/preflight.readonly.sql` SHA-256 `6c1a3b70543352ad043ed29e8a43a58bb21db73174c67d3a30e6ab3518e4a3d1`.

Dependencias: Firmas específicas de las cláusulas indicadas; Fecha efectiva y vínculo/versionado verificables cuando haya publicación; Autorización operacional separada para acciones reservadas. Opciones rechazadas: Aprobación funcional como firma competente; Autopromoción por Codex; Aprobación EC R1 extendida por arrastre. Las consecuencias y límites de seguridad están expresamente contenidos en el texto.

### DR-STEP6A3-EXTERNAL-ACCEPTANCE-R1

Estado: **PENDING_REVIEW**. Autoridad: QA/Release + Security + Backend + owners de dominio; aceptación humana basada en ejecución real.

Texto exacto adoptable (UTF-8, incluye salto final); SHA-256 `1f1bb66be0e14fb19a3dc40ba092a049eed58ef6a749a8f30ed1b8dfd2103ac1`:

```text
Apruebo el plan de aceptación por cláusula C-08/CFG-QA/VOC-QA y la separación de evidencia: unit/Fastify.inject con mocks, SQL CTE local read-only, constraints aisladas pendientes de autorización DDL, QA, IAM real y E2E externo. El PASS de 16 SQL locales no acredita RLS, QA, IAM o E2E. La aceptación externa sólo puede firmarse después de ejecutar su evidencia real bajo autorización operacional específica; no se autoriza acceso o mutación de QA, credenciales, deploy, SOG v2 ni STEP6A.4 mediante esta aprobación de criterios.
```

Operación bloqueada: Declarar QA/IAM/RLS/E2E externo PASS o cerrar STEP6A.3 sin evidencia.

Fuentes selladas:

- `docs/executable-contracts/10_TEST_CONTRACTS.md` SHA-256 `072e0a3d20ac3a1c6b2642f936d6a1458a9726db8d0ba6e3ab0a27ac1d4dcb18`.
- `docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md` SHA-256 `8665388d1e892fd45b519bb0d567bf66763347b9d6769f33a5fef14ed6f8c53e`.

Dependencias: Firmas específicas de las cláusulas indicadas; Fecha efectiva y vínculo/versionado verificables cuando haya publicación; Autorización operacional separada para acciones reservadas. Opciones rechazadas: Aprobación funcional como firma competente; Autopromoción por Codex; Aprobación EC R1 extendida por arrastre. Las consecuencias y límites de seguridad están expresamente contenidos en el texto.


### Continuidad UQ/default R2 — decisión funcional nueva y datos existentes

La decisión funcional DR-STEP6A3-UQDEFAULT-FUNCTIONAL-20261009 consta en26. El candidato R1 anterior se conserva como historia **SUPERSEDED_DRAFT**; no fue publicado. Sus fuentes SQL fueron revisadas en R2, por lo que sus hashes anteriores no describen el candidato vigente. El texto R2 siguiente reemplaza sólo la decisión de diseño UQ/default dentro del paquete único de cinco grupos. Las otras cuatro decisiones y EC R1 permanecen intactas.

DR-STEP6A3-UQ-DEFAULT-R2 — **PENDING_REVIEW**. Autoridad: Data Model + Architecture + DBA/Backend para diseño y disponibilidad; autorización operacional DDL independiente. SHA-256 UTF-8 con salto final `c8b966f03a567fd6095d7ef7ae29aee8b6898d8c5df90c452df9c8241a0391b0`.

```text
Apruebo exclusivamente el diseño UQ/default R2 identificado por los hashes de los cuatro archivos SQL de physical-reconciliation. Adopto como objetivo las claves canónicas de Physical01:228/229 y el default tipado de Physical01:224/TypeCatalog10:39. La revisión Data Model/Architecture/DBA debe verificar los guards de estructura fuente, constraints validadas, referencias tenant/global compatibles, claves NULL-safe, cardinalidad y mapping de tipos antes de asignar un ID nuevo en el ledger canónico. No se alteran valores, historia, PK/FK/tenant identity UQ ni migraciones anteriores. Cualquier dato incompatible, constraint inesperada, lock timeout o fallo de validación aborta toda la transacción antes de retirar las restricciones heredadas. Las15 pruebas CTE de predicados no reemplazan tests nativos de constraints, concurrencia, migración sobre datos existentes y recuperación en una BD descartable autorizada. Después de admitir cardinalidades canónicas nuevas, la recuperación es forward-only: no reinstalar constraints globales ni borrar historia. Esta firma aprueba diseño y preparación; no autoriza DDL sobre ninguna base, QA, publicación contractual o deploy.
```

Fuentes exactas del R2:

- `docs/phase6a/STEP_6A3/physical-reconciliation/constraints.isolated.prepared.sql`: `445249e12448cf16054f96366c35b98a6999b2d8cbf2eecd9e3b68d45feaab72`.
- `docs/phase6a/STEP_6A3/physical-reconciliation/existing-data.predicates.readonly.sql`: `4192773194fee44a099e3c6b71a4b249f0f22da2749a215da1c86d1b68768b97`.
- `docs/phase6a/STEP_6A3/physical-reconciliation/forward-only.candidate.sql`: `d20b7778e62e5ad3c94d7bcfba1eb7b9e43763e3e713f4fea83221ab6d3531f5`.
- `docs/phase6a/STEP_6A3/physical-reconciliation/preflight.readonly.sql`: `6c1a3b70543352ad043ed29e8a43a58bb21db73174c67d3a30e6ab3518e4a3d1`.

La fuente26 citada por la decisión de aceptación externa es un ledger append-only: su hash sellado corresponde al prefijo anterior a «Recepción consolidada pendiente», cuya longitud exacta se registra en07, no al archivo mutable completo. Se preservan los bytes adoptables y sus hashes.
