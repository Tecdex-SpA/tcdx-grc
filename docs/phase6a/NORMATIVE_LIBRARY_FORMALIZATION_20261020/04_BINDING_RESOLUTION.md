# 04 — Resolución arquitectónica de bindings

**Estado: propuesta técnica mínima, no efectiva.** Autoridad funcional: D01–D09 aprobadas en 01. No contiene SQL, migración, OpenAPI activo ni publicación IAM. B01–B11 son referencias de diseño de este expediente. La solución se consume sólo después de la cadena rectora de modelos/contratos y de la autorización de implementación correspondiente.

## Prueba de insuficiencia previa a proponer persistencia

`evidence/BINDING_MODEL_INSPECTION.json` enumera columnas del artefacto físico vigente y todas las tablas con columnas Knowledge. Sólo KnowledgeSource/Item/Version y AIProvenanceLink referencian esas identidades. KnowledgeVersion tiene item, contenido/ref/hash/idioma, versión, lifecycle, intervalo y supersession; no target normativo ni Subject. ConfigurationOverride tiene definición, scope, metodología, pack y Subject; no ControlVersion. El cotejo se contrasta con migraciones, FKs y diccionario físico. No es una afirmación sobre un servidor consultado: no hubo SQL.

| Mecanismo evaluado | Uso válido actual | Por qué no resuelve el binding faltante |
| --- | --- | --- |
| KnowledgeSource→Item→Version | Una sola autoridad de contenido editorial versionado | No identifica con FK la unidad/Requirement/ControlVersion/Subject explicado |
| content_ref / contenido de documento | Referencia de almacenamiento del cuerpo, con hash | Una URI/UUID en prosa no aporta integridad del target de negocio ni ownership |
| Subject.metadata | Atributos abiertos no críticos |29§7 impide usarlo para autorización, vínculos críticos, aplicabilidad o lineage |
| Requirement.editorial_summary / evidence_expectations | Resumen y expectativas de esa obligación | No son guía profunda de cada unidad ni contexto tenant; copiar global a tenant crearía otra autoridad |
| EvidenceLink | Evidencia de cumplimiento a seis targets cerrados | No tiene KnowledgeVersion ni NormativeUnit; usarlo como guía falsificaría su semántica |
| AIProvenanceLink | Fuente de una AIRecommendation tenant | Requiere recomendación real y otros targets; crear IA ficticia para vincular contenido está prohibido |
| Crosswalks existentes | Correspondencia entre versiones de unidades/requisitos/controles | No admiten Knowledge ni Subject; no sirven para guía editorial |
| Configuración existente | Valores tipados/versionados con permiso de override | Falta target ControlVersion para los cuatro ajustes por control; no codificar UUIDs en configuration_code ni JSON |
| Grafo/matriz calculado en UI | Presentación derivada | No puede crear ni ser autoridad de una relación de negocio, aprobación o resultado |

La necesidad probada es integridad y trazabilidad durable del contenido y decisiones, no navegación. Se priorizan las entidades existentes; sólo se proponen una relación soporte Knowledge y extensiones puntuales al scope de configuración. No se crean tablas por norma, repositorio editorial paralelo, entidad genérica de resultados ni nuevo subsistema IA.

## B01 — Sexto ámbito normativo: Ley 21.663

- **Actual:** rector37/41/44 y regulatory/model.ts reconocen cinco códigos. El motor ya soporta fuente `law`, artículos, disposiciones, Requirements, mappings y manifests.
- **Solución mínima candidata:** ampliar los datos/allowlist regulatorios con un sexto código propuesto **`CL_LEY_21663`**, siguiendo el patrón existente. Es una propuesta técnica identificada, no un código vigente ni creado en esta tarea. Mantener raíz/versiones/fuentes/coverage independientes; no modificar CL_LEY_21719 ni migrar IDs históricos.
- **Impacto rector y lógico:** delta acotado a 41 y referencias de 37/43/44 que enumeran población; usar el mismo modelo genérico. No nueva tabla/columna por ley. No inventar una nueva CommercialFamily: la familia legal existente se utiliza sólo si su contrato publicado permite la relación; publicar relación/datos de oferta y entitlements afectados explícitamente, nunca asignar derechos tenant por código.
- **API/UI:** los contratos genéricos de pack/FrameworkVersion se extienden en su allowlist; navegación, lectura, applicability, relaciones y evidencia usan los mismos comandos. No endpoint específico de esta ley.
- **RBAC/SoD:** Steward/Compliance/GRC y revisión competente cuando la publicación formal lo requiera, mediante autoridad operacional real. Ninguna nueva aprobación jurídica del alcance de producto. La decisión jurídica específica de un tenant es distinta de la validación de autenticidad/atomicidad de una fuente.
- **Auditoría/gate:** source/hash/edition/import/coverage y publicación independientes; `REGULATORY_PACK_<CODE>` sólo tras sus requisitos. Actualizar contratos/modelo de allowlist antes de implementación, sin activar baseline en esta ejecución.

## B02 — KnowledgeVersion hacia cuatro targets canónicos

**Solución elegida para la preparación:** relación soporte tipada entre una KnowledgeVersion concreta y exactamente uno de NormativeUnit, Requirement, ControlVersion o Subject. Es una ampliación relacional candidata de Knowledge, subordinada a 30/33/44; no una nueva autoridad editorial. Se propone nombre físico `knowledge.knowledge_version_context_links` únicamente para permitir revisión concreta. No existe hoy y no se crea.

Diccionario propuesto, sin DDL:

| Campo / propiedad | Tipo / regla candidata |
| --- | --- |
| ID del vínculo | UUIDv7 canónico, generado por el servicio autorizado |
| knowledge_version_id | FK obligatoria a versión exacta, nunca “latest” mutable |
| normative_unit_id / requirement_id / control_version_id / subject_id | Cuatro FKs nullable tipadas; CHECK XOR exige exactamente una. No par object_type/object_id sin FK |
| ownership_class / tenant_id | Misma autoridad que KnowledgeVersion. Global no apunta a Subject/objeto privado; tenant conserva su tenant y sólo puede referenciar global visible o su propio objeto |
| función del vínculo | Dato contractual publicado que distingue explicación/implementación/demostración/contexto conforme a D04; etiquetas no son nuevos estados de cumplimiento |
| procedencia | Source/content version, locator/cita, hash del contenido y fundamento; no URL externa ejecutable como autoridad |
| autoría/auditoría | Actores canónicos de la creación; auditoría transaccional, correlación e idempotencia |
| unicidad | Una asociación por versión de Knowledge, función y target exacto; no duplicación de vínculo semántico |
| inmutabilidad | El conjunto de vínculos integra el hash del artefacto publicado. Después de publicación no hay PATCH/DELETE ordinario; corrección produce nueva KnowledgeVersion y vínculos nuevos |

Cardinalidad: KnowledgeVersion 0:N vínculos; cada vínculo 1 target; cada target 0:N versiones editoriales. No se necesita una quinta entidad “cláusula” ni reubicar Requirements. La versión temporal/publicación se hereda de KnowledgeVersion; la vigencia del target también se revalida a la fecha de consulta. Referenciar NormativeUnit/Requirement fija su FrameworkVersion y sus identidades inmutables; ControlVersion ya fija versión; el contexto Subject queda acompañado por el hash/revisión del contexto escrito, sin prometer versionado inexistente de la fila Subject.

**Integridad tenant:** FK física al ID concreto + comprobación de ownership/tenant de fuente y target al escribir y publicar; para targets tenant, integridad compuesta tenant+ID donde sea aplicable. Referencias globales requieren FK más constraint/policy de compatibilidad global/tenant, no una FK compuesta con NULL que permita saltar controles. La especificación física posterior debe materializar estos predicados y probar que no se pueden insertar vínculos cruzados ni crear global→privado por SQL de prueba. La autorización de lectura se evalúa otra vez; un vínculo persistido no concede acceso a un pack.

**API mínima candidata:** lectura de versiones Knowledge y asociaciones bajo autorización del target; comando de autoría/publicación Knowledge controla el conjunto completo de cuerpo y vínculos. Falta permission publicada específica de KnowledgeItem en catálogo 05. Se propone publicar sólo las acciones justificadas del recurso canónico `knowledge.knowledge_item`: read/create/update/review/publish, con códigos siguiendo 22, marcados **candidatos**. No reutilizar `knowledge.regulatory_pack.publish` para editar guías. Global y tenant usan scopes/contextos explícitos distintos; no permiso por nombre de rol. La matriz de grants debe publicarse antes de exponer un handler.

**Publicación global:** los roles tenant Steward/GRC no generan por sí solos PlatformRoleAssignment. La ruta global debe resolver autoridad Platform real y grant platform explícito; una propuesta mínima usa el rol Platform Admin existente para operación global, con las funciones editoriales/revisiones auténticas requeridas y predicados de contenido. No se crean roles Platform de conveniencia ni una Membership ficticia. Permisos globales/grants/operador aún no están publicados: impedimento contractual acreditado, no un bypass permitido. Los rectores 45/49 no autorizan convertir autoría editorial en aprobación de evidencia propia.

**Contenido/ref:** reutilizar KnowledgeVersion.content_ref/content_hash/content_language. El cuerpo tiene tres secciones semánticas de D04 y citas; no contiene IDs usados como sustituto de las FKs. El adaptador de contenido debe resolver un recurso inmutable/autorizado y sus restricciones de clasificación/licencia/retención antes de leerlo. No puede convertir un archivo tenant en almacenamiento global ni devolver URLs directas. Si ese contrato de custodia aún no cubre un cuerpo global, debe cerrarse antes de persistirlo; no se afirma que DocumentVersion/FileObject tenant ya resuelvan ese caso por analogía.

**Impactos:** modelo lógico/físico de relación soporte, Knowledge publication, operaciones/permissions nuevas justificadas y UI de capas. Audit y contratos de privacidad/acceso. Gates: revisión del delta conforme46§6 y EXECUTABLE_CONTRACTS; luego pruebas físicas/tenant/replay/immutable. Ningún gate efectivo se cambia aquí.

## B03 — Contexto empresarial y vínculo con la fuente

Reutilizar **KnowledgeItem/KnowledgeVersion TENANT_OWNED** para el contexto narrativo. Vincular mediante B02 a un Subject organization/proceso u otro Subject elegible del mismo tenant. Organization conserva identidad legal; no se le agrega prosa de contexto por conveniencia. El contexto es una entrada declarada por el tenant, no un hecho normativo ni un permiso.

El esquema documental candidato separa descripción, alcance declarado, actividades/procesos referenciados, supuestos, preguntas pendientes, autoría, vigencia y citas. Las relaciones críticas van por FKs de B02 o entidades existentes; texto/metadata no deciden applicability. No se infiere tamaño/sector/país ni una condición jurídica desde una palabra.

Un usuario autorizado propone versión; revisión/publicación tenant aplica permisos Knowledge candidatos de B02 y SoD de la operación aprobada. La selección de una versión vigente para evaluar contexto es explícita e inmutable en la decisión/audit. No se copian ni cambian declaraciones históricas al editar el contexto. Si el contexto se guarda como DocumentVersion existente, sólo se reutiliza su recurso/retención mediante contrato de custodia; no se crean dos cuerpos autoritativos iguales en Document y Knowledge.

## B04 — Cuatro ajustes mediante configuración canónica

Reutilizar ConfigurationDefinition/Override/EffectiveConfiguration y valores tipados. Cuatro definiciones funcionales: actividad operativa, evidencia recomendada, periodicidad y nivel de confirmación operativa. Sus códigos concretos/defaults/allowlists son datos versionados a publicar, no constantes en código ni valores fijados por este informe.

**Carencia exacta:** ConfigurationOverride y EffectiveConfiguration resuelven Subject/pack/metodología, pero no un ControlVersion concreto. ScopeSubject no identifica inequívocamente uno entre muchos controles del mismo proceso; usarlo para todos silenciosamente alteraría el alcance. No crear una definición por UUID de control.

**Extensión mínima candidata de tablas existentes:** FK `control_version_id` nullable en ConfigurationOverride y FK equivalente de destino resuelto en EffectiveConfiguration; extender scopes permitidos de ConfigurationDefinition y el cálculo de specificity/input_hash a esta dimensión. No tabla de configuración paralela. El nuevo scope propuesto debe publicarse con su código/versionamiento y FK al ControlVersion tenant del mismo tenant, sin abrir scopes de permisos por analogía. Definición+tenant+target+versión/intervalo forman la business key correspondiente. Conflictos de igual especificidad fallan explícitamente.

**Base original:** el valor base sigue en ControlVersion global/tenant y/o la Definition publicada que lo referencia. Cuerpo editorial no es fuente de parámetros críticos. Una configuración superior debe autorizar el campo; el ajuste no modifica ControlVersion global ni reduce una obligación auténtica ni suficiencia metodológica. La proyección muestra base, override, autor/aprobador, vigencia y valor efectivo. La aplicación del ajuste a la guía/matriz usa el mismo resolver y lineage, no otro motor de precedencia frontend.

**Límites semánticos concretos:** actividad/evidencia recomendadas son orientación operativa; evidencias realmente aprobadas siguen su workflow propio. Periodicidad consume vocabulario temporal permitido y diferencia frecuencia de duración exacta; no mes = 30 días. Confirmación operativa describe el grado de constatación de ejecución declarado/exigido por una Definition, jamás autenticidad de ISO, calidad jurídica o estado de metodología. No hay catálogo publicado de sus niveles ni default acreditado: **impedimento de datos contractuales**, a cerrar con definición tipada/validación/etiquetas y transición permitida, sin pedir de nuevo si la funcionalidad debe existir.

**Impactos:** dos extensiones de destino en configuración y resolver, índices/FKs/uniques/validations, schema de operaciones y UI.47/46§6 y gate físico/ejecutable previos. No se resuelve el grant de aprobación mediante esta modificación de datos: B05 es una publicación IAM separada.

## B05 — Aprobación empresarial con roles existentes

Solución técnica propuesta: Tenant Admin propone; **GRC Manager** del mismo tenant revisa y decide empresarialmente con permiso efectivo, usando el rol canónico de gobierno transversal de 42. No se crea rol Gerente ni se confunde Executive/Board Viewer con aprobador. No se afirma que todo titular del rol sea representante legal: el tenant asigna la responsabilidad mediante sus mecanismos IAM autorizados.

Se mantiene el catálogo actual create/update/review. Se propone, como delta IAM mínimo de producto, publicar un grant base tenant de `configuration.configuration_override.approve` al rol GRC Manager, limitado por ObjectPolicy a los cuatro tipos de ajuste autorizados y su target, con CORE_PLATFORM y cadena Membership/Role/Scope vigente. **Hoy base NONE; hoy DENY.** No ampliar el permiso a todos los parámetros, no grant a Tenant Admin/Platform por esta decisión y no grant individual. Si el catálogo no permite ese predicado por operación sin afectar otros consumidores, mantener el grant pendiente y publicar primero la policy; no hacer una concesión amplia temporal.

SoD candidata mínima: autor no puede revisar ni decidir aprobación/rechazo empresarial de su propia propuesta, aunque acumule Tenant Admin y GRC Manager. El revisor puede ser también el decisor sólo si la policy de configuración aplicable lo permite; no se inventa obligación universal de tres personas ni se relajan separaciones más fuertes existentes. El paquete de publicación debe cerrar ese predicado explícitamente; hasta entonces no hay ALLOW derivado. La decisión se toma sobre hash/versión/target exactos; una revisión de otra versión no cuenta.

## B06 — Comandos, ciclo, concurrencia y auditoría del ajuste

No se encontró wire contract completo ni handlers de review/approve para el ajuste. La propuesta completa se registra para publicación futura:

| Operación candidata | Estado/efecto propuesto | Permiso existente a utilizar después de su grant/policy |
| --- | --- | --- |
| configurationOverrideCreate (nombre ya contratado) | Crea propuesta draft; sólo valores/target permitidos por Definition | configuration.configuration_override.create |
| configurationOverrideUpdate | Cambia sólo borrador propio elegible; invalida hash/revisión previa | configuration.configuration_override.update |
| configurationOverrideReview | draft→reviewed con revisión; draft→rejected con rechazo motivado; actor distinto | configuration.configuration_override.review |
| configurationOverrideDecide | reviewed→approved o reviewed→rejected, razón obligatoria y decisión sobre hash revisado | configuration.configuration_override.approve; grant propuesto B05, no vigente |
| effectiveConfigurationGet existente | Lectura de resultado persistido autorizado; no materializa ni inventa bindings | configuration.effective_configuration.read según binding vigente |

Los tokens draft/reviewed/approved/rejected y las nuevas operaciones son **propuesta explícita de registry/wire**, no transiciones actuales de ConfigurationOverride. No se reutiliza un lifecycle de Evidence ni se escribe estado directo. Vigencia es condición derivada de approved+intervalo y definición/target elegibles; no nuevo estado efectivo persistido. Auditoría de rechazo/revisión no se trata como evidencia de cumplimiento.

Contratos futuros de create/update incluyen Definition exacta, target tipado y sólo el valor correspondiente a su value_type, intervalo y justificación. Tenant se deriva de sesión, no del cuerpo. Review/decide incluyen hash/ETag fuerte, razón y decisión cerrada; idempotency/correlation obligatorios. Respuesta identifica la misma versión/target y estado y no retorna información privada de otro tenant. Códigos de error/headers/status se cierran según ejecutables06/07/12 antes de handlers; no se presenta DomainCommandRequest genérico como schema suficiente.

KnowledgeVersion y ConfigurationOverride **no tienen row_version** en el modelo inspeccionado. No inventar expected_version sobre una columna ausente: usar ETag fuerte del agregado canónico/version/hash/estado con lock y compare-and-swap transaccional, siguiendo contrato12, o someter una alternativa física explícita. Mismo key/payload repite la misma decisión; key con payload distinto/conflicto concurrente devuelve 409 sin segundo audit/evento. Create y cada transición persisten estado+AuditEvent+outbox/idempotency atómicamente.

Audit conserva autor, revisor, decisor, tenant, target, Definition/version, valor anterior/nuevo minimizado, razón, hash revisado, intervalo y correlation. No son necesarios nombres de personas ni firmas simuladas para diseñar el contrato. Una aprobación que cambiaría un intervalo ya publicado se realiza por sucesión prospectiva y corte controlado bajo lock/audit cuando el contrato temporal lo permita; nunca borra historia ni recalcula resultados anteriores. Si la policy temporal no autoriza cerrar el intervalo anterior, se rechaza el solapamiento y se completa ese delta antes de ofrecer edición; no se mantiene un workaround.

## B07 — Aplicabilidad, correspondencias y referencias

Reutilizar crosswalks y mappings tipados por versiones fuente/destino; las seis propuestas siguen POTENCIAL hasta resolver identidades/citas/review. Reutilizar RequirementApplicability con rationale/intervalo/Subject opcional y commands existentes. Vincular evidencia por targets ya autorizados. La explicación por unidad recorre requisitos descendientes; nunca assessment o EvidenceLink directo a NormativeUnit.

El contexto concreto utilizado se conserva como cita a KnowledgeVersion y hash en el artefacto de revisión de applicability; para lineage durable de negocio se propone una FK tipada desde la decisión de applicability a la KnowledgeVersion utilizada, sin ampliar los cuatro targets de B02. No basta guardar el ID en rationale. Esa extensión se debe incluir en el análisis físico antes de implementarse: candidata FK `context_knowledge_version_id` nullable en RequirementApplicability, mismo tenant y versión publicada compatible. Es un campo de procedencia de la decisión, no una nueva autoridad de aplicabilidad. Históricos quedan NULL explícito sin backfill inventado. No se agrega motor de recomendación ni estado obligation_conditional al modelo.

Las referencias intra-edición de una unidad a otra que no sean parent tampoco se fuerzan a ser crosswalk entre ediciones. No se requiere nueva tabla sólo para enlaces de lectura: se muestran citas editoriales resolubles, sin autoridad de equivalencia. Si una referencia debe ser una relación normativa persistida/crítica, el contrato debe tipificarla y someter su delta; no se presume resuelta por un href. Este impedimento queda aislado de los crosswalks ya soportados.

## B08 — Matrices y consulta

Las seis matrices son proyecciones de mappings/evidencia/applicability/assessments/Issue→Action. Proponer una operación de lectura de matriz con ejes tipados y filtros cerrados, no un endpoint que reciba SQL/nombres de tabla ni un motor nuevo. Se documenta como **matrixRead (candidata, sin ruta/permiso publicados)**. El backend valida cada eje/fila/celda y la intersección de permissions/capabilities necesarias; un permiso de lectura de control no da lectura de evidencia o Risk.

Metadatos de celda: relación canónica/version/provenance y resultado existente cuando sea legible; no valor derivado inventado. Paginación/virtualización y límites son datos del contrato de consulta, sin truncamiento silencioso. Conteos protegidos no se filtran ni se revelan por densidad de una celda. Miniaturas y vista completa consumen la misma fuente autorizada. Detalle de ubicación y colores en 07.

## B09 — Preferencias/exportaciones sin autoridad paralela

Filtros/selección durante una sesión son estado efímero UI. Guardar presets no es requisito de entrada para consultar una matriz. Si se habilita persistencia, usar ConfigurationDefinition/Override para un parámetro de presentación publicado, con schema cerrado de ejes/filtros no sensibles y autoridad de configuración; no un resultado o regla normativa incrustado. Las columnas JSON tipadas existentes se admiten sólo para layout no crítico; permisos/targets/autorización se revalidan y los vínculos críticos no se almacenan como IDs libres en ese JSON. No añadir tabla matrix_results.

Exportación persistida/formateada necesita el binding ReportDefinition/Run/Artifact/Snapshot y permission/export que corresponda; ese contrato está en fase posterior y no se anticipa Report Studio. No se ofrece un botón que simule exportación ni se elimina del objetivo aprobado: se marca su dependencia explícita.

## B10 — Preparación IA y discrepancia de infraestructura

Persistir metadatos/citas/versiones y revisar las relaciones de B02/B07. Reutilizar AIJob/Recommendation/ProvenanceLink sólo cuando haya actividad IA real futura; no filas IA para unir guías. Destino PO futuro ia-engine/192.168.2.44 y contrato activo ia2.tcdx.int son identidades no reconciliadas. No lookup, ping, SSH, DNS, providerRef, secret o alias se cambian en esta tarea. La reconciliación/ADR y su gate de seguridad se prepararán antes de runtime Fase9, no bloquean el contenido documental actual. 08 fija el procedimiento.

## B11 — Métodos y estados

Conservar métodos publicados, referencias y guards de suficiencia. Homologar etiquetas de presentación sin equivalencias automáticas: conforme necesita result_status válido y domain_conclusion compatible; sin evidencia no es por sí solo incumplimiento; no aplica necesita decisión autorizada, no ausencia de dato. Confianza de extracción, confirmación operativa y suficiencia de evaluación son dimensiones separadas. Mejora metodológica, si se demuestra necesaria, requiere su análisis/gate propio y no recalcula historia por importar un catálogo. 05 y 11 contienen pruebas de aceptación.

## Resultado de resolución y puertas técnicas

Los mecanismos mínimos se han seleccionado y las insuficiencias quedan demostradas; **no hay cambio físico/API/IAM activo**. Los impedimentos de activación son: relación Knowledge faltante; scope ControlVersion/contexto de decisión faltantes; wire/registry/grant/policy de aprobación no publicados; definiciones/vocabulario operativos no publicados; sexto código contractual pendiente; acceso/custodia de contenido y permisos Knowledge sin publicar; identidad IA futura sin reconciliar sólo para su fase. Se proponen soluciones y el orden de publicación en 09, sin volver a pedir aprobar la funcionalidad D01–D09.
