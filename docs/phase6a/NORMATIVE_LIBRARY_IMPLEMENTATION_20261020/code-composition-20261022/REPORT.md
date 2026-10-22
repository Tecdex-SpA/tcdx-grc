# Composición B01–B09/H04 — código local

Resultado: **PARTIAL_BLOCKED**. Composición backend conectada y superficies frontend montadas. La creación inicial de ajustes B04 queda bloqueada por una dependencia contractual demostrada; no se declara PASS global del alcance. `RECTOR_GATE=BLOCKED` para cierre integral; integridad y generación rectoras PASS.

Baseline activa: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`. Posición: POST-STEP6A4 / Biblioteca Normativa intermedia IN_PROGRESS / PRE-STEP6A5. STEP6A3 y STEP6A4 conservan su cierre acreditado; STEP6A5/6A6 no iniciados.

## Estado recibido y autorización

Repositorio `Tecdex-SpA/tcdx-grc`, rama `fix/step6a3-v112-continuity-20261016`, HEAD `4a275264a7522031e62bf09f598c9d56e21d25e0`. Índice vacío; working tree con cambios y archivos no rastreados anteriores, conservados. `INITIAL_STATE.json` registra su estado y hashes antes de editar. El inventario hash sirve a preservación, no a redescubrimiento arquitectónico.

Se leyeron primero los tres expedientes señalados por el PO, luego las fuentes contractuales y archivos concretos de composición. El verificador sucesor del generador pasó **antes** de los cambios. Sus verificadores históricos no se vuelven a interpretar contra un árbol posteriormente modificado ni se relajan. La activación rectora efectiva está acreditada por enforcement/recibos y los scripts rectores; los encabezados de candidatura permanecen inmutables.

La instrucción PO de este handoff autoriza exclusivamente composición backend/frontend, pruebas locales y expediente. No autoriza datos, nuevos contratos, DB, IAM, registry, infraestructura, despliegue o Git de publicación.

## Cambios realizados

- `apps/backend/src/server.ts` suministra `normativeLibrary` al `buildApp` existente. `normative-library/bootstrap.ts` reutiliza DB, cliente privado MinIO y cursor firmado canónicos. Ausencia de storage/cursor aborta con dependencia503; no omite silenciosamente las rutas, concede permisos ni genera otra clave. El arranque no activa registros ni migra datos.
- Registro exacto: **30 operaciones nuevas + configurationOverrideCreate ya publicada = 31 handlers/operaciones de composición**. No son 31 operaciones contractuales nuevas. Los sufijos review/publish/decide comparten dispatch HTTP sin duplicación. La aplicación completa se construyó e inyectó localmente para las 31 rutas: todas deniegan sin autenticación.
- El mismo objeto conecta hooks B07 al comando/auditoría de aplicabilidad y la lectura persistida de configuración efectiva. Se preservan adapters, policies, SoD, CAS, idempotencia y auditoría preparados; no hay contenedor o endpoint paralelo.
- `core-grc.tsx` monta la biblioteca en Normas y una ruta Platform protegida independiente. Fuentes/ediciones conservan lecturas canónicas, búsqueda y navegación por unidades hijas. La guía por unidad/requisito se carga al abrir detalle. El shell, tokens, CSS, marca y recursos aprobados permanecen preservados.
- `normative-library-workspace.tsx` conecta consultas/selección paginada de Source/Item/Version, metadata y contenido COMPRENDER/IMPLEMENTAR/DEMOSTRAR, autoría/revisión/publicación, contexto empresarial, vínculos tipados y citas. Conserva citas existentes al editar/remover vínculos. No solicita UUID manual, HTML activo ni contenido comercial.
- Aplicabilidad dispone de selector de KnowledgeVersion contextual publicado; cambia/limpia selección al variar Subject y valida el request aditivo publicado sin alterar el contrato previo de formulario. Backend sigue comprobando contexto exacto, organización/scope y derechos.
- Ajustes tenant: listado por ControlVersion, GET/ETag, edición draft, revisión y decisión gerencial, protegidos por permiso/contexto y policy backend. Creación inicial bloqueada conforme a CODE-B04-01.
- Seis matrices: Requisitos×Controles; Controles×Evidencias; Requisitos×Evaluaciones; Normas×Normas; Obligaciones×Aplicabilidad; Hallazgos×Acciones. Mini dashboard y full usan `LibraryMatrixView` y el mismo `matrixRead`, con ventanas3/3/9 en mini, contexto/filtros efímeros y navegación full. Se respeta la intersección de permisos de fuentes; no se activa Riesgos, exportación ni un cálculo/persistencia adicional. Avanzar ejes queda deshabilitado mientras hay celdas pendientes de la ventana.

## Bloqueo contractual real

**CODE-B04-01**: `ControlOverrideCreateRequest` requiere `configuration_definition_id`. `CONFIGURATION_DEFINITIONS.json` publica cuatro códigos/descriptores/versiones, sin IDs físicos; el OpenAPI efectivo no publica una operación de descubrimiento/selección de esas Definitions. Las lecturas de overrides no permiten elegir una Definition cuando todavía no existe un override. Activar las cuatro filas tampoco crea ese contrato de consulta. Se comprobó puntualmente el conjunto de operaciones de configuración; la evidencia está en `BLOCKERS.json`.

No se agregó endpoint, hardcode de IDs/códigos a IDs, entrada UUID, activación o dependencia inventada. El backend create queda registrado y protegido; el recorrido inicial UI no se presenta como completado. Se requiere decisión/contrato de consulta aprobado en otro alcance. Esto es una dependencia de contrato de la integración B04, no una autorización implícita para modificarlo en esta tarea.

Platform conserva sus propios permisos y transporte sin tenant. Los selectores de targets existentes requieren un contexto tenant autorizado para leer sus referencias; no hay herencia de permisos Platform sobre datos tenant. Sin ese contexto las referencias quedan indisponibles, sin IDs manuales ni impersonation. No se declara demostrada autoría operacional Platform con actores reales.

## Resultados y límites

251 pruebas focalizadas en21 archivos PASS; typecheck/build globales PASS; generadores rector/B01–B09/H04 --check PASS; integridad/status rector PASS; migraciones/manifest/expected-schema/generador conservados. Ocho casos Chromium sobre el bundle compilado, escritorio1536px/estrecho390px, con API sintética interceptada: PASS. No acreditan persistencia, E2E real backend+DB ni QA. Comandos, logs, intentos fallidos y correcciones se detallan en TEST_REPORT.

La preservación compara todos los archivos recibidos: sólo tres preexistentes fueron modificados por esta ejecución. Los seis archivos nuevos de código/pruebas/configuración y los artefactos del expediente están enumerados y hasheados en FILE_MANIFEST. No se atribuyen a esta sesión cambios Git recibidos de otras cuentas. Índice, rama y HEAD preservados.

Riesgos/dependencias restantes: CODE-B04-01; IAM/grants reales;13 bindings B06;4 Definitions/reglas; H04 por fuente/acto/evidencia real; contenido/importaciones; pruebas con actores/tenants reales; autorización de despliegue y revisión visual humana. Bundle conserva advertencia >500kB, registrada sin cambiar umbral ni relajar gates. No hay nueva baseline visual aprobada para estas superficies; capturas y comprobaciones de layout son evidencia técnica, `HUMAN_UI_REVIEW=PENDING`.

Capas modificadas: backend y frontend exclusivamente, más pruebas/documentación. DB/modelos físicos,35 migraciones, contratos ejecutables, manifest, expected-schema, generador, IAM/datos, identidad, infraestructura y contratos de despliegue: **sin cambios**. QA no contactado. Cero activaciones, imports, deploys, producción, commits, push o merge.
