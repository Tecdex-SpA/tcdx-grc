# Revisión rectora del paquete normativo — 2026-10-20

**Dictamen: preparación analítica completada; paquete compatible en su estructura general, con decisiones materiales pendientes antes de implementar la biblioteca ampliada.** Los 211 registros se conservan como `ACEPTADO_PARA_HOMOLOGACION`; ninguno se certifica aquí como `OBLIGACION_NORMATIVA_VERIFICADA`. La aprobación funcional N-01–N-17 se registra como recibida, sin convertir los ZIP en contratos ejecutables.

```text
ACTIVE_BASELINE=TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16
BASELINE_STATUS=ACTIVE
STEP6A3_CLOSURE=PASS
STEP6A4_CLOSURE=PASS
INTERMEDIATE_STEP_ID=NO_FORMALMENTE_DEFINIDO
INTERMEDIATE_STEP_SCOPE=HOMOLOGACION_Y_BIBLIOTECA_NORMATIVA_PROPUESTA_POST6A4_PRE6A5
PACKAGE_INVENTORY=VERIFIED_97_AND_103_FILES_211_CANDIDATES_PRESERVED
CANONICAL_MODEL_COMPATIBILITY=PARTIAL_SUPPORTED_WITH_BINDING_GAPS
N01_N17_COMPATIBILITY=3_SUPPORTED_EXISTING_7_SUPPORTED_WITH_IMPLEMENTATION_7_REQUIRES_RECTOR_DECISION
TENANT_CUSTOMIZATION_COMPATIBILITY=REQUIRES_RECTOR_DECISION
GRAPHICAL_MATRICES_COMPATIBILITY=PARTIAL_CANONICAL_RELATIONS_AVAILABLE
AI_READINESS_COMPATIBILITY=PREPARATION_SUPPORTED_RUNTIME_OUT_OF_SCOPE
NORMATIVE_SOURCES_STATUS=METADATA_CHECKED_CONTENT_LICENSE_COVERAGE_PENDING
RECTOR_DECISIONS_REQUIRED=D01_D09_AS_DETAILED
IMPLEMENTATION_READINESS=BLOCKED_PENDING_SCOPE_BINDINGS_SOURCES_AND_AUTHORIZATION
RECTOR_GATE=PASS
NEXT_ACTION=PO_RESOLVER_DECISIONES_MATERIALES_Y_CERRAR_TASK_PACKET_SIN_IMPLEMENTAR
```

`RECTOR_GATE=PASS` corresponde exclusivamente a esta revisión autorizada y su integridad. La preparación del diagnóstico queda entregada; no se declara un gate de implementación, pack, QA, publicación o release aprobado. No se inició STEP6A5 ni STEP6A6.

## 1. Continuidad, autoridad y método

Se leyeron AGENTS.md, rector46, enforcement, estado de ejecución vigente y expediente formal STEP6A4. La baseline efectiva se acredita por `docs/rector/ACTIVE_ACTIVATION.json`, manifiesto SHA256 `cdd0165364e50dee176c8a8ec8cf7c1f55a5905f4febd91c63459583c9faec85` y checks rectores actuales PASS. Los textos históricos de candidata de los bytes inmutables no desplazan el acto efectivo. Los checkpoints antiguos tampoco desplazan el último cierre de STEP6A4.

Se aplicaron rector08/09/19/22/23/24/26/27/29/30/33/35/36/37/38/41/42/43/44/45/46/49, contratos de Fase6A y ejecutables de importación, permisos, métodos, configuración, evidencia e IA, y modelo físico normativo. Se inspeccionaron modelos/DDL/migraciones/catálogos, rutas/servicios backend y UI fuente relevantes. El código acredita implementación estática, no autoridad de producto ni ejecución QA actual. No se consultó ni escribió PostgreSQL/QA ni se ejecutaron tests funcionales de STEP6A4.

La revisión tiene tres niveles de evidencia separados: contratos vigentes; implementación/catálogos locales reales; contenido preparatorio y decisión funcional PO. Se añadió cotejo web de metadatos ISO y fuentes BCN/ANCI. Las fuentes, rutas, hashes y límites se inventarían en este expediente. No hubo validación semántica por motor IA, importación ni aprobación jurídica integral.

STEP6A4 permanece cerrado con aceptación y gates PASS. Su expediente/evidencias no cambian. FORM-05 conserva PASS; las otras 41 operaciones continúan sin acreditación transaccional. Su verificación runtime integral pertenece a6A6 conforme STEP6A1/08:80 y STEP6A2/10:12. Este análisis no las reabre ni las aprueba.

Rama/HEAD recibidos: `fix/step6a3-v112-continuity-20261016` / `4a275264a7522031e62bf09f598c9d56e21d25e0`. Se preservan worktree preexistente e índice. Sólo se crea este expediente; MASTER_EXECUTION_STATUS queda intacto porque este mandato pide análisis y no la activación de una etapa.

## 2. Inventario e integridad de ambos ZIP

| Paquete | Tamaño | Archivos | SHA256 calculado |
| --- | ---: | ---: | --- |
| Unificado v2, 2026-10-08 | 2218515 bytes | 97 | `76f31d9effc174e0d9133615c1e979a13f9b1f1c1b1ef291197ea2c4f129d68c` |
| Revisión Producto, 2026-10-20 | 2228555 bytes | 103 | `4b7d7374fc0a09be9697ff9784f093c2b737edbaabe82460c3aa7c64659f9aee` |

CRC de ambos: PASS. No hay nombres duplicados. Las 97 rutas compartidas tienen bytes idénticos; el segundo ZIP añade exactamente seis archivos bajo REVISION_PRODUCTO_2026-10-20. No reemplaza ni elimina contenido del primero. Los originales no se modificaron; la copia de inspección se extrajo exclusivamente en `/private/tmp` y ningún script del paquete fue ejecutado.

El manifiesto unificado de cada ZIP verifica 96 entradas y excluye su propia suma. Por ambos paquetes, los manifiestos anidados producen 362 coincidencias directas,10 PDFs reubicados con hash corroborado y8 referencias a PDFs secundarios excluidos expresamente por el creador del paquete. Esto representa, por ZIP, cinco originales reubicados y cuatro secundarios ausentes documentados en PDF_EXCLUIDOS.csv. No se inventa una verificación de bytes de esos cuatro archivos ausentes. Las seis adiciones de revisión no están cubiertas por el manifiesto histórico; sus hashes se calculan y conservan en el inventario nuevo. CRC/hash local acredita integridad de los bytes recibidos, no firma/autenticidad del emisor ni licencia.

Inventario completo, miembro por miembro, tamaño/hash/naturaleza/filas: [01_ZIP_MEMBER_INVENTORY.csv](01_ZIP_MEMBER_INVENTORY.csv). Comprobaciones de manifiestos y exclusiones: [02_INTERNAL_HASH_VERIFICATION.csv](02_INTERNAL_HASH_VERIFICATION.csv), [PACKAGE_INTEGRITY.json](PACKAGE_INTEGRITY.json).

### Poblaciones verificadas

| Población | Conteo confirmado | Significado y límite |
| --- | ---: | --- |
| Candidatos catálogo maestro / registro PO | 211 IDs únicos |27 ISO9001:2015 +116 ISO27001 +45 ISO42001 +10 Ley21.663 +13 Ley21.719 |
| Naturaleza editorial de esos 211 |58 operativos +93 referencias AnnexA resumidas +37 prácticas de áreas42001 +23 interpretaciones legales | No211 Requirements atómicos ni211 obligaciones verificadas |
| Catálogos individuales y registro JSON nuevo |211 | IDs y campos marco/edición/referencia/título coinciden con maestro; sin descarte |
| ISO9001:2026 adicional |104 propuestas,57 referencias de cláusula,8 cambios,18 checks | Población separada de 211; ni su aceptación normativa ni cobertura se infieren |
| Fuentes PDF aportadas |5 /204 páginas |9001:2015 42p; NCh27001 30p;42001 62p;21.663 28p;21.719 42p |
| Encabezados extraídos |743 |180/171/226/74/92 según esos documentos; candidatos heurísticos, no unidades validadas |
| Tablas detectadas automáticamente |0 | No prueba ausencia de tablas; anexos/tablas exigen cotejo posterior |
| Plantillas CSV |25 |15 del kit2026 +10 transversales, todas sin filas de negocio |
| Crosswalks propuestos |6 | POTENCIAL; mismas seis propuestas en CSV/JSON/revisión |
| Workbooks |2 /7 hojas | Maestro211 y kit2026; matrices estáticas, sin fórmulas |

El workbook maestro coincide con los 211 registros CSV. La hoja Cruces contiene las mismas seis filas, con encabezados de presentación distintos. En el kit2026, Cambios2026 tiene tres columnas; el CSV tiene cinco y añade acción/fuente: no son copias completas equivalentes. La etiqueta de origen `CONFIRMADO_ISO` de esa hoja no sustituye el cotejo de cada cláusula con el texto final.

Los 204 registros de página de los cinco archivos pages.jsonl y las cinco poblaciones de headings concuerdan estructuralmente con los manifiestos. Se inspeccionaron las cinco portadas renderizadas y se comprobó acceso textual a todas las páginas con PDFium; no se afirma cotejo visual/semántico completo. El parser pypdf rechazó el formato EOF de ISO42001; PDFium pudo abrir las 62 páginas. No se repararon bytes ni se declara corrupción a partir de esa diferencia de parser. Recibos: evidence/PDF_INSPECTION.json, WORKBOOK_INSPECTION.json y EXTRACTION_AND_EXISTING_CATALOG_CHECKS.json.

## 3. Identificación exacta del paso intermedio

**No se encontró un identificador oficial ni un contrato autónomo completo para este paso.** “Post-STEP6A4 / pre-STEP6A5” es una ubicación de continuidad declarada, no un nuevo número de fase aprobado. No se asigna STEP6A4B, STEP6A4.5 ni un gate de biblioteca inventado. El nombre de esta carpeta identifica sólo el expediente.

| Aspecto solicitado | Determinación respaldada |
| --- | --- |
| Identificador oficial | NO_FORMALMENTE_DEFINIDO |
| Nombre contractual | No existe nombre propio publicado; rector43 denomina **Fase4 — Packs regulatorios independientes y paralelos** al trabajo de fuentes/importación. “Biblioteca normativa” es propuesta funcional PO. |
| Ubicación | Ledger STEP6A3/26:18 y LEEME_UNIFICADO reservan la incorporación entre6A4 y6A5. La revisión actual está expresamente autorizada en esa posición; no altera roadmap. |
| Dependencias |6A3/6A4 cerrados; jerarquía/modelo/contratos congelados; fuentes/licencias y revisión por pack; bindings editoriales/tenant por cerrar; autorización futura de desarrollo/importación. |
| Alcance autorizado ahora | Inventario, comprobación de integridad, contraste rector/modelo/código, análisis N01–17, matrices, decisiones y secuencia propuesta. |
| Exclusiones | Código/datos/contratos/baseline/IAM, QA transaccional/importaciones, despliegues, Git de publicación y6A5/6A6. |
| Entregables actuales | Los14 entregables del mandato, trazados en §12; no un importador ni biblioteca funcional entregados. |
| Gate de implementación | Condiciones existentes rector43/45/46: taskpacket cerrado, decisiones materiales, contrato ejecutable/físico compatible y autorización. No hay gate numérico nuevo. |
| Gates QA | Contratos10: TC-REG-001, tenant/auth/SoD/idempotencia/concurrencia y TC-CONFIG-001 cuando corresponda; visual/UI nueva con gates activos. No ejecutados en esta tarea. |
| Aceptación humana futura | N01–17 ya aprobados conceptualmente; el resultado implementado necesitará aceptación UI/funcional del alcance nuevo y aprobación de contenido/pack aplicable. No repetir aceptación6A4. |
| Cierre futuro | Debe formalizarse en el taskpacket con entregables y gates aplicables de fuentes/coverage/implementación/QA/aceptación/trazabilidad. Hoy no existe contrato propio suficiente para declarar ese paso implementado/cerrado. |

La reserva temporal no autoriza convertir todo Reporting/Knowledge/IA en una nueva fase anticipada. Rector43 permite packs Fase4 independientes; las capacidades de riesgo, analytics/Report Studio e IA conservan sus fases6/9. La lectura normativa básica sigue disponible sin afirmar una importación oficial completa.

## 4. Compatibilidad del modelo y de la implementación real

La matriz [05_CANONICAL_MODEL_COMPATIBILITY.csv](05_CANONICAL_MODEL_COMPATIBILITY.csv) distingue catálogo canónico, tablas reales de migraciones, relaciones y superficie implementada. No se proponen entidades paralelas ni DDL/endpoints nuevos en esta entrega.

**El núcleo normativo sí está modelado e implementado parcialmente:** Framework/FrameworkVersion, NormativeUnit jerárquica, Requirement, Control/ControlVersion, sus dos mappings normativos distintos, crosswalks tipados, fuentes/import/coverage, applicability/assessment/SoA y evidencia. Existen servicio de pipeline regulatorio, validación de jerarquía/cobertura y persistencia transaccional, además de importador específico catálogo v1.1. Las rutas CoreGRC exponen unidades/requisitos por FrameworkVersion y la UI `NormsWorkspace` ya muestra una versión seleccionada con listas paginadas y detalles.

La API `listTenantNormativeContent` admite query y parent/unit; busca código/título/locator y resumen editorial de Requirement. Su proyección excluye texto licenciado completo. La UI Normas actual es una lista plana, no un árbol de biblioteca con tres niveles; tampoco conecta un buscador profundo de contenido editorial. El search global visible en shell no acredita búsqueda normativa funcional.

El catálogo versionado real v1.1 contiene5 packs,260 unidades,118 Requirements,131 controles de referencia (93+38),81 controles TCDX,333 mappings de contribución,131 editoriales,6 cabeceras crosswalk,28 mappings de unidades,188 de Requirements,278 de controles y1213 relaciones en cuarentena. Se verifica su manifiesto de 49 archivos como evidencia local; estos conteos no prueban datos activos QA ni publicación oficial. Los 211 candidatos nuevos no reemplazan estas identidades.127 filas tienen al menos una coincidencia literal de locator con el catálogo existente; es una ayuda de reconciliación, nunca una equivalencia semántica aprobada.

El importador `loadCatalogV11` exige identidad1.1/fecha y 49 archivos exactos; `materializeCatalogV11` abre transacción y escribe. No consume estos ZIP y no se ejecutó. El pipeline genérico sólo admite los cinco códigos de rector41; Ley21.663 requiere extensión de alcance contractual, no tablas por ley. La operación OpenAPI de publicación y las capacidades genéricas de IA/configuración no equivalen a rutas runtime registradas y verificadas: no se encontraron handlers `configurationOverrideCreate`, aprobación de override o IA en el registro principal inspeccionado. No se afirma ausencia de todos los componentes posibles del producto a partir de una búsqueda; sí falta su acreditación para este alcance.

Invariantes que el paquete debe conservar:

- Framework1:N FrameworkVersion; nueva edición conserva identidades e historia propias. El catálogo ya separa raíces/códigos2015 y2026; no se exige migrarlos a otra forma.
- FrameworkVersion1:N NormativeUnit; parent nullable de la misma versión, locator/order/idioma/hash/provenance y sin ciclos.
- NormativeUnit0:N Requirement; cada Requirement tiene una unidad primaria exacta y es atómico. Un heading, artículo completo o candidato operativo no crea automáticamente una obligación.
- RequirementControlMapping expresa contribución y NormativeUnitControlMapping ubicación de un control de referencia. AnnexA no se convierte en Requirement artificial.
- Instancia tenant conserva based_on_control_version_id y no modifica el control global. Global reference, baseline Platform y control tenant tienen autoridad distinta.
- Applicability/Assessment son tenant-owned y operan sobre Requirement; SoA decide sobre ControlVersion de referencia. Scope Subject no reemplaza tenant.
- EvidenceLink tiene seis targets tipados; ninguno es NormativeUnit. La biblioteca muestra evidencia descendiente sin evaluar la unidad.
- Crosswalk identifica ambas versiones y tipo de objeto; no fusiona IDs, copia assessments ni presume equivalencia temática.

## 5. N-01 a N-17 y tres niveles de información

Evaluación completa por requerimiento: [03_N01_N17_COMPATIBILITY.csv](03_N01_N17_COMPATIBILITY.csv). Resultado: **3 SUPPORTED_EXISTING,7 SUPPORTED_WITH_IMPLEMENTATION,7 REQUIRES_RECTOR_DECISION**. Ninguna intención funcional N01–17 es incompatible por sí misma; serían incompatibles las implementaciones que confundieran editorial/obligación, modificaran la fuente global desde tenant o calcularan cumplimiento fuera de contrato.

| Clasificación | Requerimientos | Alcance de la conclusión |
| --- | --- | --- |
| SUPPORTED_EXISTING |N02, N11, N16 | Identidad, procedencia/versionado/temporalidad y patrón de UI español existen; contenido/cobertura final y mejoras de presentación aún no se presumen completos. |
| SUPPORTED_WITH_IMPLEMENTATION |N01, N07, N08, N09, N12, N15, N17 | Pueden componer capacidades canónicas; faltan UI/proyecciones/bindings ejecutables según caso. N17 sólo preparación; motor IA fuera de alcance. |
| REQUIRES_RECTOR_DECISION |N03, N04, N05, N06, N10, N13, N14 | Vinculación y publicación del contenido editorial profundo por unidad, referencias adicionales y separación de autoridad necesitan cierre contractual. No se reabre la aprobación conceptual. |

### COMPRENDER

Texto/referencia auténtica: NormativeUnit.licensed_content/ref, locator, idioma, hash y versión, sólo con licencia. Obligación evaluable: Requirement con statement/locator y editorial_summary separado por la enmienda física20260928000400. Explicación, propósito, alcance, interpretación, terminología y ejemplos: KnowledgeItem/KnowledgeVersion es la capacidad canónica reutilizable para contenido versionado.

**Brecha material:** knowledge_items/versions tienen source/content_ref/hash/idioma/ownership/version/intervalo, pero no una FK a NormativeUnit/Requirement ni un binding ejecutable de estas tres capas por unidad. Guardar un UUID en prose/metadata o inventar una tabla normativa auxiliar no cierra esa integridad. D-04 debe definir el contrato de vinculación y el formato editorial; cualquier impacto físico debe demostrarse y someterse a la cadena rectora antes de proponerse DDL. No se presupone que sea necesario cambiar el modelo.

### IMPLEMENTAR

Actividades, responsabilidades sugeridas, ejemplos y errores frecuentes son orientación editorial. ControlVersion ya contiene objective, frequency_code, execution_method, verification_method, minimum_evidence y suggested_owner_role_code. Los mecanismos propuestos pueden homologarse a tcdx_baseline; sólo los controles auténticos de referencia pueden ser regulatory_reference. Roles sugeridos no asignan personas ni grants; periodicidad orientativa no se declara plazo legal.

### DEMOSTRAR

Requirement.evidence_expectations y ControlVersion.minimum_evidence permiten mostrar expectativas. Evidencias reales se consultan por EvidenceVersion/Link/Review, assessments, assurance, Issue/Action y lineage. Criterios de suficiencia pertenecen a métodos publicados y configuración autorizada; no se derivan de “nivel de confirmación” editorial ni del número de PDFs. Una vista por unidad agrega relaciones descendientes con permisos, versión/período y estado explícitos. No registra evaluación directa de NormativeUnit.

El esquema lógico del ZIP —NormativeFramework/FrameworkEdition/RequirementReference/ControlDefinition/CAPA/CertificationRecord, entre otros— es propuesta, no autoridad para crear tablas. Se traduce cuando haya equivalente: Framework, FrameworkVersion, NormativeUnit/Requirement, ControlVersion, Issue/Action. CertificationRecord/ManagementReview/Opportunity no se crean por analogía si su binding canónico no está cerrado. Tampoco se sustituyen vocabularios canónicos por BORRADOR/EN_COTEJO/CONFORME del paquete: pueden ser etiquetas documentales sólo si el contrato lo permite, no estados persistidos nuevos.

## 6. Personalización tenant, contexto y aprobación gerencial

Análisis por cada ajuste y rol: [07_TENANT_CUSTOMIZATION.csv](07_TENANT_CUSTOMIZATION.csv). La autoridad Platform publica norma/controles base; el tenant administra únicamente instancias o overrides autorizados. Los originales permanecen inmutables y versionados.

ConfigurationDefinition/Override/EffectiveConfiguration existen. Una definición publicada debe permitir el parámetro y scope mediante tenant_overridable/object_overridable; hay valores tipados, versión, effective interval, aprobador y capas reproducibles. El resolver/effective-read están implementados; no se acreditaron definiciones publicadas para estos cuatro ajustes ni workflow completo de su administración. Un permiso potencial, un DDL o la lectura de EC no crean ese binding.

Tenant Admin es rol canónico para proponer configuración autorizada. GRC Manager es candidato funcional a responsabilidad de gobierno, pero **no equivale automáticamente a gerente de empresa**. Executive/Board Viewer es lector, no aprobador. El catálogo05:226–232 publica create/update para GRC Manager/Tenant Admin, review para GRC Manager y **approve con base grant NONE**. No se inventa rol Gerente ni se concede un grant por este informe. Se requiere D-05 para ligar la autoridad empresarial a un rol existente, permiso/scope/policy/SoD y comando exactos. Aprobar en UI sin esa cadena no es autorización backend.

“Nivel de confirmación” necesita precisión: el tenant puede confirmar su adopción/implementación o una decisión de negocio; no autentica el texto ISO ni rebaja el estado de revisión Platform. Si el ajuste pretende alterar la obligatoriedad o suficiencia normativa, entra en conflicto. Valores base y cambios tenant deben conservar origen/versión, justificación, autor/revisor/aprobador, vigencia, correlación y audit. La independencia operacional sigue vigente donde corresponda; la autoridad única PO del desarrollo no suprime estos controles.

### Contexto empresarial y aplicabilidad

Organization contiene identidad/legal_name/display_name/country, no un campo de contexto profundo. Subject aporta tipo, display_name, ownership/scope y metadata abierta. Esa metadata no puede convertirse en almacenamiento informal de reglas de autorización, obligaciones o criterios críticos. KnowledgeVersion tenant-owned o DocumentVersion son capacidades existentes para contexto escrito versionado, pero su vínculo canónico con Subject/propósito y los permisos necesitan D-04/D-06.

RequirementApplicability ya conserva decisión applicable/not_applicable, scope, rationale, versión, vigencia y aprobación. No hay necesidad de inventar otra tabla de aplicabilidad. Las condiciones legales se citan en la obligación/guía y fundamentan la decisión humana por tenant; una sugerencia basada en contexto no cambia applicability por sí sola. La aceptación/rechazo de una recomendación y el comando de dominio que produce un hecho son actos separados. Si el PO requiere reglas computables de obligación general/condicionada, primero debe cerrarse su representación y aprobación; no se infieren desde prosa ni desde sector/país.

## 7. Fuentes normativas y vigencia

Matriz fuente por fuente: [10_NORMATIVE_SOURCES_STATUS.csv](10_NORMATIVE_SOURCES_STATUS.csv). Se distinguen metadatos externos consultados, bytes aportados, autorización de uso, validación semántica y gate interno de publicación. La existencia de un PDF o una página comercial no acredita licencia para reproducción multi-tenant, extracción, traducción o envío a IA.

- **ISO9001:2015:** el catálogo oficial la muestra retirada y reemplazada; se conserva independiente para historia/adopción explícita. El PDF aportado se identifica visualmente como traducción oficial2015; su nombreNOM no crea otra norma. Falta acreditar uso Tecdex y Amd1:2024. [ISO, edición2015](https://www.iso.org/standard/62085.html).
- **ISO9001:2026:** ISO registra edición6 publicada el16-09-2026. Por ello ya no debe diagnosticarse como publicación externa pendiente. Falta el contenido definitivo licenciado en el paquete; sus 104 propuestas siguen preliminares. TC176 documenta el FDIS de mayo2026 como antecedente verificable. [ISO, edición2026](https://www.iso.org/standard/9001), [TC176, FDIS](https://committee.iso.org/sites/tc176sc2/home/news/content-left-area/news-and-updates/iso-9001-revision-update-4.html).
- **ISO/IEC27001:2022:** edición3 publicada y enmienda2024 listada en ISO. El PDF es una adopción NCh2023 y contiene aviso de uso TRUSTTECH; no acredita autorización Tecdex. Los 93 candidatos AnnexA necesitan cotejo exacto y la enmienda no está aportada. [ISO27001](https://www.iso.org/standard/27001).
- **ISO/IEC42001:2023:** edición1 publicada; PDF inglés aportado. Las 37 prácticas por áreas y 8 operativas del catálogo no equivalen al catálogo oficial de controles ni a cobertura íntegra; licencia y homologación pendientes. [ISO42001](https://www.iso.org/standard/42001).
- **Ley21.663:** fuente BCN; el PDF declara versión01-03-2025. La aplicación distingue instituciones de servicios esenciales/OIV (arts4–6), deberes generales de obligados y específicos OIV (arts7–8); no impone automáticamente todo a cualquier tenant. El inventario completo de reglamentos y actos ANCI aplicables todavía debe cotejarse por objeto/fecha. [BCN21.663](https://www.bcn.cl/leychile/navegar?idNorma=1202434), [ANCI, inicio de funciones](https://anci.gob.cl/noticias/comienza-sus-funciones-la-agencia-nacional-de-ciberseguridad/).
- **Ley21.719 /19.628:** la modificatoria y el consolidado son fuentes distintas. BCN registra vigencia principal01-12-2026 y modificación21.806 de05-02-2026. Hasta30-11-2026 se distingue la versión vigente19.628 de09-05-2023; el consolidado diferido no está incluido como original. Se consultaron referencias oficiales, con varias aperturas SPA inaccesibles; no se simula descarga/cotejo íntegro. [BCN21.719](https://www.bcn.cl/leychile/navegar?i=1209272), [19.628 vigente](https://www.bcn.cl/leychile/Navegar?idNorma=141599&idVersion=2023-05-09), [consolidado diferido](https://www.bcn.cl/leychile/Navegar/imprimir?idNorma=141599&idParte=&idVersion=2026-12-01).

Admisión posterior del texto final2026: usar la versión2026 existente y reconciliar fuente/hash/units/Requirements/mappings mediante versión gobernada, manteniendo2015 y referencias históricas. Si hay contenido publicado, no sustituirlo en sitio: nueva versión/supersession y crosswalk. Publicación externa, draft interno, licencia y REGULATORY_PACK_PASS son estados diferentes. Este mecanismo está previsto por41/44 y no necesita una arquitectura distinta.

Las referencias legales de los 23 candidatos son rangos/temas; no se certifican artículos atómicos ni condiciones universales. Por ejemplo “1y1bis” debe resolverse al texto consolidado19.628 pertinente, no atribuirse sin más al número de artículo externo de la ley modificatoria. Aplicabilidad final requiere hecho/fecha/sujeto/fundamento y la autoridad tenant autorizada.

## 8. Cruces intermarcos y matrices gráficas

[06_INTERFRAMEWORK_RELATIONS.csv](06_INTERFRAMEWORK_RELATIONS.csv) conserva las seis propuestas POTENCIAL. Faltan ediciones exactas —“ISO9001” no distingue2015/2026—, identidades, tipo de mapping, relación/dirección, citas, confianza y aprobación. Un cruce7.5↔7.5 puede ser candidato editorial, no equivalencia de obligaciones. A.5.34↔“Seguridad de datos” cruza posibles tipos diferentes; no entra directamente en un crosswalk que exige ambos extremos del mismo tipo. Puede necesitar descomposición a relaciones canónicas, después de cotejo.

[09_GRAPHICAL_MATRICES.csv](09_GRAPHICAL_MATRICES.csv) analiza las siete matrices pedidas y la persistencia de configuración. Requisitos–controles, controles–evidencias, requisitos–evaluaciones, obligaciones–aplicabilidad y hallazgos–acciones tienen relaciones canónicas para vistas; faltan la composición/consulta/UI de matriz y, según caso, contrato de proyección. Normas–normas depende de crosswalks válidos de versiones exactas. Riesgos–controles existe en modelo, pero su runtime y heatmaps pertenecen a Fase6; reporting avanzado/Report Studio y cálculos agregados a Fase9.

Ejes y filtros válidos se limitan a los nodos accesibles: tenant, FrameworkVersion/edición, unidad/requisito, control/versión, evidencia/período/review, assessment/método/status, Subject/proceso y fechas cuando la relación exista. No se ofrece un filtro de dueño/proceso si no hay relación resoluble. Cada celda muestra relación y fuente, o ausencia/permiso/insuficiencia sin convertirlos en0. Los estados/versiones no se colapsan en un semáforo único.

Una matriz es proyección, no nuevos datos normativos ni nuevo motor de cálculo. Un porcentaje sólo se presenta si existe definición/método/denominador y evidencia suficientes. Guardar presets configurables exige binding versionado autorizado; ConfigurationDefinition no es un contenedor libre de preferencias y ReportDefinition no autoriza anticipar Report Studio. Exports heredan permisos, alcance/licencia y gates del contrato aplicable. D-07 debe delimitar vistas simples actuales y persistencia/analytics posteriores sin alterar el roadmap.

## 9. Preparación de validación semántica asistida por IA

[08_AI_READINESS.csv](08_AI_READINESS.csv) separa herramientas disponibles, procedimiento y motor futuro. Con herramientas actuales se ejecutó inventario/hash/CRC, lectura estructural de PDFs y workbooks, conciliación de cantidades/IDs y comparación estática de contratos/código. No se ejecutó el modelo propio ni validación semántica exhaustiva de las fuentes.

Procedimiento preparado, pendiente de autorización de ejecución específica:

1. Conservar source/hash/edición/licencia y página/cita; contrastar extracción contra original sin reparar silenciosamente ni omitir tablas.
2. Proponer jerarquía con parents/locators y tipificar encabezados, anexos y tablas. Revisar ciclos, duplicados y versión; no asumir heading=Requirement.
3. Separar obligación, recomendación, control auténtico, actividad TCDX y ejemplo. Atomizar sólo con citas que sustenten fuerza/condición; mantener211 candidatos aunque requieran división o asociación múltiple.
4. Proponer correspondencias y evidencia con tipo/dirección/rationale/confianza. Registrar dudas; confianza del modelo no equivale revisión normativa ni suficiencia metodológica.
5. Revisor humano competente confirma/corrige/rechaza cada resultado y sus versiones/citas; conserva autoría, razón y audit. Error genera corrección/supersession, sin borrar la salida anterior ni cambiar historia publicada.
6. Un artefacto semánticamente revisado pasa por el contrato de importación/coverage/publicación; no entra en BD por ser aceptado como texto de IA.

El modelo canónico ya incluye AIJob, AIRecommendation y AIProvenanceLink. Este último tiene FKs a KnowledgeVersion, Requirement, Control y otros objetos autorizados, pero no NormativeUnit directo: no se rellena arbitrariamente otro target para simular ese vínculo. Citas de unidad pueden prepararse dentro del artefacto documental; la persistencia futura de lineage a unidad requiere cerrar su binding (D-04/D-08).

La integración futura debe ser backend→`ia2.tcdx.int`, con propósito permitido, contexto mínimo, acceso/tenant/licencia, hash, proveedor/modelo y revisión. Se conserva techoA2 de36 y contrato17: aceptar una recomendación no autoriza automáticamente el comando de dominio. No se crean tablas IA, proveedor alternativo, embeddings, motorRAG ni un runtimeia-grc. Fallo de IA deja intactos hechos y cálculos determinísticos. INTELLIGENCE_RUNTIME y TC-AI-001 siguen en Fase9.

## 10. Brechas y decisiones materiales

[11_GAPS_AND_CONFLICTS.csv](11_GAPS_AND_CONFLICTS.csv) contiene26 filas y los diez campos solicitados. [12_PO_DECISIONS_REQUIRED.csv](12_PO_DECISIONS_REQUIRED.csv) concreta nueve decisiones de este expediente; **D-xx son referencias analíticas, no identificadores rectores nuevos**.

| Decisión | Pendiente preciso |
| --- | --- |
|D-01 | Formalizar taskpacket, nombre/identificador sólo si corresponde y fronteras del paso; distinguir homologación/consulta, navegación6A5 y Knowledge/IA/reporting posteriores. |
|D-02 | Alcance contractual de Ley21.663: pack/código/revisión/autoridad y bindings, sin inventarlos. Los10 candidatos se conservan. |
|D-03 | Fuente final/licencias/enmiendas/consolidado legal y cotejo por población; no aprobación normativa automática de 211. |
|D-04 | Binding canónico de guías profundas y contexto escrito versionado a unidades/requisitos/Subject; operaciones, permisos y revisión antes de decidir impacto físico. |
|D-05 | Cuatro ajustes tenant: significado de confirmación, definiciones/flags/scope; rol equivalente de gerente y permiso/grant/policy/SoD/command de aprobación. |
|D-06 | Identidad/tipo de seis cruces, referencias adicionales y representación de condiciones/contexto para aplicabilidad explicable. |
|D-07 | Matrices de consulta incluidas, ejes/filtros/presets/export y frontera con Risk/Report Studio. |
|D-08 | Mantener preparación de contenido/citas sin motor IA; cerrar propósito/modelo/licencia/seguridad sólo antes de su runtime autorizado. |
|D-09 | Homologar etiquetas/guías a métodos/result_status/conclusion vigentes; cualquier cambio de método requiere decisión distinta, no adopción del CSV. |

No se solicita volver a aprobar N01–17, la profundidad COMPRENDER/IMPLEMENTAR/DEMOSTRAR, los 211 candidatos ni la coexistencia2015/2026. Se pide resolver las representaciones/autoridades materiales que esa aprobación funcional no especifica. Tampoco se exige una segunda firma interna del desarrollo:45/49 permiten continuidad dentro de lo autorizado; las reglas reales de publicación de contenido, permisos y SoD del producto no se eliminan ni se simulan.

Conflictos si se implementara literalmente alguna propuesta no homologada: Requirement por cada control/heading; Evidence directa a NormativeUnit; estados/scores del ZIP como autoridad; editar contenido global desde tenant; gerente sin permiso; crosswalk genérico sin FK; resúmenes como texto oficial; IA decidiendo obligación legal; biblioteca paralela/tablas por norma. **No se implementó ninguno de esos conflictos.**

## 11. Secuencia propuesta, gates y dictamen de preparación

Propuesta dependiente de decisión, no roadmap nuevo ni autorización:

1. **Cerrar alcance/bindings del taskpacket** con D-01/02/04/05/06/07/09 aplicables. Elegir un alcance completo y verificable; los componentes no incluidos quedan declarados fuera del packet según fase rectora, no como deuda oculta. N01–17 siguen aceptados como objetivo funcional.
2. **Cotejo de fuentes por pack**, derechos/ediciones/enmiendas/consolidado/condiciones y manifiestos. Reconciliar211 y 104 propuestas2026, asignando identidades por businesskey y equivalencias justificadas; conservar todos los registros fuente y relaciones de trazabilidad.
3. **Cerrar contratos ejecutables y de contenido** para cualquier capacidad no expuesta: schema, proyección/lecturas mínimas, permisos/scope/policy/lifecycle/audit y lineage. Reutilizar modelo congelado; sólo un impacto demostrado conduce a decisión física gobernada, nunca DDL por convenienciaUI.
4. **Preparar adaptador/dry-run** sobre contratos existentes después de autorización de desarrollo; validar tipos, parents, atomicidad, hashes/coverage, identidad/replay/conflicto/publicado inmutable. Simular cambios sin escribir antes de solicitar la importación concreta. Rollback de fallo transaccional no significa borrar contenido histórico ya publicado.
5. **Implementación del alcance autorizado**, manteniendo capas oficial/editorial/tenant y datos canónicos; pruebas unitarias/contractuales y luego PostgreSQL/E2E reales, negativas/RBAC/SoD/licencias/concurrencia/idempotencia/auditoría aplicables al delta. Sin ampliar permisos para facilitar prueba.
6. **Importación QA/publicación** sólo con autorización específica y fuentes/gates por pack suficientes. Un pack insuficiente bloquea sólo su publicación/uso oficial. No convierte la biblioteca genérica en dependencia imposible de todos los textos.
7. **Aceptación y cierre del nuevo alcance**, con gates visuales/accesibilidad y revisión humana del resultado real, matriz requisito→contrato→datos/API/permiso→UI→prueba→runtime→evidencia. Registrar después el estado único en MASTER_EXECUTION_STATUS conforme al alcance autorizado. No iniciar6A5/6A6 como efecto automático.

Gates exactos y límites en [13_APPLICABLE_GATES.csv](13_APPLICABLE_GATES.csv). Se reutilizan `RECTOR_BASELINE`, `PHYSICAL_DATA_MODEL_REVIEW`, `EXECUTABLE_CONTRACTS`, `REGULATORY_PACK_<CODE>`, tests contractuales existentes y gates visuales. El cierre particular del paso aún debe formalizarse; los gates propuestos por el ZIP no adquieren condición oficial por esta revisión.

**Preparación entregada; implementación no preparada para ejecución integral** mientras falten alcance/bindings/material de fuente de los componentes elegidos y autorización. Esta conclusión no bloquea ni reabre STEP6A4, no descarta211 candidatos y no declara deuda técnica nueva: se documentan brechas antes de código. No se cambia arquitectura, contratos ni seguridad.

## 12. Entregables, verificaciones y capas

| Entregable del mandato | Ruta del expediente |
| --- | --- |
|1. Inventario ambosZIP |01_ZIP_MEMBER_INVENTORY.csv;02_INTERNAL_HASH_VERIFICATION.csv; PACKAGE_INTEGRITY.json; CATALOGUE_COUNTS.json |
|2. Identificación paso |Este reporte §3 |
|3. CompatibilidadN01–17 |03_N01_N17_COMPATIBILITY.csv |
|4. Homologaciónnormativa |04_HOMOLOGATION_211.csv;05_CANONICAL_MODEL_COMPATIBILITY.csv |
|5. Relacionesintermarcos |06_INTERFRAMEWORK_RELATIONS.csv |
|6. PersonalizaciónTenant |07_TENANT_CUSTOMIZATION.csv |
|7. PreparaciónIA |08_AI_READINESS.csv |
|8. Matricesgráficas |09_GRAPHICAL_MATRICES.csv |
|9. Fuentes |10_NORMATIVE_SOURCES_STATUS.csv; evidence/WEB_SOURCE_CHECKS.json |
|10. Brechas/conflictos |11_GAPS_AND_CONFLICTS.csv |
|11. DecisionesPO |12_PO_DECISIONS_REQUIRED.csv |
|12. Secuencia |Este reporte §11 |
|13. Gates |13_APPLICABLE_GATES.csv |
|14. Dictamenpreparación |Este reporte; RESULT.json |

Checks ejecutados: rector-governance/status PASS; CRC/SHA y delta de ZIP; conciliación211 maestro/individuales/registro; lectura204 páginas y workbooks; preservación del catálogo existente/manifiestos y cierre6A4; consistencia de matrices/hashes/preservación final. No se ejecutaron ni se declararon validadas pruebas semánticasIA, integracionesE2E nuevas o importaciones. Logs/recibos en evidence; fuentes locales y hashes en SOURCES_SHA256.json; sello SHA256SUMS.txt.

Archivos modificados preexistentes: **ninguno**. Archivos nuevos creados por esta tarea: exclusivamente esta carpeta. Base de datos, contratos ejecutables, backend, frontend, IAM/RBAC, baseline, metodologías, infraestructura y contratos de despliegue: **sin cambios**. OriginalesZIP/PDF y evidencias6A4 intactos. Sin migraciones, datosQA, despliegues, commits/push/merges/cambio de rama. Próxima acción: **PO resolver decisiones materiales de12_PO_DECISIONS_REQUIRED.csv y cerrar el packet; esta tarea no inicia implementación**.

### Antecedente adicional detectado al finalizar

Durante la ejecución apareció `docs/normative-sources/incoming/GRC_Tecdex_Conciliacion_Preimplementacion_Normativa_2026-10-20.md`, ausente del snapshot inicial y no creado ni editado por esta tarea. Se leyó íntegramente como antecedente documental adicional. Declara basarse en rector v1.1, sin repositorio vivo, y mantiene compatibilidad v1.12 pendiente. Sus reservas sobre editorial, gerente, matrices y Ley21.663 concuerdan con las brechas aquí acreditadas con v1.12 y código real; no aporta una activación, un identificador oficial ni autorización de implementar. Su hash se conserva en evidence/CONCURRENT_INPUT.json y SOURCES_SHA256.json. No se modifica el alcance de este dictamen ni sus fuentes rectoras.
