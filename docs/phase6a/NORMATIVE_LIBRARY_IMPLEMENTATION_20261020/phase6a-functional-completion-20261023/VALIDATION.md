# Validación reproducible y límites

## G — Pruebas ejecutadas

| Comando/procedimiento | Resultado |
| --- | --- |
|pnpm typecheck|PASS workspace|
|pnpm build|PASS workspace; build local, no imagen/promoción QA|
|pnpm exec vitest run --reporter=json --outputFile=…/unit-final.json|1078PASS,237SKIPPED por entorno,0FAIL|
|bash scripts/regulatory/run-pipeline-postgres-tests.sh|10PASS,PG16;245tablas incluido ledger,0schema mismatches; clúster detenido|
|bash scripts/normative-library/run-operational-postgres-tests.sh|10upgrade defaults+40B04/H04=50PASS,PG16|
|pnpm contracts:verify|PASS|
|bash scripts/verify-rector-governance.sh|PASS|
|pnpm secrets:scan|0hallazgos|
|git diff --check|PASS|
|Diff frontend/docs-ui/database/baseline/executable-contracts frente origin/main|VACÍO|

TESTS_MOCKED:1078 unitarias, incluidas pruebas de contratos/API inject, permisos,
default DENY, idempotencia, concurrencia y fuentes. Las237 omitidas no son PASS;
los casos PG pertinentes ejecutados aparte se identifican arriba.
TESTS_INTEGRATION:60casos reales PostgreSQL16, con identidades/contenidos/proofs
sintéticos explícitos en clústeres de propiedad de esta tarea. Ningún fixture
acredita fuente normativa, firma humana o derecho de explotación real.
TESTS_REAL_QA: PostgreSQL READ ONLY/TLS verify-full; ledger36 exacto,244tablas/
3630columnas de producto y ledger1/9; cero constraints sin validar/índices inválidos.
M2M privado real fresco,0committed writes; backend/frontend healthy y misma fuente
f060cb1,HTTPS200/HTMLparity. GET catálogo y matriz sin token devuelven401.
TESTS_HUMAN_OPERATIONAL:NOT_RUN. No E2E humano de publicación/contratación acreditado.

QA matriz:333RequirementControlMapping y6FrameworkCrosswalk;0huérfanos de mappings
requisito-control/unidad-control y0cabeceras huérfanas;0violaciones inspeccionadas
de provenance/version/no_match en los tres tipos. Esto verifica integridad de
datos existentes, no su homologación semántica. Lectura funcional desde
loadMatrixPopulation sobre objetos importados se ejecutó en PG16 con controles
de permisos y trazabilidad, sin cambios de diseño ni matrices nuevas.

Intentos anteriores conservados como resultados fallidos, no PASS: timeouts antes
de VPN; initdb/puerto denegados por sandbox; expectativa de jurisdicción del
fixture; prueba negativa UUID aleatoria. earlier-attempts.json explica corrección.
El validador productivo de procedencia no cambió, ninguna aserción se desactivó.
El runner sobrescribió su reporte final tras corregir el fixture; el resumen
de fallo conserva los conteos observados sin inventar el hash del reporte anterior.

## D — Operación humana B04 preparada, no ejecutada

Snapshot QA: PO creó01a16575-da86-743c-a680-40563e61a7a4, audit
01a16575-da94-76ef-90f6-cefe61818866; sigue draft. Mario creó otra propuesta,
01a16571-2563-715c-ab43-299281d97d00; no es la revisión de la del PO.
Mario Managed01a16559-dee5-754d-a746-aa5b961e22e2,Membership
01a1656f-c602-73b0-a658-fef85f26ed72,GRC_MANAGER TECDEX activo. No cambiar roles.
TenantTECDEX01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9. NoACME-1.

Secuencia indispensable por actores reales:
1. PO autentica personalmente, recupera su propuesta por GET oficial y prueba
   que su propio review/decide es rechazado. Registrar code/correlation sin tokens.
2. Mario autentica personalmente por Managed Identity/password+TOTP y recupera
   el mismo recurso. Verificar tenant, autor, estado y vigencia antes de operar.
3. POST /api/v1/configuration-overrides/{id}:review con If-Match fuerte del GET
   actual,Idempotency-Key propia y cuerpo cerrado
   {"decision":"reviewed","rationale":"<revisión real del actor>"}; rechazo usa
   decision=rejected. No reutilizar el ETag después de una transición.
4. GET actual; luego :decide con nueva clave,ETag y
   {"decision":"approved","rationale":"<decisión real del actor>"} o rejected.
5. Repetir el comando idéntico con la misma clave; comprobar replay sin segundo
   audit/outbox. Obtener estado actual por GET; el resultado de replay es histórico.
6. Verificar UUIDs de audit review/decide, actores distintos del autor, transición,
   flags de vigencia y el conflicto409 de un ETag obsoleto; preservar historia.

No copiar credenciales, firmar tokens de humanos o introducir VerifiedIdentity
fabricada contra QA. El borrador PO termina2026-10-23T21:20Z: si la operación
se realiza después, el autor debe ajustar/crear mediante comandos canónicos
autorizados y revisar ese artefacto exacto. No extender fechas por SQL.
Las pruebas aisladas50PASS acreditan el software automatizable, no estos pasos.

## E/F — Publicación, contratación y ticket

No hay paquete oficial elegible para ejecutar un contrato QA auténtico.
Los positivos unitarios/sintéticos no cuentan como PUBLISHING_E2E o CONTRACTING_E2E.
La autorización PO no equivale a licencia ISO ni al recibo operacional de un actor.
El PDF editable existente no cuenta como emisión. No hay referencia documental
en los DTOs cerrados de onboarding25 o activación. El binding de emisión/
persistencia del ticket requiere cierre contractual concreto antes del código.

RESULT contiene cada bloqueo con causa,dependencia,evidencia,acción,owner y unlock.
Los recibos completos quedan en custodia privada ignorada por Git, referidos por
SHA256 desde RESULT; sus extractos anteriores bastan para continuidad sin secretos.
