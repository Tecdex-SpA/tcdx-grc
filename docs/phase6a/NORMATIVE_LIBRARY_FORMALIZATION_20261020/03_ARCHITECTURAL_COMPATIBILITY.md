# 03 — Compatibilidad arquitectónica y contratos

Baseline activa v1.12 acreditada por ACTIVE_ACTIVATION, BASELINE_ID/BASELINE_STATUS y rector checks. La jerarquía es baseline→modelo lógico/físico→contratos ejecutables→implementación→evidencia. El presente expediente es una propuesta de formalización subordinada, no cambia autoridad activa. Sus nombres Bxx/ACxx son etiquetas locales de trazabilidad.

## Reutilización obligatoria

| Capacidad | Modelo/relaciones actuales | Implementación real identificada / límite |
| --- | --- | --- |
| Fuente/pack/edición | RegulatorySource/ImportManifest/CoverageManifest; PackVersion N:M FrameworkVersion; Framework 1:N versiones | regulatory/pipeline.ts, validator/postgres-repository, catálogo v1.1; allowlist cinco códigos, sin adaptador ZIP nuevo |
| Estructura | NormativeUnit, parent de misma FrameworkVersion, locator/order/hash/idioma | validator impide ciclos; tenant-read filtra parent y versión; UI Normas lista paginada, sin biblioteca profunda |
| Obligación | Requirement atómico, una unidad primaria; editorial_summary separado del contenido licenciado | Enmienda 20260928000400; read API; ningún heading se convierte automáticamente en Requirement |
| Control | Global regulatory_reference/TCDX versus tenant; ControlVersion y based_on | controlInstantiate existente, detalle con mappings; source/base no implica implementación tenant |
| Mappings | RequirementControlMapping contribución; NormativeUnitControlMapping ubicación; crosswalks tipados | Persistencia/catálogo; no equivalencia ni cumplimiento automático por link |
| Tenant | RequirementApplicability/Assessment, SoA/items, Subject | Comandos y lectores Core existentes; SoA decide la referencia ControlVersion, no reemplaza applicability de Requirement |
| Evidencia/remediación | EvidenceVersion/Link/Review; ControlAssessment/AssuranceTest; IssueOrigin→Issue→Action/Verification | Targets cerrados; no EvidenceLink o assessment de NormativeUnit; 41 operaciones runtime no acreditadas |
| Knowledge | Source→Item→Version, ownership/global/tenant, content_ref/hash/version/intervalo/publicado | Modelo físico presente; sin FKs a los cuatro targets; API/permissions de la biblioteca profunda no publicados |
| Configuración | Definition/Override/EC/EC layers; scopes tipados y valores | Resolver/effective-read presentes; sin destino ControlVersion ni flujo de aprobación operativo completo; grant approve NONE |
| IA | AIJob/Recommendation/ProvenanceLink, contrato 17, A2 | Esquema/procedencia existente no prueba motor; destino PO ia-engine difiere de contrato ia2 y no se conecta |

## Deltas mínimos propuestos, sin aplicación

04 contiene evidencia de alternativas descartadas y diccionario candidato. Se justifican exclusivamente por D02/D04/D05/D06:

1. Sexto código regulatorio y sus manifests/datos canónicos; sin tabla por ley.
2. Una relación soporte KnowledgeVersion→target tipado para integridad, ownership y lineage; no una tabla para navegar ni para duplicar fuente normativa.
3. Scope ControlVersion en Override/EC para ajustes por control; evita definir un parámetro por UUID o aplicar cambios a todo un Subject.
4. FK de contexto KnowledgeVersion en RequirementApplicability para reproducir el contexto usado al decidir, nullable para historia no documentada; no otra entidad de applicability.
5. Wire/registry/audit/policy y grant propuestos para configuración; permisos Knowledge y proyecciones mínimas que hoy faltan. Ningún grant se implementa.

Las ampliaciones tienen impacto físico, lógico, API y seguridad real: no se disimulan como cero cambios arquitectónicos futuros. La preparación actual no cambia ninguna capa. Antes de implementar, esas propuestas deben llegar a publicación formal y superar gates físico/ejecutable según 46/47; la aprobación funcional no firma bytes futuros ni elimina la congelación del modelo.

## Autoridad de contenido y acceso

- Global: estructura y fuente protegida sólo por derecho/licencia y pack/access mode correspondiente; tenant no modifica esa autoridad.
- Editorial Tecdex: KnowledgeVersion con propietario/cita/licencia/estado de revisión propios; publicar guía no publica pack.
- Tenant: contexto, override y decisión propios; no elevan a oficial una fuente preliminar ni una recomendación a obligación.
- Roles globales de edición/publicación no se derivan de una Membership tenant. La matriz activa de permisos globales/Knowledge no está completada por tener un rol llamado Steward o GRC Manager. 04/B02 documenta el impedimento y la propuesta sin crear roles.
- Cada respuesta protege nodos, conteos, texto y archivos. La UI consume proyecciones autorizadas; no descarga todo para ocultarlo después.

## Matriz de contratos afectados para la publicación futura

| Fuente activa | Impacto candidato concreto | Tratamiento actual |
| --- | --- | --- |
| rector37/41/43/44 | Sexto ámbito, fuentes/gates, alcance biblioteca sin nueva fase | Delta requerido descrito, fuentes inmutables intactas |
| rector30/33/29/23 | Relación soporte Knowledge, scope de configuración por control y contexto de applicability, inmutabilidad/temporalidad | Revisión lógica/física pendiente, no tablas aplicadas |
| rector09/22/42/49 | Permisos/grants/scopes/policies Knowledge/config; función empresarial de GRC Manager y SoD | Candidatos, no publicación IAM ni doble aprobación conceptual |
| OpenAPI02; matrices03/05; eventos04/08; test10; transacción12 | Schemas cerrados, operaciones faltantes, revisiones, hashes/ETags y eventos | Especificación 09/04; no contratos activos editados |
| rector19/38/39; executable27 | Métodos/suficiencia/historia | Sin cambio: homologación conservadora; cambio real sólo si análisis separado lo demuestra |
| rector27; docs/ui contratos activos | Miniaturas/vista de matrices/árbol/tres capas accesibles | Requisitos de presentación, sin frontend ni baseline visual cambiados |
| rector46§4/7; ejecutable 17 | Reconciliación futura de identidad proveedor/servicio IA | No sustituido; impedimento aislado a fase de integración |

## Verificación y límites

evidence/BINDING_MODEL_INSPECTION.json demuestra los gaps físicos en artefactos actuales; SOURCES_SHA256 registra los bytes consultados. No se inspeccionó BD viva ni IAM efectivo de personas. Los grants citados son catálogo/seed/contracts, no prueba de acceso QA. El estado rector PASS del expediente sólo acredita la preparación documental autorizada. El estado de implementación/publicación de cada delta permanece separado.
