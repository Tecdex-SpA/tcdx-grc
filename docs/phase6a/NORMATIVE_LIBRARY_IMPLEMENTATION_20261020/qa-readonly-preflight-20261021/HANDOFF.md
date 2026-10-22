# Handoff — preflight QA sólo lectura

Leer REPORT.md, SCHEMA_DIFF.json, EVIDENCE.json, RISK_AND_ADOPTION_PLAN.md, RESULT.json y los sellos de este expediente. Comando seguro, local y sin DB/red:

```sh
python3 docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa-readonly-preflight-20261021/verify.py
```

QA_READONLY_PREFLIGHT=PASS de inspección; QA_SCHEMA_COMPATIBILITY=DELTAS_FOUND; QA_DATA_COMPATIBILITY=PASS únicamente en agregados inspeccionados. Nunca interpretar como autorización de adoptar o habilitar. QA observada192.168.2.40:5432/tcdx-grc, PG16.15,34 migraciones,242 tablas de dominio más ledger. La identidad y READ ONLY se verifican por bloque, con timeout5s/lock1s y sin locks explícitos.

PO respondió «utiliza postgres por ahora, es solo lectura» después del bloqueo inicial por falta de cuenta de lectura. postgres es superusuario real, pero todas las sesiones se forzaron READ ONLY. No repetir la pregunta de cuenta ni afirmar que sus privilegios son sólo lectura. Una cuenta de lectura futura sigue siendo una mejora de acceso que no se creó aquí. No se usaron secretos en logs.

Faltan dos tablas, cuatro columnas sobre existentes, ocho funciones/12 triggers y sus constraints/índices. PV-H04-01 está publicado contractualmente pero su función está ABSENT en QA, no es variante vieja/corregida instalada. La única diferencia CONFLICT está prevista: UQ global de KnowledgeVersion será sustituido por UQ Item+version. No hay conflictos inesperados del slice. Trece claves destino de FKs existen. Cero duplicados/huérfanos/cruces tenant en checks acotados; Knowledge está vacío, no probar contenido futuro por vacuidad.0/8 permisos nuevos,0/4 Definitions,0 bindings B06 coincidentes: no activarlos por este preflight.

Se preservan5.225 archivos recibidos, incluidos4.359+850+16. Ningún archivo previo editado, contratos/recibos/SQL anteriores intactos. Se agrega sólo este expediente y no se stagea. Un error inicial de red sandbox y siete skips por estimados se conservan como historia; ambos se resolvieron por permiso de red y cardinalidades acotadas, sin repetir pruebas físicas. Verificadores antiguos tienen inventarios cerrados: usar el sucesor arriba, no re-sellar historia.

No ejecutar inspect_qa.py ni archivos .sql por rutina: ya contienen las lecturas realizadas. Una repetición debe tener necesidad concreta y evidencia sucesora sin sobreescribir salidas. compare_contract.py es offline y produce un derivado ya sellado: no regenerarlo para alterar historia. Las149 comprobaciones físicas se reutilizaron y NO se reejecutaron.

Siguiente decisión PO específica: ordenar o diferir la adopción física QA de la secuencia B01–B09/H04/PV-H04-01, dos tablas/cuatro columnas y constraints/índices/funciones/triggers, con ventana de bloqueo, preflight final y reversión transaccional. Leer el plan antes; no solicitar permiso general de migrar/desplegar. IAM/registry/Definitions, importación/derechos, wiring/deploy y QA/E2E humano quedan separados. No DDL/DML/migración/import/deploy/IAM/infra/Git mutante en esta tarea. B01–B09 sigue sin habilitación operacional. STEP6A5/STEP6A6 NOT_STARTED.
