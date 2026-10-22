# B06 — Separación de comandos internos por decisión

Autoridad: respuesta PO explícita de esta conversación del 2026-10-20, AUTHORIZATION.json. Este amendment sucede únicamente los command_code de ocho bindings de cuatro operaciones de revisión/decisión del paquete NORMATIVE_LIBRARY_20261020. Se conservan trece bindings, operaciones API, cuerpos/decision, permisos, policies, SoD, auditoría/eventos, CAS e idempotencia. DELTA no cambia baseline ni esquema físico.

Hallazgo: UNIQUE(entity_type,from_state,command_code,version_number) y el resolver DISTINCT ON(entity_type,from_state,command_code) seleccionaban un solo destino para dos decisiones publicadas. DECISION_DISPATCH.json asigna un command_code interno exacto por decisión; no se adivina una versión runtime. El lookup de registry utiliza ese command_code. AuditEvent.command_code conserva la operación API canónica, y from/to registra la decisión real. Publicar/actualizar versiones reales del registry sigue requiriendo autorización operacional separada.

El recibo hash-bound es la autoridad de efectividad contractual local. Los artefactos originales permanecen inmutables. No se insertan aristas, activan permisos, ejecutan migraciones/importaciones, despliegan ni publican cambios Git.
