# STEP6A3 — preparación de escenario PASO 9.2B — 2026-10-20

`MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`; dominio https://grc.tecdex.net/. `RECTOR_GATE=PASS` para revisión/lecturas/propuesta; `SCENARIO_READY=BLOCKED_MISSING_CREATE_PERMISSION`; `STEP6A3=PARTIAL_BLOCKED`; `STEP6A4=NOT_STARTED`. No se declara escenario materializado ni aceptación funcional.

## PDF identificado por contenido

Descarga autenticada oficial GET /api/v1/file-objects/01a1551c-fdf8-72e0-aa91-85a45bd805c9/content, con contexto TECDEX y sesión humana indicada como user1, HTTP200. FileObject conocido: GRC_Tecdex_Evidencia_QA_STEP6A3.pdf, 71932bytes. Copia exacta, SHA256 y extracción con ToUnicode de las fuentes embebidas constan en evidence/functional-scenario-20261020. No se cargó otra vez ni se alteró el PDF.

Es un «Registro documental de prueba QA», uso exclusivo QA/documento simulado. Su objeto es comprobar carga, finalización, creación/persistencia de evidencia, aislamiento por tenant y trazabilidad. Declara expresamente que no es procedimiento aprobado, auditoría ejecutada, prueba de eficacia, evaluación de conformidad ni obligación jurídica auténtica. El target GRC y los resultados de ejecución están pendientes en el documento. Sugiere QA_EVID_RET_001 y procedencia «Documento sintético GRC Tecdex para validación funcional STEP6A3, emitido el 19/10/2026».

No corresponde al anexo simulado de retención ACME de intentos anteriores. No se lo vincula a requisitos de clientes ni se lo presenta como prueba de cumplimiento real.

## Objeto coherente propuesto, todavía NO creado

La relación documental genuina posible es un Control propio de TECDEX específicamente dedicado a esta prueba de trazabilidad, donde el PDF constituye **fixture y plan de prueba**, no ejecución acreditada ni resultado PASS. EvidenceLink.claim debe conservar esa limitación.

| Dato | Propuesta |
| --- | --- |
| Tipo | Control TENANT_OWNED, tenant_instantiated |
| Identificador | NO ASIGNADO: operación no ejecutada |
| Código | QA_STEP6A3_TRAZABILIDAD_DOCUMENTAL_001 |
| Nombre | QA STEP6A3 — Validación de trazabilidad documental |
| Tenant | TECDEX — 01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9 |
| Estado actual | NO EXISTE, propuesta sin materializar |
| Estado contractual tras crear | active, versión1 active, según controlInstantiate; no se fuerza transición |
| Responsable | TecDex, organización activa — 01a0f27e-b912-72d2-a08e-c5fcbd4efe43 |
| Base global accesible QA | EVIDENCE-001, Protección de evidencias y registros |
| Versión base | 01a0ea93-d236-7544-8b75-b3d5d16b0007 |
| Permiso necesario | controls.control.create, scope tenant, CONTROLS_ASSURANCE habilitada |
| Operación | POST /api/v1/controls:instantiate, NO EJECUTADA |

Objetivo/descripcion: validar exclusivamente en QA TECDEX la carga, finalización, vínculo tipado, creación, persistencia y recuperación de evidencia documental de PASO9.2B. No acredita cumplimiento ni eficacia de controles reales. Naturaleza hybrid; tipo preventive; frecuencia event_driven. La justificación no promete resultados todavía pendientes.

GET /api/v1/controls muestra página completa sin cursor, un único control TENANT_OWNED de requisitos de clientes, ajeno al propósito. No se reutiliza. GET de EVIDENCE-001 devuelve su versión y objetivo de integridad/cadena de custodia; figura como referencia global de validación no autoritativa QA. El contrato permite instanciar una versión global **accesible**; no se usa su control_id global como target tenant ni se crea/publica un objeto global. GET /api/v1/subjects devuelve la organización TecDex activa. Body completo propuesto en control-instantiate-proposal.json, marcado DRAFT_NOT_EXECUTED_REQUIRES_AUTHORIZED_SESSION.

## Impedimento exacto comprobado por la aplicación

Se probaron dos sesiones humanas con MFA por el flujo normal, sin recibir ni guardar credenciales o tokens:

| Sesión indicada por operador | Membresía TECDEX | Rol efectivo | Resultado de autorización |
| --- | --- | --- | --- |
| user1 | 01a146b7-f6ab-7616-a10e-2a993544c81c | PRIVACY_MANAGER | controls.control.read presente; controls.control.create AUSENTE |
| user2 | 01a146b9-05db-7240-8ece-a164aad5cce0 | LEGAL_REVIEWER | controls.control.read y controls.control.create AUSENTES |

Fuente oficial: GET /api/v1/access/me y GET /api/v2/auth/me/authorization con el tenant seleccionado. No se intentó un POST sin permiso, no se cambiaron roles, no se invocó backend por fuera de la API ni se utilizó SQL para fabricar registros. La autorización de preparar datos no modifica los grants de esas sesiones. El contrato publicado reserva controls.control.create a Control Owner/GRC Manager, con scope tenant requerido por controlInstantiate. No se usa una operación distinta para eludirlo.

**Se detiene la escritura**: hace falta iniciar sesión con una cuenta existente que ya posea controls.control.create en TECDEX. No se solicita ni presupone modificar IAM/RBAC. Hasta entonces no hay control_id que entregar, ni puede comprobarse su presencia real en el selector. No se declara SCENARIO_READY=PASS.

## Valores que podrán usar los operadores al resolver el permiso

Esta tabla es una preparación; **no es una instrucción de crear evidencia ahora** ni reemplaza el control_id pendiente:

| Formulario de evidencias | Valor |
| --- | --- |
| Usuario final | user3, tenant TECDEX |
| Código de evidencia | QA_EVID_RET_001 |
| Tipo | Documento — evidence_type=document |
| Origen | Archivo aportado — source_kind=uploaded |
| Responsable | TecDex — 01a0f27e-b912-72d2-a08e-c5fcbd4efe43 |
| Clasificación | Interna — internal |
| Política | QA_RET_ORD_001 v1 publicada — 01a146ce-bf2e-74cc-972b-154081141b64 |
| Aplicabilidad | Interna v1 publicada — 01a146f1-8dbe-723a-92a1-24c2bbf1ae45 |
| Archivo ya finalizado | FileObject 01a1551c-fdf8-72e0-aa91-85a45bd805c9 |
| Referencia de procedencia | Documento sintético GRC Tecdex para validación funcional STEP6A3, emitido el 19/10/2026. |
| Tipo de objeto del vínculo | Control — control_id |
| Control a seleccionar | QA_STEP6A3_TRAZABILIDAD_DOCUMENTAL_001, sólo después de creación oficial y verificación; ID PENDIENTE |
| Declaración de evidencia | Fixture y plan de prueba QA para validar carga, creación, persistencia y recuperación documental de STEP6A3; no acredita ejecución PASS ni eficacia o cumplimiento real. |
| Fechas | Opcionales según contrato; usar fecha/hora elegida por el operador en America/Santiago; no inventar vigencia o vencimiento |

La política y aplicabilidad provienen de la cadena documentada del FileObject y de las lecturas previas; no se publicaron ni modificaron en esta ejecución. Antes de la creación final deben seguir vigentes/aplicables. El PDF conserva resultados pendientes; user3 debe ejecutar el caso y comprobar persistencia/recuperación antes de declarar aceptación.

La UI conserva un FileObject finalizado sólo en el mismo formulario abierto. El ID anterior no se recupera automáticamente tras cerrar/recargar: no se prescribe repetir transferencia ni inventar un camino alternativo. Esta sesión de preparación no creó Evidence ni EvidenceVersion.

## Operaciones realmente ejecutadas

- Sesiones humanas normales con MFA de user1 y user2; sin modificar seguridad ni grants.
- GET /api/v1/access/me (ambas sesiones), HTTP200.
- GET /api/v2/auth/me/authorization con TECDEX (ambas), HTTP200.
- GET oficial del contenido del FileObject, HTTP200; copia/extracción local de lectura.
- GET /api/v1/controls?page[size]=100, HTTP200, página completa.
- GET /api/v1/controls/01a0ea93-d21e-76d9-a73d-8494499a2398, HTTP200.
- GET /api/v1/subjects?page[size]=100, HTTP200.
- GET /api/v1/file-objects/{id} sin /content fue una comprobación de metadata no disponible: HTTP404 de ruta; no se trató como desaparición del archivo ni se usó para cambiar el escenario. No existe una operación de metadata GET publicada en esa ruta.
- Rector Governance Gate exit0 PASS; syntax check del helper PASS; sin suites funcionales adicionales.

Cero POST, SQL de fabricación, objetos QA creados, evidencias finales, transferencias de carga, cambios de esquema/contratos/IAM/RBAC/código de producto o despliegues. Rama/main y trabajo previo preservados. Se añadieron únicamente helper de sesión oficial acotado, informe, propuesta y recibos; el helper prohíbe Evidence POST y cualquier mutación fuera de controls:instantiate. No hay conflictos rectores nuevos; bloqueo operativo por permiso efectivo ausente.

## Reanudación autorizada pendiente

Con una cuenta ya autorizada: reconfirmar permisos/base/tenant, revisar que no exista el código propuesto, ejecutar una vez controlInstantiate con idempotencia, recuperar el control por GET, verificar tenant/estado y disponibilidad en el selector real para user3. Entregar entonces el control_id definitivo. user3, y no el agente, crea la evidencia final; después se verifica persistencia y recuperación. No cerrar STEP6A3 ni iniciar STEP6A4.


## Resolución posterior durante la misma preparación, 2026-10-20

Se identificó y autenticó la cuenta existente andres.barouh@tecdex.net por Zoho; UserIdentity01a0cfae-d860-730d-88b8-d8b1b3f5d7dc activa, membresía TECDEX activa y controls.control.create scope tenant por CONTROL_OWNER/GRC_MANAGER vigentes. No fue necesario modificar permisos. La autorización previa de datos QA se ejecutó una vez por controlInstantiate (HTTP202): Control01a15910-4a71-71ea-ad1d-bd772cf3358f, códigoQA_STEP6A3_TRAZABILIDAD_DOCUMENTAL_001, TENANT_OWNED/active/version1 active; GETposterior200. User3 reautenticado por flujo normal, selector real PASS con ese Control seleccionado y cero POSTEvidence. El estado inicial bloqueado de este informe/RESULT.json queda como historia; resultado posterior en FINAL_RESULT.json y AUTHORIZED_CREATOR_AND_QA_SCENARIO_20261020.md. Evidencia final reservada a user3; persistencia/recuperación de esa evidencia y aceptación siguen pendientes. El formulario de comprobación no recupera/precarga el FileObject antiguo; la conservación sigue limitada al formulario original abierto. Sin deploy, SQL, grants ni cambios de producto.
