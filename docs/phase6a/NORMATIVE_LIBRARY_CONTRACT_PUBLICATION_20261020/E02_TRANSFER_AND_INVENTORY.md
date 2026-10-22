# E02 — Transferencia e inventario

RESUME_TRANSFER.json acredita cuatro directorios, 35 entradas SHA256 coincidentes más el inventario mismo: 36 archivos transferidos. PAUSE_STATE.json está en evidence/, ruta inventariada válida; el path a nivel raíz citado en la orden no existe. No hubo archivo perdido o sobrescrito. ENTRY.json permitió comparar 4159 archivos preexistentes: cero diferencias al reanudar.

El inventario final exacto y hashes están en PUBLICATION_MANIFEST.json, excluyendo sólo los documentos de sellado declarados allí para evitar autorreferencia. RESUME_FILE_DELTAS.json distingue archivos transferidos modificados, reutilizados y nuevos de esta cuenta; PRESERVATION_FINAL.json contrasta otra vez preexistentes, rama/HEAD/índice. PAUSE_FILES_SHA256.json permanece como checkpoint histórico, no se actualiza para aparentar igualdad de los candidatos corregidos.
