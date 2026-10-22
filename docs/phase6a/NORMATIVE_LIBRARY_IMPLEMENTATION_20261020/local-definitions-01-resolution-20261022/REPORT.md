# LOCAL-DEFINITIONS-01 — resolución integral local

**LOCAL_DEFINITIONS_01=PASS_LOCAL_RESOLVED; RECTOR_GATE=PASS para este alcance local.** Se materializaron las cuatro Definitions en PostgreSQL16 aislado, con todos sus defaults SQL NULL, scopes y reglas exactos. La corrección es general del modelo ConfigurationDefinition y se registra como migración36, preparada y probada localmente; no aplicada en QA.

Baseline activa: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`. Dominio canónico: https://grc.tecdex.net/. Fase POST-STEP6A4 / Biblioteca Normativa intermedia / PRE-STEP6A5; STEP6A3/STEP6A4 PASS previos conservados, STEP6A5/STEP6A6 NOT_STARTED. No se declara cierre operacional QA, aceptación humana o release comercial.

## Continuidad y autorización

Rama `fix/step6a3-v112-continuity-20261016`, HEAD `4a275264a7522031e62bf09f598c9d56e21d25e0`, índice vacío. Se leyó primero el expediente local-operational-preparation, incluidos REPORT/TRACEABILITY/TEST_REPORT/QA_ENABLEMENT_RUNBOOK/HANDOFF/RESULT. Su verify.py pasó antes de editar. Se preservó íntegro ese expediente histórico, incluidos logs ignorados por Git. INITIAL_STATE registra5.170archivos recibidos, estado Git y hashes; preimages/diffs permiten aislar este delta.

La orden PO actual autoriza diagnóstico focalizado, determinación semántica, corrección mínima, migración nueva indispensable, pruebas físicas/locales y expediente. Se aplica DR003 sin firmas adicionales ni atribuir aprobación humana a bytes futuros. La autorización queda registrada en el sucesor físico, limitada a preparación local. Se conservaron baseline/ZIP, contratos anteriores, identidad, permisos y sus límites.

## Causa raíz y decisión

La restricción introducida por migración31 exigía exactamente un default tipado. El modelo físico01 anterior también documentaba esa exigencia. La publicación B04 posterior aprobó expresamente cuatro defaults NULL, el uso del campo original ControlVersion como capa base y confirmación sin configurar. Cambiar NULL por vacío/cero/false/json u otro tipo habría alterado esa semántica y los mínimos auténticos. No existe una representación canónica alternativa que haga que NULL satisfaga «exactamente uno» sin cambiar su significado.

Se resuelve **Caso A**. La ausencia de default Platform es válida; si existe un default, debe ser único y del tipo declarado. El sucesor físico/documental general reconcilia la exigencia anterior, sin reescribirla. La migración sustituye exclusivamente el CHECK, validando primero su reemplazo y manteniendo el mismo nombre final. Tipo desconocido incluso sin valores, valor en columna incorrecta y múltiples defaults siguen prohibidos. Las constraints de duración, identidad, ownership, vigencia, claves y relaciones sobreviven.

## Implementación

- Sucesor físico `docs/physical-data-model/amendments/CONFIGURATION_OPTIONAL_DEFAULT_20261022/`: autorización, contrato, DDL, proyecciones exactas PG16 del CHECK anterior/nuevo, manifest y recibo local. Sucesor ejecutable correspondiente: preserva los cuatro descriptores/versiones y las APIs existentes; documenta materialización por el publisher canónico, sin permisos nuevos.
- Migración36 `20261022141304_configuration_optional_default.sql`. El ID se obtuvo con UTC real y se verificó contra secuencia/gramática del contrato11; no se eligió manualmente. Una transacción con locks/timeouts y preflight del CHECK anterior exacto; reemplazo validado antes de retirar el anterior; cero DML empresarial, nuevas tablas, columnas, triggers o cambios a otra entidad.
- El único generador canónico conserva la derivación exacta del predecesor35 y extiende el manifest con36; deriva el SQL desde el DDL publicado y expected-schema con una aserción exacta del CHECK. El verificador físico comprueba hashes de fuente/receipt/migración y definición PG16 validada. No se relaja su normalización ni las98aserciones normativas anteriores.
- El generador del slice consume el sucesor como metadata derivada; APIs/JSON schemas, permissions, ObjectPolicies,13bindings B06 y cuatro descriptores permanecen iguales. El loader IAM verifica el manifest sucesor exacto y el prefijo histórico35 sin admitir una cadena arbitraria.
- `publishLibraryOperationalData` materializa las cuatro Definitions globales v1, scopes y reglas `contract_schema` en la misma transacción privada existente. IDs UUIDv7, actor autenticado, intervalo explícito y AuditEvent canónico; sin seed-on-start ni nuevo endpoint. Replay exacto no duplica; reglas, defaults, scopes, vigencia o versiones divergentes bloquean. No transforma ni sobrescribe versiones previas.

## Evidencia final

**200 tests PASS:**141focalizados/16archivos,49físicos PG16 (10upgrade/integridad y39IAM/B06/Definitions/B04/H04),10browser escritorio/estrecho. Typechecks/builds globales y backend finales PASS; generador --check repetido con salida idéntica, assets B04/H04, rector integrity/status, secretos y whitespace PASS. Schema local:244tablas,3630columnas, cero diferencias. Los fingerprints de todas las tablas de dominio y todas las constraints distintas del CHECK objetivo son iguales antes/después de36; se conservan defaults preexistentes de los siete tipos.

B04 físico: descubre cuatro opciones, crea draft con Definition elegida, replay, review independiente y decide approved por B06 real; rechaza autor sin autoridad/auto-revisión y Definition inexistente. Sus bases originales/ausencia de confirmación se resuelven semánticamente sin valores inventados. El browser usa bundle real y handlers Fastify reales con SQL executor sintético; no se presenta como el mismo recorrido PostgreSQL ni E2EQA. PG16 prueba la persistencia/constraints/transacciones por separado. Custodia MinIO conserva sus pruebas de cliente fixture; no se cargaron licencias reales.

El build frontend conserva warning de chunk >500kB, sin cambiar umbral ni diseño. Las diez pruebas browser pasan sobre el bundle actual; no hay nueva aprobación visual humana. Frontend fuente/CSS/marca y contratos de despliegue no cambian.

## Límites y siguiente acción

Las migraciones1–35 mantienen sus bytes.36 se aplicó exclusivamente en clústeres locales desechables detenidos al terminar. No hubo conexión QA, DDL/DML/activación real, importación, despliegue, producción, cambio de infraestructura, identidad o Git de publicación. El status maestro recibe un append; evidencias históricas no se editan y sus verificadores de snapshots35 no se relajan para representar este sucesor36.

LOCAL-DEFINITIONS-01 no tiene conflicto pendiente en este alcance. La futura adopción de36, activación de datos/IAM/rights y despliegue QA requieren autorización PO posterior y evidencia del entorno. MIGRATION_REPORT y HANDOFF delimitan el orden y recuperación. FILE_MANIFEST incluye todos los artefactos creados, también los ignorados por Git; verify.py valida la entrega offline sin DB/red ni activación.
