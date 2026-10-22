# Preflight QA B01–B09 / H04 / PV-H04-01 — sólo lectura

**QA_READONLY_PREFLIGHT=PASS en el alcance de inspección. QA_SCHEMA_COMPATIBILITY=DELTAS_FOUND.** No se autoriza ni se ejecuta adopción. El esquema actual carece de las ampliaciones; B01–B09 no está habilitado ni funcionalmente completo.

## Autoridad, continuidad y destino

Se verificaron AGENTS, rector46/enforcement, activación efectiva v1.12, modelo05 y los handoffs/resultados/deltas pedidos, en orden. PV-H04-01 está publicado localmente; se consume la secuencia efectiva B01–B09 completo → H04_SQL_GRAMMAR completo → corrector de una función PV-H04-01. Se preservaron los4.359 originales,850 artefactos físicos y16 de publicación, más el árbol visible recibido:5.225 hashes. Rama fix/step6a3-v112-continuity-20261016; HEAD4a275264a7522031e62bf09f598c9d56e21d25e0; índice vacío. Ningún archivo previo modificado.

El ZIP rector localizado es v1.4 histórico; se leyeron encabezados46/README, sin extraer ni sustituir la autoridad activa. No se localizó un ZIP v1.12 en las ubicaciones consultadas. La v1.12 versionada y su activación/hash/gate se verificaron. El ZIP histórico no se usa para retroceder decisiones vigentes.

Destino QA según deploy/qa/.env.example:192.168.2.40:5432/tcdx-grc, NODE_ENV=qa. La identidad observada coincide exactamente: PostgreSQL16.15 Ubuntu, cluster16/main, servidor192.168.2.40:5432, base tcdx-grc, usuario postgres, no réplica. Conexión libpq con sslmode=require. Ninguna conexión a producción ni a la aplicación.

## Excepción de cuenta y prueba de sólo lectura

Inicialmente no había cuenta de lectura local: sólo una referencia para postgres. Antes de conectar, el PO respondió expresamente «utiliza postgres por ahora, es solo lectura». Se aplicó esa excepción concreta; **postgres es realmente superusuario**, no se presenta como rol de privilegios limitados. Las sesiones se ejecutaron con default_transaction_read_only=on desde el arranque, BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY, SHOW transaction_read_only y guard de identidad/settings antes de cada bloque. Todas devolvieron on/on, statement_timeout5s y lock_timeout1s. No se desactivó esa protección ni se probaron escrituras para demostrarla. No se crearon cuentas/grants.

Se registran cinco bloques exitosos de catálogo/agregados y la comprobación inicial de identidad realizada antes de ellos. Un intento de conexión fue denegado por sandbox y no ejecutó SQL; su evidencia se conserva, seguido del reintento autorizado. Todos los SQL persistidos pasan análisis AST offline PostgreSQL16: sólo SELECT, SHOW y delimitación de transacción. No FOR UPDATE/SHARE, locks explícitos, DDL/DML, CALL/DO, ANALYZE, funciones de aplicación, temporales, dump de datos ni herramientas de migración. Las definiciones de funciones se solicitan como metadatos, nunca se ejecutan. No se registran contraseñas, PII, UUID de tenants, contenidos ni payloads de auditoría.

## Inventario observado y comparación

QA tiene243 tablas incluyendo schema_migrations (242 de dominio);34 migraciones registradas, última20261015000100. Extensiones observadas: plpgsql1.0 y btree_gist1.7. Se inspeccionaron metadatos de24 relaciones explícitas:22 existen y dos no. El catálogo principal devuelve337 columnas,230 constraints y172 índices; el suplemento agrega las claves/columnas de iam.user_identities y platform.tenants. Las13 claves PK/UQ requeridas como destinos de nuevas FKs existen y están validadas. Se inspeccionaron namespaces, owners, defaults/tipos/nulabilidad, índices parciales, dependencias y secuencias (ninguna en los schemas seleccionados). No se exportan filas de personas o tenants.

SCHEMA_DIFF.json contiene488 objetos/dimensiones:376 MATCH,111 MISSING y un CONFLICT esperado por el delta aprobado. MATCH de columna comprende tipo/nulabilidad y default_status explícito; char/character, timestamptz y casts literales equivalentes se normalizan sin ejecutar defaults. No hay diferencias de default sin verificar entre columnas existentes comparadas. Las constraints históricas adicionales se conservan en el catálogo; no se afirma revisión de todo el producto.

| Hallazgo | Observación QA | Consecuencia |
|---|---|---|
| PF01 — alto, previsto |Faltan knowledge_version_context_links y knowledge_source_usage_rights |No se pueden habilitar bindings ni H04 físico |
| PF02 — alto, previsto |Faltan control_version_id y supersedes_configuration_override_id en overrides, control_version_id en EC y context_knowledge_version_id en applicability |Faltan cuatro columnas y sus constraints/índices |
| PF03 — alto, previsto |Ocho funciones y12 triggers del slice ausentes |PV-H04-01 está ABSENT: no está instalada ni la variante defectuosa ni la corregida |
| PF04 — medio, delta aprobado |Existe uq_knowledge_versions__version_number global; falta el UQ(Item,version) |CONFLICT post-adopción previsto; requiere reemplazo B02 bajo ventana y preflight final |
| PF05 — operacional |0/8 permisos nuevos,0/4 Definitions y0 bindings registry coincidentes |Habilitación IAM/registry/configuración sigue pendiente; ninguna activación realizada |
| PF06 — acotación |RLS desactivada en relaciones observadas y rol postgres privilegiado |Este preflight no demuestra aislamiento de lecturas con roles de aplicación ni SoD |

Los111 objetos faltantes incluyen38 columnas (34 de nuevas tablas y cuatro sobre existentes), dos tablas,16 constraints inline,24 constraints con nombre,11 índices, ocho funciones y12 triggers. No se encontraron conflictos imprevistos en la comparación acotada. Los marcadores MISSING son observaciones, no autorización para crearlos.

## Datos reales: agregados seguros

Se obtuvieron cardinalidades con SELECT1 LIMIT10001 antes de habilitar scans pequeños; ninguna relación alcanzó el límite. Los estimados reltuples=-1 no se trataron como datos faltantes: siete skips iniciales se resolvieron mediante conteo acotado. Los predicados posteriores siguen teniendo timeout5s. Todos devuelven sólo contadores.

KnowledgeSource/Item/Version:0 filas cada una;0 duplicados(Item,version),0 huérfanos Item/Source,0 discrepancias de ownership/tenant y0 nulabilidades tenant incompatibles. La compatibilidad de futuros contenidos no se infiere de estos checks vacíos.

ConfigurationDefinition:1; override:1; EC:0. No hay overrides scope control_version existentes, duplicados en la clave EC actual, huérfanos Definition ni discrepancias tenant/Definition. RequirementApplicability:1; Subject:1;0 cruces tenant con Subject o Requirement. Controles versionados:215; Requirements:118; NormativeUnits:260; versiones de paquete:5. No se extraen IDs ni textos. Los agregados no detectan datos que impidan estos DDL; **QA_DATA_COMPATIBILITY=PASS sólo para los predicados inspeccionados y el instante observado**.

Los nuevos campos son nullable: no se necesita inferir o rellenar contexto histórico. La única aplicabilidad existente conserva su fila; no se la modifica ni se inventa Knowledge. Las tablas nuevas ausentes no tienen datos preexistentes que auditar. Funciones/triggers y sus futuras transacciones siguen sin validar en QA;149 PASS PG16.15 sintéticos son evidencia previa reutilizada, no QA PASS de ejecución física.

## Gates, límites y continuación

Autoridad/baseline PASS; destino QA PASS; sesiones sólo lectura PASS bajo excepción PO de cuenta; integridad de5.225 archivos PASS; alcance SQL PASS. No se tocó DB/esquema/datos/configuración, contratos publicados, backend/frontend, infraestructura o despliegues. Sólo se agrega este expediente fuera del índice. Gates operacionales continúan pendientes; STEP6A5/STEP6A6 NOT_STARTED.

Siguiente decisión específica: evaluar una orden de adopción física QA para las dos tablas/cuatro columnas, constraints/índices y funciones/triggers de la secuencia publicada, con ventana de locks y rollback transaccional. No se solicita autorización general de migración/despliegue; RISK_AND_ADOPTION_PLAN.md detalla objetos, riesgos y precondiciones. IAM/registry/Definitions, imports, derechos y deploy quedan separados. La licencia comercial ISO futura no bloquea inspección ni pruebas de contenido propio/sintético/permitido; no se acredita ni se inventa derecho alguno.
