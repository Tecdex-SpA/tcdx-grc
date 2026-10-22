# H04 — Binding propuesto de derechos por fuente y acto

## Decisión y alcance

El PO confirmó que el registro no existe y respondió: «no existe aún, propone y aprueba». Esta instrucción autoriza preparar la solución y efectuar su revisión técnica interna conforme a DR003. No constituye evidencia de una licencia, firma sobre bytes futuros, aprobación humana de un gate físico ni autorización de DDL/importación/activación. No se solicita una segunda ratificación administrativa de la misma decisión.

## Hallazgo verificable

KNOWLEDGE_AND_CUSTODY.md exige comprobar derechos reales en cada lectura/búsqueda y acto; license_classification no basta. El modelo físico publicado describe KnowledgeSource con código, nombre, clase, URI y clasificación, pero no identifica una autorización por acto ni su evidencia. Los ports KnowledgeSourceRights y KnowledgeReadPolicy son obligatorios y aún no tienen un adapter de autoridad canónica. Vincularlos a una función ALLOW, a la etiqueta de licencia o a una lista de UUID sería una divergencia.

## Propuesta técnica seleccionada

Preparar un amendment sucesor de dominio/lógico, físico y ejecutable para una relación soporte de KnowledgeSource, sin crear otro motor de permisos ni otro sistema de auditoría. El nombre físico definitivo debe resolverse con las convenciones del modelo antes de publicarlo. El registro debe enlazar mediante FK la fuente exacta y la autoridad/tenant aplicables; conservar edición/procedencia exactas, acto autorizado, alcance del contenido, vigencia, evidencia inmutable con hash y referencia de custodia, autoridad real que acredita el derecho y auditoría canónica. Las relaciones críticas no se guardan como UUID dentro de JSON. La evidencia global no se convierte en un Document/FileObject tenant ficticio.

El vocabulario cerrado de actos, la representación física de la evidencia y la revocación deben publicarse juntos tras revisar los contratos superiores de fuentes y almacenamiento. No se anticipan enums, tablas o permisos efectivos mediante esta propuesta. Si una autorización remite a un artefacto exacto, debe limitarse por su hash/edición; no extenderse implícitamente a nuevas versiones. Una restricción o revocación afecta accesos futuros, conserva hechos históricos y no reescribe licencias previas.

Evaluación conjunta obligatoria: permiso efectivo + ObjectPolicy + tenant/ownership + visibilidad del target y pack + evidencia del acto y contenido + vigencia/restricciones actuales. El resultado sólo restringe acceso: no concede IAM, entitlement comercial, publicación oficial, autenticidad ni homologación. Support sigue limitado a metadatos autorizados. Un registro ausente, ambiguo, vencido, revocado o cuya evidencia no verifica produce DENY para el acto dependiente; metadatos se tratan con su policy propia y ocultación de objetos ajenos.

La escritura de autorizaciones será una operación futura gobernada con actor real, idempotencia, concurrencia y AuditEvent/outbox canónicos. No se inventa un endpoint, grant o importador en este checkpoint. Datos de licencia deberán proceder del titular o autoridad competente, nunca de fixtures o del agente.

## Estado y siguiente paso

TECHNICAL_PROPOSAL_ACCEPTED_UNDER_PO_AUTHORIZATION. Se acepta técnicamente la propuesta de relación soporte por fuente y acto bajo la instrucción del PO; esta aceptación de diseño no sustituye los gates de un amendment exacto. La selección técnica queda registrada; la revisión de consistencia lógica/física/ejecutable y el amendment exacto permanecen pendientes. Este documento no es un recibo de publicación contractual ni una migración aprobada. El control de derechos continúa sin adapter ni rutas habilitadas. Próximo trabajo seguro: concretar y revisar ese amendment en expediente sucesor, preservando todos los recibos anteriores; después implementar y probar el adapter. No hace falta autorización operacional para preparar esos artefactos. Las operaciones de migración/materialización/activación siguen reservadas al PO.

Pregunta H04: respondida. No hay una pregunta administrativa pendiente; falta trabajo contractual y técnico explícito.
