# I09 — Inventario y preservación

CHANGES.json enumera nuevos/modificados de esta ejecución y SHA256 de bytes finales. SHA256SUMS.txt y FINAL_INTEGRITY.json permiten transferencia y verificación. ENTRY.json conserva referencia anterior. Los ocho archivos preexistentes modificados se limitan a model/validator regulatorio, package.json de contratos y cinco pruebas históricas autorizadas; entrypoint de contratos, main/server/core-grc existentes y lockfile quedan iguales a la entrada. Todos los demás cambios productivos son archivos nuevos del slice.

Los cuatro directorios contractuales previos conservan sus bytes, incluso logs/receipts y snapshots de pausa. Los dos amendments sucesores nuevos son aditivos y constan en el inventario. No se altera baseline, expected-schema, migrations manifest, QA/PROD, infraestructura, secretos, DNS, marca de referencia ni contratos de despliegue.

Builds escriben sólo salidas locales derivadas ignoradas por Git. Los generadores temporales bajo /private/tmp no son continuidad ni fuente de autoridad. Rama/HEAD/índice se preservan; no stage/commit/push/merge/checkout/reset/clean/stash/rebase.
