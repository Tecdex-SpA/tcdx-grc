# Paquete operacional QA R3 — preparado, no ejecutado

Estado: PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED. R1/R2/R3 ya aprobados no autorizan QA, IAM real, grants ni DDL existente.

Fuente exacta y SHA-256: QA_OPERATIONAL_PLAN_R3.json / 3a1451f6b733fc7c2f45b46b9bf376364dcd24428affe1a2062256b640afc0e8. Incluye31/32 activos sólolocales,33/34 candidatos fuera de manifest, hashes contratos/builds, preflight sin exportación de filas, actor real existente, backup/restore y recuperación forward-only. Nunca se usará el ServicePrincipal de prueba como actor QA.

Antes de pedir ejecución deben resolverse CFG-D, C-04W, operación R3 ya aprobada localmente (requiere autorización QA específica), inventario histórico, contextoIANA y revisiónUIhumana. La aprobación posterior debe identificar acto/target/identidad/window/hashes; ningún comando de este lote se conecta a192.168.2.40/45/46 oIAMreal. Secuencia6A3→6A4→ZIPnormativo→6A5 permanece.
