# I05 — Seguridad y hallazgos

Default DENY, grants efectivos y capabilities reales; roles no sustituyen permiso. Support no hereda Admin y sólo obtiene metadata global autorizada; roles tenant no obtienen autoridad Platform. SoD impide auto-revisión/decisión incluso con roles acumulados. Source derechos y validaciones superiores se exigen mediante puertos obligatorios, sin adaptador que conceda permisos por defecto ni inferencia desde license_classification.

H01 B06 — RESUELTO CONTRACTUALMENTE POR PO: ocho bindings de cuatro operaciones tenían dos destinos por misma clave efectiva. El PO aprobó comandos internos por decisión. Amendment NORMATIVE_LIBRARY_B06_REGISTRY_20261020 publica trece claves únicas, manteniendo API/body/permisos/SoD/audit. AuditEvent conserva operationId; registry usa clave interna. Sin versión runtime inferida ni activación.

H02 KnowledgeItem — RESUELTO CONTRACTUALMENTE POR PO: faltaba estado inicial server-owned obligatorio. PO aprobó active como raíz editorial. Amendment NORMATIVE_LIBRARY_ITEM_INITIAL_20261020; Version draft y revisión/publicación de versión permanecen. active no licencia ni homologa.

H03 pruebas históricas — RESUELTO EN CÓDIGO POR PO: seis aserciones esperaban174 operaciones/baselinev1.10 frente a175/v1.12. Se preservó el fallo inicial, su prueba de bytes preexistentes y los snapshots. El helper de test verifica recibo/hash de INITIAL_SOURCE y suma su operación publicada a contadores históricos; valida baseline contra ACTIVE_ACTIVATION. No se cambia contrato sellado para hacer pasar un test.

Pendiente de integración, sin bypass: ligar KnowledgeSourceRights/KnowledgeReadPolicy y ControlAdjustmentPolicy con datos/autoridades canónicos reales; completar composición de rutas y hooks B07 cuando el gate físico/IAM lo permita. No se atribuye validación semántica profunda o derechos reales a fixtures, schemas o etiquetas de metadatos.

H04 derechos por fuente/acto — PO confirmó que no existe registro y autorizó «no existe aún, propone y aprueba». Propuesta seleccionada en H04_SOURCE_RIGHTS_PROPOSAL.md; pendiente concretar amendment lógico/físico/ejecutable y adapter. No se acredita licencia ni aprobación física por esa instrucción. No queda una pregunta administrativa pendiente; sí trabajo contractual/técnico.
