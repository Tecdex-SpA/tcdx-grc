# Evidencia de continuidad — 2026-10-15

Lecturas QA realizadas en el mismo worktree. Los JSON `live-*` y `*-runtime` contienen procedencia, hora de adquisición y datos observados. Los archivos `recovered-*` son copias de archivos temporales existentes, sin firma ni atribución a una nueva ejecución. `recovery-index.json` conserva rutas, hashes y mtime originales; mtime no es la fecha del acto humano. `partial-session-excerpts.json` cita únicamente extractos del log parcial, cuya integridad se fija por SHA; no es acta final.

`source-parity.json` y `completion-checks.json` cotejan todos los inputs finales, los archivos tar de origen, los labels de las imágenes activas y los hashes de gates de las promociones. `authority-integrity.json` coteja contratos/actos y sello27. Los recibos remotos de activación y publicación se preservan con su hash de bytes original dentro de `backend-runtime.json` / `frontend-runtime.json`.

`verification-result.json` conserva checks técnicos y la ejecución visual inicial (4 PASS, 2 FAIL por permiso ausente en fixture). `verification-retry-result.json` conserva exclusivamente los dos casos corregidos (2 PASS) y comparación íntegra de las cinco aristas. Ningún fallo se borró. `mock-ui-*` son screenshots locales con API simulada; `playwright-output/` conserva los fallos iniciales. No hay captura QA autenticada recuperada ni aprobación humana.

`qa-http-log-corroboration.json` tiene cero respuestas recuperadas; no acredita DENY específico. `public-http-now.json` acredita sólo acceso público/401 sin autenticación. Persistencia/auditoría de las operaciones exitosas se encuentra en `live-c04w.json` y `live-cfgd.json`. El test PostgreSQL aislado recuperado usa adaptadores de identidad/storage; no equivale a Zoho real ni documento jurídico.

La primera colección por Python encontró restricción de transporte del sandbox; se reanudó con autorización del ejecutor, preservando lo ya escrito. No hubo mutación remota, reinicio ni publicación en esta continuación. Los scripts de este directorio son herramientas de evidencia para este checkpoint; no ejecutar como promotor, bootstrap ni test con datos QA sintéticos.

Consultar `../../C04W_CFGD_CONTINUITY_REPORT_20261015.md` y `../../C04W_CFGD_HUMAN_CLOSEOUT_CHECKLIST_20261015.md`. El SHA256SUMS de este directorio sella esta evidencia nueva; no reemplaza manifests históricos o aprobaciones. Su validación es `shasum -a 256 -c SHA256SUMS.txt` desde este directorio.
