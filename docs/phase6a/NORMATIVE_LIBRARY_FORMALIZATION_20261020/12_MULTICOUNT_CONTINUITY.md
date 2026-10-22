# 12 — Continuidad autocontenida entre cuentas Codex

## Autoridad y checkpoint recibido

```text
PROJECT=GRC_TECDEX
ACTIVE_BASELINE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16
CURRENT_WORK=Biblioteca Normativa, Estructuración y Homologación Regulatoria
STEP6A3=PASS
STEP6A4=PASS
PO_DECISIONS=D01_D09_APPROVED
IMPLEMENTATION_AUTHORIZATION=NOT_GRANTED
CANONICAL_DOMAIN=https://grc.tecdex.net/
NEXT_ACTION=FORMALIZE_TASK_PACKET_AND_BINDINGS
```

Este bloque conserva el checkpoint recibido. El task packet y los bindings candidatos ya están preparados: no repetirlos. El siguiente trabajo técnico es su publicación contractual, **sólo cuando una orden posterior lo autorice**. El campo NEXT_ACTION recibido no concede permiso de activar contratos o implementar. El estado maestro rector no fue editado. El nombre está aprobado; no se crea una fase numérica.

Fecha: 2026-10-20. Checkout observado: `/Users/andresbarouh/repos/tcdx-grc`; rama `fix/step6a3-v112-continuity-20261016`; HEAD `4a275264a7522031e62bf09f598c9d56e21d25e0`. Índice y archivos previos se preservan, incluidos cambios ajenos. evidence/ENTRY.json y FINAL_INTEGRITY.json acreditan el alcance. Otra cuenta debe localizar su checkout por autoridad y estado real; no hacer checkout/reset al HEAD observado.

## Orden de lectura

1. AGENTS.md, `docs/rector/baseline/46_REGENTE_MAESTRO_DEL_DESARROLLO.md` y `docs/governance/CODEX_RECTOR_ENFORCEMENT.md`.
2. `docs/rector/ACTIVE_ACTIVATION.json`, BASELINE_ID/BASELINE_STATUS/RECTOR_MANIFEST. La activación v1.12 se acredita mediante manifiesto `cdd0165364e50dee176c8a8ec8cf7c1f55a5905f4febd91c63459583c9faec85`; los encabezados históricos de candidata no sustituyen el acto de activación.
3. `docs/governance/MASTER_EXECUTION_STATUS.md` y cierres STEP6A3/6A4. Los expedientes de diagnóstico/formalización no crean otro estado maestro.
4. En esta carpeta: 01_PO_DECISIONS.md, 04_BINDING_RESOLUTION.md, 09_TASK_PACKET.md, 10_TRACEABILITY_MATRIX.csv, 11_ACCEPTANCE_CRITERIA.md, 13_CONSOLIDATED_RESULT.md, RESULT.json y SHA256SUMS.txt.
5. Diagnóstico sellado `docs/phase6a/NORMATIVE_PACKAGE_RECTOR_REVIEW_20261020/`: REPORT, matrices, inventarios, evidencias y sello. Sus decisiones conceptuales pendientes quedan respondidas por el registro 01 actual; no se vuelven a preguntar.

Toda evidencia necesaria está en repositorio. No se depende de /tmp, este chat, herramientas particulares, sesiones de navegador, tokens o credenciales de otra cuenta. SOURCES_SHA256.json fija las fuentes consultadas. evidence/POPULATIONS.json indexa los 211+104 y los ZIP originales.

## Decisiones que se conservan

D01 nombre y alcance integral; D02 Ley 21.663 como sexto ámbito sin tabla propia; D03 usos internos sin bloqueo comercial general y con derechos concretos; D04 tres capas y COMPRENDER/IMPLEMENTAR/DEMOSTRAR; D05 cuatro ajustes y aprobación empresarial real; D06 aplicabilidad y seis cruces tipados; D07 miniaturas y vista completa preferente en Riesgos; D08 preparación IA y destino futuro ia-engine/192.168.2.44; D09 métodos conservadores. El texto completo y sus condiciones están en 01.

No afirmar 315 obligaciones: son 211 candidatos y 104 propuestas independientes. FORM-05 conserva PASS; las otras 41 operaciones siguen sin acreditación en STEP6A6. No repetir formularios, reabrir STEP6A4 o modificar sus evidencias.

## Resoluciones y pendientes técnicos

| Binding | Preparado | Pendiente antes de implementación |
| --- | --- | --- |
| B01 | Sexto código candidato CL_LEY_21663, motor genérico | Delta de rector 41/allowlist/metadatos/manifiestos/policies |
| B02/B03 | KnowledgeItem/Version y relación soporte tipada a cuatro targets; contexto versionado | Modelo lógico/físico, custodia, esquemas y permisos/grants global/tenant efectivos |
| B04 | Destino ControlVersion en Override/EC y cuatro Definitions | FKs/índices/scopes, valores y vocabulario de confirmación operativa publicados |
| B05/B06 | GRC Manager como aprobador con grant limitado propuesto; ciclo/ETag/hash/audit | Grant actual NONE; contratos, transiciones y predicados SoD/policy por publicar |
| B07 | Applicability/crosswalk existentes; FK candidata al contexto | Delta de procedencia; homologación de seis cruces; referencias normativas críticas que no sean parent requieren binding tipado si se necesitan |
| B08/B09 | Lector común de miniaturas/matrices; navegación Riesgos separada de sus transacciones | Esquemas/permisos/UI autorizados; preferencias/exportación sólo con binding |
| B10 | Divergencia ia-engine/ia2 registrada | Reconciliación ADR/contrato/seguridad en la integración IA futura |
| B11 | Métodos, estados e historia conservados | Ningún cambio metodológico autorizado por este packet |

Son diferencias técnicas acreditadas, no decisiones funcionales reabiertas. Un catálogo de grants no prueba permisos efectivos de actores QA. Derechos por uso y publicación oficial siguen por fuente/paquete, sin barrera comercial general para toda la biblioteca.

## Reanudación y verificación reproducible

1. Revisar ruta, AGENTS, rama/HEAD, índice y git status; preservar todo.
2. Verificar baseline/estado maestro y los sellos, sin regenerar evidencia histórica. Desde la raíz del repositorio, `shasum -a 256 -c docs/phase6a/NORMATIVE_LIBRARY_FORMALIZATION_20261020/SHA256SUMS.txt` verifica esta entrega. Los manifiestos históricos indican sus rutas base; respetarlas.
3. Ejecutar las comprobaciones rectoras no destructivas: `bash scripts/verify-rector-governance.sh` y `bash scripts/test-rector-governance-status.sh`. Sus PASS no conceden autorización de implementación.
4. Leer los entregables de entrada y abordar sólo cambios demostrados o pendientes enumerados. No repetir inventarios, extracciones o aceptaciones selladas sin causa.
5. Identificar el último entregable válido por hashes y recibos, no por un PASS aislado o por la fecha de un archivo. Si el nuevo mandato sólo autoriza documentación, limitarse a ella.
6. La siguiente acción técnica propuesta es preparar/publicar los deltas concretos de 04 por la gobernanza existente cuando se permita editar/activar contratos. No falta una nueva aprobación conceptual D01–D09.

## Conflictos entre cuentas y restricciones

Ante resultados distintos, preservar ambos; no fusionar ni sobrescribir evidencia sellada. Comparar baseline efectiva, contratos, decisiones PO y hashes; identificar divergencia e impacto y resolver por la autoridad rectora. Las cuentas no alteran unilateralmente decisiones PO ni crean estados operativos contradictorios. MASTER_EXECUTION_STATUS sólo se actualiza con autorización y transición válidas.

Origen público único: https://grc.tecdex.net/. No alias, fallback o DNS compensatorio. No credenciales ni estado de sesión. No scripts ZIP. No conexión a ia-engine ni sustitución de ia2. No código, contratos activos, DB, migraciones/importaciones, permisos, QA, despliegues, cambios de rama, stage, commits, push, merge, releases, STEP6A5 o STEP6A6. Este expediente no declara biblioteca desplegada, fuentes homologadas ni pruebas de implementación ejecutadas.
