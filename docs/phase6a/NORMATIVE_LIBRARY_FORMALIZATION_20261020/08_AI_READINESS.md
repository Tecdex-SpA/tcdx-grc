# 08 — Preparación IA y dependencia futura de infraestructura

`AI_PREPARATION=APPROVED`; `AI_RUNTIME=OUT_OF_SCOPE`; `IMPLEMENTATION_AUTHORIZATION=NOT_GRANTED`.

| Autoridad | Identidad y estado |
| --- | --- |
| Rector 46 §§4/7 y contrato ejecutable 17 | Backend GRC → ia2.tcdx.int; sin acceso directo de IA a PostgreSQL |
| Destino futuro declarado por el PO en D08 | HOST=ia-engine; IP=192.168.2.44 |
| Equivalencia de identidades | **NO VERIFICADA; NO INFERIDA** |
| Actividad actual | Documentación; sin resolución DNS, conexión, ping, SSH, consulta a VM o modificación |

D08 no sustituye el proveedor ni model_provider_ref activos. El uso en otros proyectos es una declaración recibida del PO, no evidencia inspeccionada de este repositorio. Antes de integrar runtime, verificar identidad de host/servicio, API, propósito, tenant, autenticación, TLS y despliegue previsto; documentar diferencias y tramitar ADR/delta conforme al rector 46. No inventar alias, fallback, redirección o equivalencia. Esta dependencia corresponde a la integración IA futura y no bloquea la preparación editorial actual.

## Preparación estructural

Cada artefacto potencialmente recuperable conserva identidad KnowledgeVersion/target, FrameworkVersion/edición/locator, fuente/hash/cita/página, idioma, distinción entre original y traducción/editorial, clasificación, derechos por uso, autor/revisor/fecha, versión/vigencia, tenant/Subject/contexto, restricciones e historial de correcciones. Los candidatos mantienen IDs de fuente, sin UUIDs ficticios.

Las citas no recrean un texto ISO ausente. Una restricción de procesamiento externo afecta al acto de envío correspondiente; no bloquea metadatos, referencias o guía autorizados. Un motor propio tampoco elimina derechos de terceros.

## Modelo y decisión humana

Reutilizar AIJob para ejecuciones reales futuras, AIRecommendation para propuestas revisables y AIProvenanceLink para sus ocho targets actuales. A2 es el techo por defecto. No crear filas IA para unir guías. AIProvenanceLink contempla KnowledgeVersion/Requirement/Control, no NormativeUnit directo; B02 permite conservar la cita de unidad mediante Knowledge sin falsificar un target.

Preparar registro documental de extracción, jerarquización, identificación/atomización, separación obligación/recomendación, correspondencias, evidencias, procedencia, confianza y corrección humana. No son enums runtime nuevos ni validaciones ya ejecutadas. La aceptación de una recomendación exige su permiso; el comando de dominio tiene autorización y transacción independientes. La IA no crea automáticamente obligaciones jurídicas, scores, approvals, grants o decisiones de aplicabilidad.

## Gates futuros

Antes del runtime: identidad reconciliada, contrato/purpose allowlist, proveedor identificado, DPA/residencia/retención/logging, autenticación, red, minimización, licencia, aislamiento de recuperación tenant, errores/timeouts/reintentos y revisión humana. Aplican INTELLIGENCE_RUNTIME y TC-AI-001 según sus contratos. Quedan fuera inferencia, RAG, embeddings, agentes, motor de recomendaciones, proveedores nuevos, conexiones a la VM y cambios de infraestructura. **No se ejecutó validación semántica asistida por IA.**
