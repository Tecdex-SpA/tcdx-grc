# Incidencias, límites y rollback

- Primer build bloqueado por sandbox: Docker Buildx necesitaba escribir su actividad en ~/.docker. Se reejecutó el mismo build con escalamiento aprobado. Sin cambios de dependencias, configuración o umbrales. BUILD_SANDBOX_RETRY.json conserva el resultado.
- Durante lectura de módulos la UI volvió una vez al selector de autenticación. Se renovó normalmente por Zoho y continuó la inspección. No se modificaron sesiones, IAM ni backend. La causa no se atribuye sin evidencia: no se acredita regresión de autenticación por este único evento. Captura session-expired-during-read.txt. No había una operación enviada ni datos que persistir.
- Primeras capturas de destinos EvidenceLink incluyen estados de carga. Los seis archivos *-loaded.txt posteriores esperan el selector habilitado y documentan las respuestas de lookup reales. No usar las capturas de carga como prueba de un lookup completado.
- Las15 UI de formulario observadas no equivalen a15 comandos acreditados. Los42 comandos permanecen BLOCKED_HUMAN_ACTION; no hubo escrituras de negocio. La matriz individual y los registros terminales no autorizan regresar estados para habilitar acciones.
- Muestras/enteros seguros/períodos UTC: cobertura contractual y de componentes local preservada; sin ejecución real del editor porque la única prueba visible está aprobada. Retención, SoA y vínculos: UI/selección real observada, sin payload mutante o persistencia acreditada.
- Backend, PostgreSQL, IAM/RBAC, contratos y datos no se modificaron. No se hizo prueba transaccional de auditoría, SoD, idempotencia o aislamiento entre tenants. NOT_VERIFIED.
- No hubo fallo crítico de rollout ni regresión crítica demostrada en el alcance observado. No se disparó rollback ni se ensayó una interrupción adicional del servicio.

## Rollback disponible

Fuente operativa: scripts/phase6a3/qa-promote-evidence-control-selector-frontend.py y su precedente documentado EVIDENCE_CONTROL_SELECTOR_DEPLOY_20261019.md. La adaptación STEP6A4 sólo sustituye nombres de contenedores rollback/failed. El promotor verifica salud y preserva exactamente configuración de ejecución, red, puertos y usuario; ante su fallo revierte por stop/rename/start.

Host frontend QA:192.168.2.46. Contenedor activo:tcdx-grc-frontend. Conservado y detenido:tcdx-grc-frontend-rollback-step6a4-ux-business-forms-20261020. Imagen anterior sha256:b4fdbc1ce487269f5a531cafcebdbfc2dcae8f029780a689a65bf8c704bf9564.

Ante incidente crítico atribuible al nuevo frontend, detener validación. Verificar por inspect las identidades exactas contra promotion.json y frontend-before.json. Aplicar la misma reversión oficial: detener sólo frontend actual, renombrarlo a tcdx-grc-frontend-failed-step6a4-ux-business-forms-20261020 (el nombre debe estar libre), devolver al conservado el nombre tcdx-grc-frontend y arrancarlo. Verificar running/healthy, dominio público y bundle anterior; no tocar backend/DB/IAM. Conservar recibos y bloquear QA. No ejecutar si las identidades difieren o falta el contenedor conservado; no improvisar reconstrucción.

runtime-postdeploy.json confirma que el rollback conserva imagen y contenedor anteriores. El estado de health de un contenedor detenido no constituye una comprobación actual de servicio; la salud anterior está en frontend-before.json. No se declara ensayo de recuperación ejecutado.
