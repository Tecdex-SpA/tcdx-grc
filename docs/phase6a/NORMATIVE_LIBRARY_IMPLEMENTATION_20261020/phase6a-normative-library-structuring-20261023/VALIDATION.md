# Validación nueva — ejecución 2/3

Source commit `75f377a230bf11eac003fb91b44c56b1daf00eea`. Los resultados siguientes se ejecutaron en esta cuenta/sesión; no se copian los 1083/289/18 informados por ejecución1. Las suites de regresión que no cambiaron su código se ejecutaron durante esta entrega; tras la corrección final de ambigüedad se repitieron unitarias, importador, preparación de fuentes y comprobaciones de compilación.

## Entorno y límites

Node22.23.2, pnpm12.4.1, PostgreSQL16.14 local, Python con PDFium5.14.0. Bases nuevas propias por runner/suite; sólo loopback, directorio/major atestados y clústeres detenidos al finalizar. Ni PostgreSQL192.168.2.40 ni QA/backend/frontend/IA externos fueron usados. El candidato físico de runtime aprobado en ejecución1 se reconstruyó sólo en estos clústeres:245 tablas físicas/3652 columnas y cero diferencias; no se modificaron migraciones históricas ni contratos físicos.

Los actores, tokens, documentos, aprobaciones y permisos usados por regresiones operacionales son fixtures sintéticos del arnés existente. No representan revisión, derechos, ticket emitido, publicación normativa ni aprobación humana real. Las cinco fuentes nuevas sí proceden de los PDF recibidos; el actor importador de esa prueba es sintético, sin recibos de validación ni derechos.

## Pruebas ejecutadas

|Comando/perfil|Resultado nuevo|Qué demuestra|
|---|---|---|
|`pnpm exec vitest run --config vitest.config.ts --reporter=json --outputFile=…/unit.json`|1093PASS /302omitidas por entorno /0FAIL|Regresión unitaria y diez casos de selector explícito, self-target, versiones inválidas, identidades distintas y ambigüedad|
|`python3 -m unittest discover -s scripts/regulatory/normative-library -p test_sources.py -v`|13PASS|ZIP inseguro/duplicado, manifiesto desplazado/ausente/corrupto, hash de original/derivado, offsets, parentesco, bis/transitorios, namespaces, separación de Anexo A/Requirement, determinismo y no exposición de cuerpos en reportes|
|`run-binding-postgres-tests.sh structuring`|13PASS|Cinco revisiones fuente,619 unidades/siete requisitos,131 localizaciones; correcciones históricas, siete crosswalks, soporte parcial, concurrencia/replay, rollback/ambigüedad, source drift, HTTP real y cero recibos de derechos/aprobación|
|`run-runtime-postgres-tests.sh core`|43PASS|Runtime, fuentes, temporalidad, metodologías, referencias y configuración|
|`run-runtime-postgres-tests.sh commercial`|34PASS|Catálogo, suscripciones/cambio de plan, pack HTTP y entitlements|
|`run-runtime-postgres-tests.sh security`|77PASS|IAM/RBAC, scopes, autorización e integridad en predecesores reales|
|`run-runtime-postgres-tests.sh iam`|9PASS|Publicación IAM existente, proveedor sintético|
|`run-runtime-postgres-tests.sh legacy`|20PASS|Contratos históricos, retención y rollback|
|`run-operational-postgres-tests.sh`|55PASS|Upgrade35→36, B04 y H04 contextual/interno|
|`run-pipeline-postgres-tests.sh`|11PASS|Pipeline, integridad, rechazos y ausencia de H04 como gate general interno|
|`run-binding-postgres-tests.sh runtime`|40PASS|P1/P2/P1-TX/T1 y seis matrices pobladas por HTTP autenticado, con fixtures sintéticos|
|Playwright B04 desktop/narrow|10PASS|UI existente y handlers con executor SQL de fixture|
|Playwright biblioteca desktop/narrow|8PASS|Composición/matrices y negativos con API interceptada|
|`pnpm typecheck`; `pnpm build`; build backend final|PASS|Compilación del monorepo; frontend sin cambios; aviso previo de tamaño de chunk, sin error|
|Verificación rector y test de estado; contratos/rights derivados; autoridad runtime/internal; `git diff --check`; secret scan|PASS|Baseline/autoridad y assets íntegros; cero secretos detectados|

PostgreSQL total:302 casos PASS, sin sumar repeticiones de las mismas pruebas. Navegador total:18 casos distintos PASS, sin atribuirles importación externa, contenido homologado o cobertura E2E de estos cinco PDF. Las302 omisiones del runner unitario se ejecutaron separadamente con sus flags en las suites PostgreSQL; el valor por sí solo no acredita cobertura semántica.

## Preparación y evidencia de datos

Los manifiestos de los payloads privados se regeneraron idénticos. El checksum canónico se vincula al actor real de cada llamada, por lo que el recibo PostgreSQL contiene identificadores/hash de ese ensayo, no identidades operacionales para reutilizar. `POSTGRES_PREPARATION_RECEIPT.json` procede de SQL real; estados: cuatro draft y Ley21719 review; porcentaje revisado0 en todos.

619 unidades:104/144/209/72/90;501 enunciados fuente:122/54/73/89/163; selección acotada de siete Requirement:2/1/1/1/2. Los494 restantes no se importan como obligaciones atómicas. Controles de referencia:93+38; mappings editoriales131; Requirement→Control1; correspondencias de unidades7; propuestas de corrección de controles9. Todos los mappings nuevos son draft. Sin cuerpos ISO almacenados en licensed_content/licensed_statement ni aprobación fabricada.

La revisión literal produjo cero duplicados exactos, detectó una referencia repetida4.1 en42001 y una cita repetida de artículo30 en21719 que no crean unidades nuevas. No acredita contradicciones resueltas, agotamiento de obligaciones sin modal, atomización completa o vigencias completas. Tampoco acredita completitud visual/OCR del PDF.

151 referencias literales de los211 candidatos tienen ancla;60 scopes siguen abiertos. Los104 IDs2026 y211 recibidos son únicos y se conservan; ni315 obligaciones verificadas ni un porcentaje global de cobertura se infieren de esa suma.

## Integridad y gate

`EVIDENCE_INDEX.json` contiene hashes de los recibos privados y archivos versionados pertinentes. Si otra cuenta carece de custodia, debe regenerarla desde los originales versionados; no suponer pruebas ejecutadas allí. El ZIP rector v1.12 original no está disponible: se verifica la baseline activa versionada, sin reconstruir disposiciones ausentes.

`NORMATIVE_LIBRARY_TECHNICAL_CLOSURE=PARTIAL` por fuentes/semántica/cobertura pendientes. `RECTOR_GATE=PASS` para la conformidad del cambio verificado; `INTEGRATED_RELEASE_GATE=PARTIAL` y `MARKET_RELEASE_READY=BLOCKED` se conservan. No nueva revisión humana, publicación oficial, contratación, QA import o despliegue.
