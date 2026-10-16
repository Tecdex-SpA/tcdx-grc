# STEP 6A.3 — decisión condicional C-04W / CFG-D y task packet

`TASK_ID=STEP6A3-C04W-CFGD-20261014`  
`STATUS=HUMAN_FUNCTIONAL_DECISION_RECEIVED_CONTRACT_PUBLICATION_BLOCKED`  
`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14`  
`CODEX_VARIATION_BUDGET=ZERO`  
`STEP_6A3=PARTIAL_BLOCKED`  
`STEP_6A4=NOT_STARTED`

## Decisión recibida y comprobación previa

El usuario se identifica en su mensaje del 2026-10-14 como Product Owner y
aprueba **condicionalmente** el candidato
`docs/phase6a/STEP_6A3/C04W_CFGD_RESIDUAL_DECISION_CANDIDATE_20261014.md`,
esperando SHA-256
`3487fd9fa032e5d311b37361ff673c335fba63c9736110b2c7200581370fd8dd`.
El archivo existe y `shasum -a 256` produjo exactamente ese valor. Contiene
exclusivamente las dos secciones materiales C-04W y CFG-D, más sus límites de
gate. No se sustituye el texto de la decisión humana ni se inventa una firma,
identidad nominal o instante efectivo. La identidad nominal y fecha efectiva
de publicación permanecen sin acreditar en este receipt; la fecha declarada
del mensaje no es `effective_at` de un contrato.

La decisión cierra la **dirección funcional**: RetentionPolicy tenant-owned
configurable por Tenant Admin, fuentes documentales aportadas por el tenant,
relación tipada fuente/policy-versión/objetos; v1 metodológicas y EC opcional
preservadas, sin modo `none` ni reescritura histórica. No autoriza DDL, grant,
publicación de contratos derivados, QA, despliegue ni aceptación integral.

## Compatibilidad con la baseline y dependencia de publicación

- Rector 23 §§6,8 conserva baseline operacional, precedencia, legal hold y
  fuente normativa/contractual versionada. Rector 24 §§3–5 conserva scan-PASS,
  separación de FileObject/Evidence y provenance. El candidato los preserva.
- Rector 30 §1 subordina las relaciones nuevas al catálogo 33; rector 33 §
  Regla de implementación física prohíbe materializar una entidad semántica no
  catalogada. La relación versionada de aplicabilidad aprobada conceptualmente
  aún no está en 30/33 activos. Requiere baseline sucesora candidata completa,
  aprobación de bytes y activación conforme al rector 47 **antes** de modelo
  físico/DDL/backend dependiente. No editar v1.9 en sitio.
- Rector 17/19/23/29/35/38 y contrato ejecutable 27 permiten conservar las
  metodologías v1 y EC opcional, con status no válido ante falta de inputs.
  Las cláusulas pendientes `CFG-D-COMPLIANCE-V1`, `CFG-D-CONTROLS-V1` y
  `CFG-D-PUBLICATION` del ledger 26 exigían autosuficiencia v1 y publicación
  de modo. El reemplazo literal del candidato está aprobado como dirección
  contractual, pero no se marca PASS mientras el cálculo/assessment pueda
  afirmar `valid` sin probar sus inputs obligatorios.

## Alcance técnico autorizado para preparar, sin activar

Fuentes: candidato SHA-256 anterior, rectores 17/19/23/24/29/30/33/35/38/
45/46/47/49; modelo físico 01 y enmienda FileUploadIntent Phase 5; contratos
ejecutables 05/14/27; ledger STEP 6A.3 26; evidencia QA existente.

Artefactos de preparación permitidos: este expediente append-only y copias
candidatas de baseline sucesora, modelo físico, contratos ejecutables,
manifest/hash, migración forward-only **no integrada ni ejecutada**, pruebas
locales dirigidas y análisis de compatibilidad read-only. Prohibidos: editar
baseline v1.9 activa, migraciones históricas, datos QA/producción, grants,
IAM, despliegue, commit/push/merge y STEP 6A.4 sin gates propios.

Entidades afectadas: RetentionPolicy, su relación de aplicabilidad aún no
publicada, EvidenceVersion/DocumentVersion, FileUploadIntent, FileObject,
Evidence; ComplianceMethodology, ControlEffectivenessMethodology,
EffectiveConfiguration, RequirementAssessment, ControlAssessment. Tenants:
ninguno seleccionado; toda relación futura será tenant-owned o aplicabilidad
global expresamente modelada, jamás por ID de cliente. No se crea un segundo
motor de retención ni catálogo metodológico.

Comportamiento exigido: policy configurada no implica fuente aportada ni
cumplimiento; fuente scan-PASS no implica validez jurídica; selección, finalize
y Evidence revalidan tenant, policy/version, intervalo, ámbito, prioridad y
hold bajo concurrencia; conflictos fallan cerrados. EC NULL no significa
autosuficiencia; `valid` exige entradas y evidencia suficientes; ausencia,
staleness y conflicto propagan el `result_status` rector. Historia inmutable.

Pruebas de aceptación posteriores: creación y lectura Tenant Admin sólo en su
tenant; DENY cross-tenant/Platform/no grant; SoD de aprobación; source upload
real scan-PASS, hash, link versionado y contexto; políticas concurrentes,
precedencia, hold y no reducción; cadena upload→file→evidence; replay/CAS;
ausencia de fuente y status no acreditado; v1/EC con y sin referencia; inputs
faltantes, fuente caduca/conflictiva, status y lineage; PostgreSQL 16, API,
UI si cambia, QA del slice y gates rectores. Pruebas previas comerciales/IAM
sin cambios no se repiten.

## Decisiones materiales que la aprobación condicional no resolvió

1. **Representación canónica/física exacta de C-04W:** nombre/identidad de la
   relación de aplicabilidad, claves, cardinalidades, ámbito tenant/Subject/
   actividad/clase, versionado, source EvidenceVersion/DocumentVersion,
   tratamiento de fuentes ausentes durante el primer upload, relación tipada
   a los tres objetos, reglas para filas históricas y garantía transaccional.
   Hay más de una representación válida; rector 45 §3 impide escogerla por
   inferencia. Owner: PO en funciones Architecture/Data Model/Privacy/Security.
2. **Delta exacto de permisos:** contrato 05 concede read/create/update/review/
   publish a Privacy Manager u otros roles, no a Tenant Admin; approve es de
   Legal Reviewer con SoD. La decisión funcional no fija qué RolePermission
   específicos añade al Tenant Admin ni autoriza publicación de grants.
   Owner: PO en funciones Security/Privacy/Architecture.
3. **Suficiencia CFG-D:** el guard actual de `requirementAssessmentSubmit`
   conserva `result_status` enviado por el caller; `controlAssessmentSubmit`
   comprueba aritmética/cobertura, pero no todas las relaciones de evidencia,
   recencia, procedencia y conflicto por versión. Rector 17/19/38 no suministra
   valores o categorías completas para inferir una regla consumidora.
   Un reemplazo editorial no acredita operación `valid`. Owner: PO en funciones
   Methodology/Compliance/Controls/Architecture, con fuentes oficiales.
4. **Legal hold C-04W:** el modelo físico permite `retention_seconds` nulo
   para una duración no acotada, pero `createRetentionPolicy` y
   `updateRetentionPolicy` exigen un entero no negativo para todo `policy_kind`.
   El contrato 09 sólo publica `draft → under_review → approved → published`;
   no define cómo se libera un hold ni quién puede hacerlo. No convertir un
   hold en un plazo finito ni usar una actualización de draft para levantarlo.
   Se requiere la regla contractual exacta de duración, levantamiento,
   autoridad, SoD, auditoría y efecto en objetos ya vinculados antes de
   implementar o declarar PASS. Owner: PO en funciones Privacy/Legal,
   Architecture, Security y Data Model.

Estos puntos bloquean código dependiente y PASS; no revierten ni reabren la
decisión funcional recibida. La siguiente aprobación debe referir artefactos
físicos/ejecutables completos por hashes exactos, conforme a rector 45/49.
