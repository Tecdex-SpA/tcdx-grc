# Handoff sucesor — validación física aislada

Leer FINAL_RESULT.json, REPORT.md, FINDINGS.json y FINAL_INTEGRITY.json de este directorio; no modificar los expedientes/recibos previos. Comando siguiente seguro, sin Docker/SQL/red/escritura:

```sh
python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/physical-validation-20261021/verify.py
```

Estado:149/149 PASS en PostgreSQL16.15 temporal **con corrector H04 candidato no publicado**. Efectivo original: dos fallos42703 al usar regulatory_pack_version_id. `regulatory_pack_versions` es global y carece de tenant_id. La corrección de una función PERFORM ID FOR SHARE conserva el FK, ownership Source, auditoría, inmutabilidad y todos los demás términos. Ruta: docs/executable-contracts/amendments/NORMATIVE_LIBRARY_H04_PHYSICAL_VALIDATION_20261021/. Leer DELTA/REVIEW y PUBLICATION_MANIFEST_CANDIDATE. No existe recibo nuevo; no declarar esa corrección efectiva. No editar SQL sellado ni reutilizar su recibo como si cubriera el candidato.

Los tres contenedores ya se destruyeron. CLEANUP e ISOLATION por intento son evidencia. No existe entorno que retener ni limpiar. No contactar QA/producción. Todos los4.359 archivos recibidos conservan sus hashes; rama/HEAD/índice vacíos preservados. Cambios exclusivamente archivos nuevos de este expediente y del corrector. INVENTORY enumera los propios. No hay código de producto modificado.

attempt-01 conserva el defecto de parser de errores y el fixture EC inválido; attempt-02 reproduce dos fallos H04; attempt-03 es la batería final estabilizada. No repetirla sin cambios o causa. Test SQLSTATE usa token exacto y constraint/mensaje; EC requiere hash que incluya el ControlVersion conforme al contrato. No ampliar unicidad para admitir inputs inválidos. REVIEW enlaza fallos y resultado final.

Si se necesita reproducir la prueba física ya autorizada: `/usr/bin/python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/physical-validation-20261021/validate.py --with-corrector`. Requiere Docker local y pglast6.17 ya existente en /private/tmp/grc-normative-contract-parser-pg16-py39 (PG16.1). El script usa imagen local, red none, PGDATA tmpfs, sin ports/mounts/creds ajenas; crea otro attempt y destruye en finally. Esto modifica el inventario cerrado de este expediente: registrar cualquier nueva ejecución en un sucesor; no actualizar los sellos actuales para ocultar historia. Sin `--with-corrector` reproduce el fallo efectivo en lugar de aplicar la propuesta. No usa runner/seeds/ledger ni configura bootstrap.

Próxima decisión concreta PO: publicación contractual del corrector por el procedimiento vigente usando los bytes exactos del candidato. La preparación y prueba no representan publicación. A continuación, cualquier adopción física real, derechos, importación, activación Definition/rules/IAM/registry, wiring operativo o deploy exige su alcance PO correspondiente. Esta ejecución no inicia ninguna de ellas. No es cierre funcional ni prueba de roles/RLS/lecturas QA/E2E. B01–B09 sigue WIRED_CODE_ONLY_RUNTIME_BLOCKED_DEPENDENCY; derechos reales no acreditados. STEP6A5/6A6 NOT_STARTED.
