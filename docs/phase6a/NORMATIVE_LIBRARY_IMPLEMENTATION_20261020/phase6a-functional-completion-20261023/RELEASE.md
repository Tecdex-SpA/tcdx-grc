# Cierre funcional Fase6A — implementación y verificación 2026-10-23

Ejecución PHASE6A_FUNCTIONAL_COMPLETION_NORMATIVE_HOMOLOGATION_CONTRACTING.
Baseline activa TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16.
Fase POST_STEP6A4_PRE_STEP6A5. STEP6A5/6A6 no autorizados.
Base main=c2a774f1f55b1edc3abc347ed155c4730d18fe31; PR25 MERGED/CI SUCCESS.
Rama feat/phase6a-functional-completion-20261023. PR26/ui-premium-review intacto.

## A — Estado inicial y final

| Indicador QA | Inicial declarado | Final verificado |
| --- | --- | --- |
| Marcos aprobados |6|6|
| Estructurados completos / homologados |0/0|0/0; cinco poblaciones draft conservadas|
| Publicados / contratables / contratados oficiales |0/0/0|0/0/0|
| Ley21663 |Sin materializar|Adaptador canónico corregido y PG16 verificado; sin import QA|
| B04 |Dos create; sin review/decide|Mismo estado QA; circuito automatizable probado en PG16|
| Ticket |PDF editable|Plantilla conservada; emisión bloqueada por binding contractual ausente|
| Backend/frontend/DB |PASS histórico|PASS inspección actual; no despliegue ni cambios QA|
| Matrices |Evidencia previa parcial|333relaciones/6cabeceras inspeccionadas sin defectos referenciales; lector PG16 probado|
| Implementación importador |Persistencia incompleta|PASS local del slice descrito abajo|
| Cierre integral |BLOCKED/PARTIAL|BLOCKED/PARTIAL; no cierre artificial|

## B — Marcos y fuentes

| Marco | Emisor/fuente y edición | Derechos | Estructura QA | Homologación/validación | Publicación/contratación | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
|ISO_9001_2015|[ISO](https://www.iso.org/standard/62085.html),2015+Amd1:2024|Fuente licenciada no acreditada|35unidades/35requisitos,draft|Coverage0,no homologación auténtica|0/0|QA entry,sources/coverage|
|ISO_9001_2026|[ISO](https://www.iso.org/standard/9001),edición6,2026|Fuente definitiva licenciada no acreditada|35/39,draft|Coverage0,propuestas separadas|0/0|QA entry+catálogo oficial|
|ISO_IEC_27001_2022|[ISO/IEC](https://www.iso.org/standard/27001),2022|No acreditados para texto oficial|105/7,93controles,draft|Coverage0|0/0|QA entry+metadata oficial|
|ISO_IEC_42001_2023|[ISO/IEC](https://www.iso.org/standard/42001),2023|No acreditados para texto oficial|55/7,38controles,draft|Coverage0|0/0|QA entry+metadata oficial|
|CL_LEY_21719|[BCN21719](https://www.bcn.cl/leychile/navegar?idNorma=1209272&idVersion=2026-12-01)+Ley19628 consolidada,2026-12-01|Fuente pública legal; no licencia ISO exigida|30/30,draft;vigencia futura preservada|Coverage100 declarado,approved_by/atNULL; no publicación acreditada|0/0|QA entry+BCN|
|CL_LEY_21663|[BCN](https://www.bcn.cl/leychile/navegar?idNorma=1202434),Ley Marco de Ciberseguridad|Fuente pública localizable; cotejo del payload pendiente|0/0 en QA|No import/homologación auténticos; capacidad de persistencia PG16 probada|0/0|ZIP candidatos+pruebas PG16|

Metadatos externos no prueban integridad o licencia del archivo recibido.
ISO2015 figura retirada/reemplazada por2026 en el catálogo; se preservan ambas
identidades e historia según rector41. Ningún estado comercial fue alterado.
H04 conserva cero instancias atestadas; no se inventan proofs ni derechos.
Metadatos, referencias/editorial y cuerpos protegidos permanecen separados.
La ausencia de derechos de una ISO no bloquea conceptualmente las dos leyes.

## C — Implementación real

Código ee2dee72f7683c5ea3c8b86bc9936687a41514d6:
- regulatory/model.ts: entrada interna con jurisdicción, vigencias por disposición,
  versiones explícitas de controles/correspondencias y procedencia por relación.
  Son columnas canónicas ya aprobadas; no nueva API, schema o entidad.
- regulatory/postgres-repository.ts: crea cabecera canónica de cualquiera de los
  seis códigos dentro de la misma transacción; preserva fuentes/controles existentes;
  conserva intervalos propios y no asigna una fecha uniforme a Ley21663.
  Completa columnas obligatorias de los tres crosswalks; destinos globales exactos,
  rechazo de ambigüedad y ausencia, sin LIMIT1 ni adopción de privados.
- regulatory/pipeline.ts y repository.ts: lock transaccional por pack bajo
  READ COMMITTED, replay concurrente y rechazo de drift de edición/checksum.
  Publicación interna exige el ID/hash/import exactos persistidos.
- regulatory/validator.ts: validaciones de campos, versiones, temporalidad,
  procedencia, duplicados y confianza finita; los packs nominales vacíos y
  crosswalks sin revisar no son candidatos listos para publicación.
- regulatory/pipeline.test.ts y pipeline.postgres.test.ts: guardas y persistencia
  física, seis códigos sintéticos, tres tipos, no_matchNULL, rollback,
  replay concurrente, aislamiento global/privado, versiones y lector matricial.
- scripts/regulatory/run-pipeline-postgres-tests.sh: procedimiento reproducible,
  contratos compilados,36migraciones intactas en PG16 desechable, validación de
  schema y parada verificada; no copia datos QA.
- Test-only9bb59eff2bc27283fc950db1de26d981096115ef:
  core-grc/vocabulary-provenance.test.ts corrige el dato negativo aleatorio UUID,
  sin modificar el validador productivo ni su expectativa DENY.

Autoridad: D02/D03/D06, B01/B07/B08, rectores37/41/44 y contrato12 de concurrencia;
modelo físico09 y migración contractual20260928000400 ya vigente.
Los ZIP originales se preservan; son preparación, no autoridad sobre la baseline:
76f31d9effc174e0d9133615c1e979a13f9b1f1c1b1ef291197ea2c4f129d68c y
4b7d7374fc0a09be9697ff9784f093c2b737edbaabe82460c3aa7c64659f9aee.
Su revisión interna declara especificación/no homologación completada.
D01–D09 no se reabren ni se solicita aprobación conceptual otra vez.

## D/E/F — Fronteras operacionales

B04: ejecución humana exacta preparada en VALIDATION. Dos identidades activas,
sin operación por el agente en nombre de Mario. No hay audit review/decide real.
Contratación: Subscription/PlanVersion y tres accesos QA provisionales preservados;
cero asignaciones oficiales. El catálogo vacío responde a gates reales.
Ticket: contrato QA_TICKET_COMMERCIAL_20261022 lo sitúa fuera del dominio y exige
binding ejecutable antes de solicitud/aprobación persistida. No se utiliza
Document/Evidence/auditJSON como sustituto de una entidad no autorizada.
Publicación HTTP: el contrato03 describe Reason+ETag y OpenAPI02 aún remite a
DomainCommandRequest genérico; falta binding de CAS y recibos auténticos.
No se publica un endpoint de conveniencia que confíe en flags del cuerpo.

RECTOR_GATE=BLOCKED para cierre integral; integridad del slice implementado PASS.
INTEGRATED_RELEASE_GATE=PARTIAL. Las causas/owners/unlock están en RESULT.
No merge, despliegue, import QA, permisos nuevos, cambios visuales o producción.

PR funcional: https://github.com/Tecdex-SpA/tcdx-grc/pull/27. Estado/HEAD/CI finales se verifican en ese PR; no fusionar automáticamente.

## H/I/J — Git, bloqueos e integridad

PR funcional27,base mainc2a774f,fuentes ee2dee7/9bb59ef; commits preservados,
sin force push ni merge. Handoff y checks vigentes en el PR.
RESULT.BLOCKERS identifica causa,dependencia,evidencia,acción,owner y condición
de desbloqueo para cada impedimento, sin exigir nueva aprobación conceptual.

NO_NEW_TECHNICAL_DEBT: sin TODO,compatibilidad,shadow model o bypass nuevos.
NO_NEW_HARDCODES: no IDs/tenants/usuarios/contenidos normativos en código nuevo;
los fixtures son explícitos y sólo ejecutables en clústeres locales propios.
NO_UNAUTHORIZED_SCOPE: cambios limitados a persistencia/validación contractual
y fixture de prueba necesario para una regresión reproducible.
NO_UNAUTHORIZED_SCHEMA_CHANGES y NO_UNAUTHORIZED_RBAC_CHANGES: diffs vacíos
en database,modelos físicos,contratos ejecutables y catálogos/grants.
NO_FUNCTIONAL_REGRESSIONS: suites aplicables PASS; no se afirma E2E no ejecutado.
NO_VISUAL_CHANGES: cero diff en apps/frontend y docs/ui; PR26 intacto.
NO_PRODUCTION_CHANGES: no contacto de escritura o despliegue productivo.
Estas declaraciones se acotan al diff y evidencias de esta ejecución.
