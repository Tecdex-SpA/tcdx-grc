# 01 — Registro de decisiones aprobadas del Product Owner

Fecha de la decisión: **2026-10-20**. Autoridad: **Product Owner**. Fuente primaria: mandato «GRC TECDEX — PROMPT MAESTRO DE CONTINUIDAD MULTICUENTA CODEX», recibido en esta ejecución. Baseline efectiva verificada: `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`.

`D01_D09_PO_DECISIONS=APPROVED`; `FUNCTIONAL_SCOPE=APPROVED`; `HUMAN_ACCEPTANCE_CRITERIA=APPROVED`; `IMPLEMENTATION_AUTHORIZATION=NOT_GRANTED`.

Este registro persiste las decisiones sin atribuir firma digital, aprobación de bytes derivados ni autorización de implementar. El diagnóstico anterior conserva su sello; las solicitudes conceptuales de D-01..D-09 de aquel expediente quedan respondidas por D01..D09 de este mandato. Las propuestas técnicas de 04/06/09 son candidatas, no contratos activos.

## D01 — Denominación y alcance

El paso intermedio se denomina **Biblioteca Normativa, Estructuración y Homologación Regulatoria**. Esta denominación está aprobada. Codex deberá formalizar su ubicación contractual y sus dependencias utilizando los mecanismos rectores existentes. No inventar un identificador numérico de fase. No reordenar el roadmap. No anticipar STEP6A5, STEP6A6 ni fases posteriores. La biblioteca debe ser funcional y estar integrada con el modelo canónico, no limitarse a almacenar archivos.

## D02 — Ley 21.663

Se autoriza incorporar la **Ley 21.663 de Chile** como sexto ámbito normativo independiente de GRC Tecdex. Esta decisión no está condicionada a una nueva aprobación jurídica del producto. La determinación jurídica específica de aplicabilidad corresponderá al tenant cuando sea estrictamente necesaria. Codex deberá resolver la incorporación mediante los contratos regulatorios canónicos. Debe conservar los diez candidatos existentes para homologación.

Debe permitir identificación normativa, versionado, estructura jerárquica, artículos y disposiciones, requisitos, controles relacionados, evidencias, aplicabilidad, referencias normativas, relaciones con otros marcos y auditoría. No se presumirá que todas las obligaciones son aplicables a todos los tenants. La decisión comercial de incorporar la ley está cerrada. La adecuación técnica del contrato que actualmente reconoce cinco códigos deberá resolverse conforme a la gobernanza existente. No crear tablas específicas para esta ley.

## D03 — Fuentes y utilización en desarrollo y QA

Se aprueba el procedimiento de validación por fuente, edición y paquete normativo. Los gates de publicación deben mantenerse independientes. El Product Owner requiere que los materiales normativos disponibles puedan utilizarse en desarrollo y QA sin restricciones funcionales internas. Codex deberá habilitar los usos técnicamente autorizados en esos entornos, sin confundir uso interno de preparación con publicación oficial o distribución a clientes.

Los derechos de terceros legalmente aplicables no pueden darse por inexistentes. Si una autorización de reproducción, distribución o procesamiento externo no está acreditada, deberá registrarse la limitación concreta, sin bloquear injustificadamente las actividades internas que sí puedan realizarse. La ausencia de licencia comercial de publicación no debe convertirse automáticamente en bloqueo general de toda la biblioteca.

Deben distinguirse integridad del archivo recibido; autenticidad y procedencia; validación semántica; derechos de utilización; homologación; publicación oficial dentro del producto. No inventar obligaciones oficiales. No presentar borradores como textos definitivos.

## D04 — Contenido editorial profundo

Se aprueba el modelo funcional de tres capas: **fuente normativa oficial; contenido editorial Tecdex; contexto empresarial del tenant**.

La experiencia debe presentar:

- **COMPRENDER:** texto o referencia normativa; explicación; propósito; alcance; interpretación; terminología; referencias relacionadas; ejemplos; errores frecuentes.
- **IMPLEMENTAR:** actividades recomendadas; controles asociados; responsabilidades sugeridas; procedimientos; frecuencias orientativas; recomendaciones prácticas; relaciones con procesos empresariales.
- **DEMOSTRAR:** evidencias esperadas; evidencias existentes; evaluaciones; resultados metodológicos; hallazgos; acciones; trazabilidad; suficiencia conforme a métodos publicados.

Se reutilizarán prioritariamente `KnowledgeItem` y `KnowledgeVersion`. Codex deberá determinar el mecanismo contractual correcto para vincular este contenido con `NormativeUnit`, `Requirement`, `ControlVersion` y `Subject`, según corresponda. Los vínculos deben ser tipados, versionados, auditables y compatibles con permisos, tenant, procedencia y publicación.

No se autoriza crear una tabla adicional simplemente para resolver la navegación. Antes de cualquier propuesta física deberá acreditarse que los mecanismos existentes son insuficientes.

## D05 — Personalización por tenant

Se aprueba permitir al tenant configurar, dentro de las facultades autorizadas, actividades de control, evidencias recomendadas, periodicidades y niveles de confirmación operativa. Flujo funcional aprobado: **Propuesta → Revisión → Aprobación o rechazo → Vigencia → Auditoría**.

Codex deberá identificar roles existentes, permisos efectivos, grants, scopes, políticas SoD, comandos, ciclo de vida, auditoría y versionado. No inventar un rol gerencial si existe una solución canónica válida. No conceder autoridad por nombre de cargo. No asumir que `configuration.configuration_override.approve` está habilitado: el expediente acredita grant base `NONE`. La aprobación empresarial debe ejecutarse mediante autorización backend real. El tenant no puede modificar el contenido normativo global. Los niveles de confirmación no modifican la autenticidad de una fuente ni los criterios normativos de cumplimiento.

## D06 — Aplicabilidad y correspondencias

Se aprueban las correspondencias normativas tipadas y la aplicabilidad contextualizada. Cada relación deberá preservar, según el contrato aplicable, marco y edición de origen, marco y edición de destino, objetos relacionados, tipo, dirección, fundamento, procedencia, confianza, revisión y aprobación.

Conservar las seis correspondencias preliminares. No publicarlas como equivalencias verificadas sin homologación. No inferir cumplimiento automático entre normas. La aplicabilidad debe considerar el contexto empresarial del tenant. Reutilizar `RequirementApplicability`. Las recomendaciones contextuales no deben modificar automáticamente decisiones de aplicabilidad. La aceptación de una recomendación y la ejecución del comando de dominio correspondiente son operaciones distintas. No utilizar metadata abierta como sustituto de reglas críticas.

## D07 — Matrices gráficas

Se aprueban matrices gráficas derivadas del modelo canónico. No duplicar información. No crear un motor de cumplimiento paralelo.

**Dashboard:** matrices pequeñas, coloreadas y visualmente comprensibles; vistas resumidas con navegación a información detallada cuando contratos y permisos lo permitan. Los colores representan estados reales y metodológicamente válidos; no aparentan cumplimiento sin evaluación válida.

**Vista completa:** una vista específica de matrices; ubicación funcional preferente en **Riesgos**, verificando arquitectura y dependencias de su fase. No anticipar funcionalidades transaccionales de riesgos de fases posteriores.

Matrices aprobadas: Requisitos × Controles; Controles × Evidencias; Requisitos × Evaluaciones; Normas × Normas; Obligaciones × Aplicabilidad; Hallazgos × Acciones. Riesgos × Controles se integra cuando sus capacidades canónicas estén habilitadas conforme al roadmap.

Según relaciones y permisos disponibles, permitir selección de marcos y ediciones, filtros, navegación, inspección de celdas, consulta de relaciones y procedencia, identificación de información insuficiente y restricciones de acceso. No anticipar Report Studio. No inventar indicadores ni porcentajes. Persistencia de preferencias y exportaciones requieren un binding canónico autorizado.

## D08 — Preparación para IA propia

Se aprueba exclusivamente preparación estructural y documental para IA. Infraestructura futura prevista por el PO: **HOST=ia-engine; IP=192.168.2.44**. Se ha utilizado en otros proyectos según el mandato; esta entrega no verifica ese historial ni su runtime. Su utilización efectiva se verificará al autorizar integración. La IP no autoriza conectividad inmediata, cambios de infraestructura ni sustitución de contratos vigentes.

Antes de implementar runtime, reconciliar el destino con el contrato que referencia `ia2.tcdx.int`. No asumir que ambos nombres son el mismo servicio.

Preparación actual: contenido estructurado, versiones, citas, procedencia, relaciones, contexto tenant, restricciones de licencia, historial de revisión, auditoría, IDs canónicos y metadatos necesarios para recomendaciones futuras.

Fuera de este paso: inferencia en producción, RAG, embeddings, agentes, motor de recomendaciones, nuevos proveedores, integraciones runtime, acceso directo de IA a PostgreSQL y modificaciones de VM. IA futura bajo contratos de seguridad, aislamiento, propósito y autorización correspondientes.

## D09 — Homologación metodológica

Se aprueba homologación conservadora de estados y métodos. Preservar metodologías existentes. Se admiten mejoras consistentes cuando se demuestre que no generan incompatibilidades, deuda, regresiones, hardcodes, ruptura contractual, pérdida de trazabilidad ni cambios indebidos de resultados históricos.

Las etiquetas editoriales de los ZIP no sustituyen automáticamente `result_status`, `conclusion` ni métodos publicados. Una mejora metodológica pasa los gates rectores aplicables. No modificar metodologías para facilitar importación.

## Impacto, dependencias, formalización y aceptación por decisión

| Decisión | Impacto funcional / arquitectónico | Contratos y dependencia concreta | Formalización documental / evidencia / aceptación |
| --- | --- | --- | --- |
| D01 | Biblioteca integrada; ubicación post6A4/pre6A5 sin nueva fase |43/45/46/47/49; task packet09 | Nombre y alcance registrados; ejecutar sólo tras contratos efectivos y autorización futura; AC01/02 |
| D02 | Sexto ámbito; mismo motor de packs |37/41/44; ampliar allowlist de cinco códigos, metadatos y aprobación por pack | Incorporación funcional cerrada; delta candidato B01; diez candidatos conservados; AC03/04 |
| D03 | Desarrollo/QA con preparación completa; publicación independiente |41/49, licencias por uso, authority classes y validation access actuales | Procedimiento sin barrera de publicación comercial para toda la biblioteca; restricciones concretas03/05; AC05/06 |
| D04 | Tres capas, profundidad y cuatro destinos tipados |30/33/44 y Knowledge físico; insuficiencia acreditada en evidence/BINDING_MODEL_INSPECTION.json | B02/B03 propuestos, sin DDL; contenido y relaciones versionados; AC07–11 |
| D05 | Cuatro ajustes y aprobación empresarial efectiva |29/22/42; Override/EC; catálogo 05:226–232 | B04/B05/B06 propuestos; ningún grant publicado; AC12–15 |
| D06 | Relaciones tipadas y aplicación contextual humana |44/23/24/36; crosswalk y RequirementApplicability | B07; seis cruces preservados, sin equivalencia fabricada; AC16–18 |
| D07 | Miniaturas y vista completa; preferencia Riesgos sin exigir su runtime |27/43; contratos visuales; lecturas autorizadas | B08/B09; sin cálculos ni presets persistidos improvisados; AC19–22 |
| D08 | Destino futuro declarado, sin sustituir activo ni conectar |46§4/7; ejecutivo17; Fase9 | B10: divergencia de identidad registrada para reconciliación futura; AC23/24 |
| D09 | Homologación conservadora, historia intacta |19/23/38/39; ejecutivo27; métodos publicados | B11; mejora no ejecutada, ninguna etiqueta convertida mecánicamente; AC25/26 |

Los IDs Bxx y ACxx son referencias internas de este expediente, no nuevas fases, gates rectores, permisos, entidades ni estados runtime. La formalización de las decisiones está completa como documentación; los deltas contractuales candidatos aún no son efectivos. La aprobación conceptual no se vuelve a solicitar.
