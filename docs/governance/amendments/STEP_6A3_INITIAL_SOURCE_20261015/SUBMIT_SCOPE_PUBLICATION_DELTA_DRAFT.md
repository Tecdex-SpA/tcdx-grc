# Delta mínimo de publicación — EvidenceVersion.submit / fuente inicial

`STATUS=DRAFT_NOT_EFFECTIVE; IMPLEMENTATION_DEPENDENT=STOPPED; QA_DEPLOY=BLOCKED_TECHNICAL_REGISTRY_GATE`

## Hecho y causa

El manifest f4db8b38ac4fb18abb0978f9654a83def7b4ee024bafff560a8dbf6e9b7f9247 y la baseline v1.11 ya están aprobados y publicados. Sus decisiones humanas no faltan. Al preparar ese paquete, Codex omitió reconciliar el scope tenant del submit documental aprobado con el registry EvidenceVersion existente. No se atribuye esa omisión al PO ni se reabre el diseño inicial, las diez aprobaciones anteriores o Release.

Evidencia QA READ ONLY: `docs/phase6a/STEP_6A3/evidence/initial-source-implementation-20261015/qa-submit-scope-readonly.json`. Ambos actores reales tienen evidence.evidence.submit sólo tenant; EvidenceVersion/draft/evidence.submit/v1 admite assigned_object y owned_object. Rector21 §16 y assertLifecycleEdge exigen coincidencia real. El nuevo guard de custodia exige tenant y autor documental real, pero no puede inventar un scope owned_object ni saltar el registry. El caso PG16 aislado tenant-only reproduce DENY409 con rollback. El resto del flujo puede comprobarse aisladamente con fixtures que sí poseen ambos scopes; esos fixtures no representan permisos QA existentes.

## Una sola corrección propuesta

Publicar una sucesora versionada de **esa misma arista** EvidenceVersion draft→submitted/evidence.submit, con allowed_scopes owned_object, assigned_object y tenant; conservar permiso, AuditEvent, evento/outbox y estados actuales. La admisión tenant es exclusivamente para la cadena INITIAL_SOURCE propia, sin EvidenceLinks, que supera el predicado de custodia íntegro aprobado en v1.11. Si el actor sólo tiene tenant, exigir fuente pendiente draft, policy ordinaria publicada/vigente, contexto exacto, ausencia de primaria, custodia Tenant Admin legítima, autoría documental propia y tenant scope efectivo. Tenant en evidencia ordinaria o ajena continúa DENY. Los scopes owned/assigned anteriores conservan sus controles ordinarios; no permitir que un actor tenant-only se convierta en owned mediante copia/modificación del actor.

El backend debe evaluar esa condición explícita antes de transición y revalidarla en replay. La definición referencia una ObjectPolicy contractual cerrada, no SQL/código dinámico. SoD de EvidenceReview y aplicabilidad sigue intacta. No agregar Permission/RolePermission/MembershipRole, entidad, columna, flag, seed general ni migración. No cambiar ni republicar las cinco aristas C-04W. No inferir aceptación QA ni documento auténtico.

## Publicación operativa propuesta, aún no ejecutable

Añadir al operador privado M2M ya existente una operación separada `iam.initial_source.publish`, acotada únicamente al manifest aprobado de esta arista y a QA. Reutilizar el principal real autenticado y sus proofs actuales; no provisionarlo otra vez ni crear credenciales/grants. El nuevo comando no llama iam.publish ni iam.c04w.publish y no escribe las cinco aristas previas. El loader verifica manifest, decisión humana, hashes de sucesoras, v1.11 y ledger34/R2. El writer bloquea registry/scopes/side-effects; comprueba v1 exacta como predecesora y publica sólo v2, sin modificar v1. Registra una auditoría `audit.platform.lifecycle_transition.publish.v1` bajo command `step6a3InitialSourceLifecyclePublication`; replay con mismos bytes verifica íntegramente definición/scopes/efectos/audit y crea cero filas/auditorías. Diferencia de bytes/actor/ambiente/predecesora: DENY/CONFLICT, rollback total. No SQL manual de reparación.

Archivos previstos tras autorización/publicación: sucesora ejecutable09 y anotación de scope/ObjectPolicy05/14 de EvidenceSubmit; binding/metadata exactos de publicación; loader/writer privado independiente y registro de la operación; service.ts antes/replay de EvidenceSubmit; promotor sólo agrega verificación de esta arista, preservando la comprobación exacta5. No se implementan ahora. Si la ceremonia rectora exige una sucesora completa para la nueva condición de registry, prepararla y sellarla antes de promoción dependiente; esta propuesta no suplanta ese procedimiento.

## Gates y comprobaciones exigibles

Owners: el solicitante ya declaró PO, Architecture, Data Model, Security, Privacy y Release; no se pide acreditar esas funciones otra vez. Hace falta una decisión **únicamente sobre esta corrección y su publicación acotada nueva**, y después verificación de los bytes derivados conforme47/49 cuando existan. La autorización actual de Release continúa condicionada a pruebas efectivas, sin nuevo consentimiento genérico.

Positivos/negativos mínimos: autor tenant-only en cadena inicial propia; DENY tenant-only en evidencia ordinaria/ajena, otro tenant, rol/permiso/entitlement faltante, source ya bind/estado no draft, primaria sobrevenida y revisión propia. Preservar owned/assigned ordinarios, CAS/replay/carreras, audit/outbox transaccional, rollback, R2 y34migraciones, cinco aristas/auditorías C-04W sin cambios. Probar writer en PostgreSQL16 aislado antes de QA; publicación M2M real separada con recibo y segundo replay0. No suplir negativos humanos ni H01–H10.

Este texto es la única propuesta de corrección del residual observado. No es aprobación, publicación, implementación ni autorización para ampliar IAM por inferencia. Mientras no se resuelva, no construir/promover el delta como funcional completo; QA conserva sus imágenes acreditadas.
