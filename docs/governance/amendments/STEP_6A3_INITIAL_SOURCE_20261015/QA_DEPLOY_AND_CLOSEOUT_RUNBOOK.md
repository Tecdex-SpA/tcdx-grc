# Runbook de QA y cierre — preparado, no ejecutado

`NEW_BUILD=NOT_RUN_PENDING_EFFECTIVE_CONTRACTS`
`NEW_QA_DEPLOY=BLOCKED_DEPLOY_AUTHORITY; STEP_6A3=PARTIAL_BLOCKED; STEP_6A4=NOT_STARTED`

Único dominio público: https://grc.tecdex.net/. PostgreSQL16 QA192.168.2.40, backend192.168.2.45, frontend192.168.2.46. No producción, DNS, IAM/grants, commit/push/merge ni migración R1. R2 y34migraciones QA se preservan; no ejecutar DDL para esta propuesta por presunción.

## Gates antes de ejecutar

1. Registrar acto exacto sobre nuevos bytes con las funciones realmente ejercidas; activar candidata rectora conforme47 y publicar sucesoras ejecutables competentes, sin reaprobar las diez anteriores. Dictamen Data Model existente con identidad/rol/fecha; no basta que el código o esta revisión diga «sin migración».
2. Implementar exclusivamente el packet cerrado y terminar pruebas focalizadas. Si aparece necesidad física inesperada, detener; no cambiar R2. Registrar checks reales, hashes de fuentes y receipts. No fabricar aprobación Security/Release a partir del PO.
3. Generar fuente y build linux/amd64 inmutables sólo después de1–2. Registrar manifest por archivo, source SHA, archive SHA, imagen ID/digest y resultados verificables. Ninguna imagen nueva fue construida en esta ejecución; los hashes no se rellenan con imágenes anteriores.
4. QA/Release Owner autoriza **esas** imágenes y el release-gate SHA exacto, rollback, compatibilidad y alcanceQA. Si falta: BLOCKED_DEPLOY_AUTHORITY. No usar release_authorized=true sin su recibo real.

## Promoción reproducible tras gates y artefactos reales

Los parámetros TCDX6A3_* siguientes se obtienen del release manifest revisado y config protegida del host correspondiente; son entradas obligatorias del procedimiento, no defaults ni secretos a copiar en logs. Falta de cualquier input o gate impide ejecutar. Las rutas son del mecanismo privado existente; el packet de release debe reflejar las nuevas publicaciones exactas, sin alterar a ciegas manifests anteriores. Su compatibilidad y hash del promotor se revisan antes de uso; no se relaja el preflight para pasar.

En host backend grc-bk, y luego frontend grc-www:

```sh
python3 "$TCDX6A3_CONFIG_DIRECTORY/qa-promote-step6a3.py" backend "$TCDX6A3_BACKEND_IMAGE_ID" "$TCDX6A3_BACKEND_SOURCE_SHA256" "$TCDX6A3_CONFIG_DIRECTORY" "$TCDX6A3_RELEASE_GATE_SHA256" --preflight-only
python3 "$TCDX6A3_CONFIG_DIRECTORY/qa-promote-step6a3.py" frontend "$TCDX6A3_FRONTEND_IMAGE_ID" "$TCDX6A3_FRONTEND_SOURCE_SHA256" "$TCDX6A3_CONFIG_DIRECTORY" "$TCDX6A3_RELEASE_GATE_SHA256" --preflight-only
```

Ejecutar cada línea sólo en su host correspondiente. Si ambos preflights pasan y existe autoridad Release por los hashes reales, repetir la invocación de cada servicio sin `--preflight-only` mediante el operador autorizado; conservar activation receipts, previous image y contenedor rollback. El command público no transporta secretos ni hace migraciones. No ejecutar estos comandos ahora: los inputs y aprobaciones del nuevo build no existen.

Después: comprobar imagen real, source label/digest, health, reinicios y logs sanitizados; GET público200 y auth401; login Zoho legítimo; readiness backend/DB/storage. No reemplazar un actor humano por token M2M, token firmado localmente o SQL de sesión. Conservación QA de casos y fingerprints antes/después; auth normal puede producir su audit/log legítimo. No repetir publicaciónM2M5 ni migraciones34.

## H01–H10 — acciones humanas precisas

| H / actor | Pantalla / acción | Prerrequisito / recibo |
|---|---|---|
| H01 · Privacy/Legal tenant | Entregar por canal autorizado documento real, procedencia, cláusula, clasificación, contexto/Subject/actividad y vigencia | Hash del archivo y constancia auténtica.12meses comerciales no sustituyen contrato firmado ni obligación legal. Puede prepararse mientras se revisan sucesoras. |
| H02 · Tenant Admin custodio | https://grc.tecdex.net/configuraciones/empresas; crear nuevo draft legítimo bajo policy ordinaria publicada/vigente y contexto exacto | Ruta nueva sólo después de publicación/implementación/deploy. No editar los dos under_review ni usar scope ficticio para saltar UNIQUE. |
| H03 · Evidence Owner autor documental autorizado | `/evidencias`; seleccionar exclusivamente custodia pendiente admisible, cargar y materializar Evidence con procedencia/intervalo reales | Intent/file/EvidenceVersion y SHA/scan-PASS/FK/policy/contexto; identidad real autora conservada. |
| H04 · Revisor Evidence distinto del autor | Evidencias; iniciar/revisar/aprobar versión | Permiso evidence.approve efectivo y actor independiente; EvidenceReview/AuditEvent reales. El Tenant Admin existente puede revisar sólo si es distinto del autor documental y conserva permisos. |
| H05 · Tenant Admin custodio | Draft aplicabilidad → Vincular fuente inicial → Enviar a revisión | Source aprobada/vigente/scan-PASS y de esa cadena, cláusula/intervalo real; bind200 y audit único/CAS, sin publicación automática. |
| H06 · Legal Reviewer distinto del autor del draft; luego publicador autorizado | Aplicabilidad → Aprobar → Publicar | SoD, fuente/contexto/vigencia revalidados, AuditEvents. Un Legal Reviewer que escribió Evidence ajena a la autoría del draft no puede autoaprobar esa Evidence; sí puede revisar aplicabilidad ajena si su permiso/policy lo permiten. |
| H07 · QA humano/autor | Controles y Requisitos; negativos de valid forzado en casos diagnósticos autorizados y guard de aprobación | Submit insuficiente no crea valid oficial; approve insuficiente422; históricos intactos. No reenviar completed sólo para obtener409 ni confundir401 con guard CFG-D. |
| H08 · QA/UI humano | Empresa/Evidencias/Controles, desktop y estrecho; español, foco/teclado, estados, recarga y tenant selector | Capturas reales/hashes y aceptación o rechazo explícito por la **nueva imagen desplegada**. Captura local simulada no sustituye aceptación. |
| H09 · QA con sesiones/contextos existentes aptos | Cross-tenant,401/403/404, permisos/entitlement y autoaprobación de objetos de su propia autoría | Guardar method/path/status/correlation/bodyhash sin tokens/cookies. Si falta identidad/contexto, NOT_RUN; no cambiar IAM para pasar. Fuente/hold dependientes sólo después deH01–H06 y autorización real; no liberar hold ficticio. |
| H10 · QA/Release y autoridades competentes | Acta de cierre real, versiones/manifest/recibos de todos los gates | No completar firma ni PASS anticipados. Registrar pendientes concretos; cerrar sólo con evidencias completas. |

Actores previos por inventario READ_ONLY: custodio/posible revisor Evidence `01a0cfae-d860-730d-88b8-d8b1b3f5d7dc`; Evidence Owner/Legal Reviewer `01a0e832-ccb7-7574-8316-0781503d47de`. Son referencias de QA, no allowlist del producto ni consentimiento. Revalidar permisos/scope/tenant y usar sesiones personales reales en cada acto. La segunda identidad no posee evidence.approve; proponer que sea autora documental permite a la primera revisar Evidence ajena y a la segunda aprobar aplicabilidad ajena, sujeto a los contratos aprobados y permisos por operación. No se ejecutó ese flujo ni se otorgaron derechos.

## Entrada6A4

Sólo tras actaH10, cierre de todas las obligaciones6A3 y procedimiento rector: registrar el gate de entrada que exija43 con la autorización real de inicio. No escribir READY_TO_START como sustituto de cierre ni inferirlo de la intención PO. Si falta un gate,6A3 sigue PARTIAL_BLOCKED y6A4 NOT_STARTED. El ZIP normativo y accesos de validación a marcos pertenecen a la fase intermedia antes de6A5 y no se ejecutan aquí.
