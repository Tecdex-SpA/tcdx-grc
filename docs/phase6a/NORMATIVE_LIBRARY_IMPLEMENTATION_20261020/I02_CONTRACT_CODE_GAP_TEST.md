# I02 — Matriz incremental

CONTRACT_CODE_TEST.csv enlaza bindings y operaciones con los archivos fuente, verificaciones y dependencias. El código previo ya disponía de resolver de capas, autoridades tenant/Platform, persistencia AuditEvent/Outbox/Idempotency, lectores de recursos y acceso de packs. Faltaban servicios Knowledge, targets/shape validators, destino ControlVersion, contexto audit y matrices.

Cambio mínimo: paquete contractual derivado por subpath @tcdx-grc/contracts/normative-library, sin cargar nuevos validadores en el entrypoint usado por el shell actual; módulos de dominio/repositorio/servicios preparados y componentes UI separados. No se registra ninguna ruta nueva en server/core-grc ni se incorpora navegación o flags de activación. El resolver existente continúa único.

La ausencia de mecanismo contractual de habilitación seguro antes de DDL/IAM implica NO HABILITAR la capacidad. No se usa detección de columna fallida, fallback SQL, feature flag hardcodeado o respuesta simulada. Los servicios son código preparado; su composición de policies/rutas y validación física permanecen pendientes según I07.
