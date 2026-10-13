# Paquete operacional QA R2 — preparado, no ejecutado

Estado: PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED. R1/R2 ya aprobados no autorizan QA, IAM real, grants ni DDL existente.

Fuente exacta y SHA-256: QA_OPERATIONAL_PLAN_R2.json / 7a976d34f24fe908856c98cee0ed409702146500d172d3ff58b5b62e8af168a4. Incluye31/32 activos sólolocales,33 candidato fuera de manifest, hashes contratos/builds, preflight sin exportación de filas, actor real existente, backup/restore y recuperación forward-only. Nunca se usará el ServicePrincipal de prueba como actor QA.

Antes de pedir ejecución deben resolverse CFG-D, C-04W, D01/D02, inventario histórico, contextoIANA y revisiónUIhumana. La aprobación posterior debe identificar acto/target/identidad/window/hashes; ningún comando de este lote se conecta a192.168.2.40/45/46 oIAMreal. Secuencia6A3→6A4→ZIPnormativo→6A5 permanece.
