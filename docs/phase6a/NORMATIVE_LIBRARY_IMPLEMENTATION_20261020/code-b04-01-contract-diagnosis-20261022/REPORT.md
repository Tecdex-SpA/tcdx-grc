# Diagnóstico CODE-B04-01

Fecha: 2026-10-22. Alcance: documentación de diagnóstico y propuesta autorizada por PO. Baseline activa: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`. Dominio canónico: https://grc.tecdex.net/.

**Determinación: alternativa C, brecha contractual real.** No existe una operación canónica aprobada que permita descubrir las ConfigurationDefinitions elegibles para la creación inicial B04. Se requiere una enmienda mínima; no basta conectar un handler pendiente o activar datos. La propuesta de este expediente no es autoridad ejecutable y no desbloquea la integración.

## Causa raíz demostrada

1. `ControlOverrideCreateRequest` exige `configuration_definition_id`, además de `control_version_id`, scope, valor, intervalo y fundamento. El ID pertenece a `config.configuration_definitions`, entidad existente; no se deriva de un código ni se inventa en frontend.
2. `CONFIGURATION_DEFINITIONS.json` publica cuatro descriptores aprobados, con código/versión/tipo/scopes/reglas y labels; no publica IDs de filas operacionales. Su campo `runtime_inserted=false` separa contrato de materialización.
3. El OpenAPI efectivo B01–B09 contiene una sola operación sobre `/platform/configuration-definitions`: **POST por ID para publicar**. No contiene GET list/get/discovery de Definitions. El permiso `configuration.configuration_definition.read` existe en Permission05, pero sólo con scope platform/Platform Admin: un permiso catalogado no constituye una operación ni concede lectura tenant.
4. `effectiveConfigurationGet` entrega metadatos de una Definition dentro de un resultado persistido conocido. Su contrato28 excluye expresamente discovery contextual y materialización. No resuelve el primer override sin datos previos.
5. `configurationOverrideGet` y `controlConfigurationOverrideList` proyectan Definition ID/código/versión desde overrides existentes. No descubren Definitions sin override. Usarlos como selector inicial produciría una dependencia circular.
6. Las consultas canónicas de referencias existentes son framework, membership y retention, con recursos, propósitos y permisos cerrados. Ninguna acepta Definition. Extender silenciosamente su propósito o respuesta modificaría contrato.

La búsqueda dirigida contrastó el OpenAPI base y sus sucesores publicados, matriz03, Permission05, contratos28/29, B04/B05/B06, modelo físico, policies y rutas/lectores de configuración y referencias. Las coincidencias en snapshots/candidatos no se trataron como una operación vigente. EVIDENCE.json registra las operaciones concretas del OpenAPI efectivo y los hashes recibidos. No hubo escaneo de arquitectura o reinicio del inventario funcional.

## Estado y criterios comprobados

La entidad e identificador canónicos están cerrados. La publicación gobernada de Definition global existe como contrato H-003, con SoD e inmutabilidad; B04 consume únicamente `lifecycle_state=published`, versión/descriptores exactos, vigencia actual, flags superiores y scope autorizado, reglas materializadas y ControlVersion propio. No debe confundirse el ciclo de SurveyDefinition ni el estado de conexión de Integration con el ciclo de ConfigurationDefinition. El contrato inspeccionado no autoriza inventar una secuencia completa de estados de Definition para este selector.

La ausencia de Definitions/grants/bindings sigue siendo una dependencia operacional independiente. Activarlos no agrega un contrato HTTP de descubrimiento. A la inversa, publicar una consulta tampoco activaría esas filas o habilitaría create/review/decide.

## Comprobaciones y preservación

- Identidad: `Tecdex-SpA/tcdx-grc`; rama `fix/step6a3-v112-continuity-20261016`; HEAD `4a275264a7522031e62bf09f598c9d56e21d25e0`; índice vacío.
- Verificador del expediente code-composition ejecutado **antes** de crear este sucesor: PASS;35 migraciones por hash, rama/HEAD/índice y archivos recibidos preservados. Su snapshot histórico no incluye este expediente nuevo; no se modifica ni se relaja.
- `bash scripts/verify-rector-governance.sh`: PASS; `bash scripts/test-rector-governance-status.sh`: PASS. Los estados históricos impresos por el script no sustituyen los cierres STEP6A3/4 acreditados por los expedientes actuales.
- Extracción estructurada del OpenAPI efectivo: cero GET de Definition; se enumeraron los candidatos de configuración/referencias y se contrastaron sus permisos/respuestas.
- Preservación: EVIDENCE.json reutiliza los hashes sellados de5070 archivos recibidos; comprobación final de bytes y Git descrita en HANDOFF. Sólo se crean los documentos de este expediente.
- No se repiten251 tests/8 browser/builds/typechecks: son evidencia heredada de implementación y no hay cambios ejecutables que justifiquen repetirlos. No se ejecuta SQL ni pruebas físicas. Los tests de la propuesta son criterios futuros, **NOT_RUN**.

`DIAGNOSIS=COMPLETE`. Integridad rectora técnica PASS; `RECTOR_GATE=BLOCKED` para la integración B04 pendiente de solución aprobada/verificada. Biblioteca Normativa IN_PROGRESS; STEP6A3/4 PASS previos preservados; STEP6A5/6A6 NOT_STARTED. No hay conflicto rector nuevo de esta propuesta: falta la autorización contractual del nuevo binding de lectura.

Archivos creados: REPORT.md, CONTRACT_ANALYSIS.md, PROPOSAL.md, HANDOFF.md y evidencia documental EVIDENCE.json/SHA256SUMS.txt. Archivos preexistentes modificados:0. DB, contratos ejecutables, backend, frontend, IAM/registry, infraestructura y contratos de despliegue: sin cambios. QA no contactado; sin imports, despliegue, producción ni commit/push/merge.
