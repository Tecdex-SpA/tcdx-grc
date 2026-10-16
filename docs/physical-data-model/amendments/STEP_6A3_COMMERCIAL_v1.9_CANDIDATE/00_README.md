# Reconciliación física comercial — candidato sin ejecutar

Los cinco archivos copiados desde `docs/phase6a/STEP_6A3/FINAL_CONTRACT_RECONCILIATION_20261013/` preservan sus bytes aprobados por `GP-STEP6A3-COMMERCIAL-20261013-02`. Este directorio los ubica para revisión física, sin modificar `docs/physical-data-model/` activo ni `database/migrations/`.

El modelo físico y SQL son candidatos exactos. El manifest de migración es candidato, conserva los 32 registros de origen y agrega `20261013000100`; no cambia el runner/ledger. `05_HISTORICAL_READONLY_INVENTORY.sql` no se ejecutó. El SQL no se compiló ni probó en PostgreSQL en esta publicación preparatoria. `PHYSICAL_DATA_MODEL_REVIEW` y una prueba autorizada aislada deben preceder cualquier materialización; QA compartido exige mandato operacional propio.

`database/expected-schema.json` permanece activo e intacto. Su sucesor requiere materialización/inspección PostgreSQL autorizada de la migración exacta, reconciliación con el diccionario y aprobación por hash; un diff lexical no se declara expected-schema probado. La ausencia de ese byte nuevo impide activar migración/implementación, pero no la preparación de los demás contratos.
