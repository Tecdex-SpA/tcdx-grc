# STEP6A3 — creador autorizado y escenario QA preparado — 2026-10-20

Baseline `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`; https://grc.tecdex.net/.

```
AUTHORIZED_CREATOR_FOUND=YES
AUTHORIZED_ROLE=CONTROL_OWNER (también GRC_MANAGER)
AUTHORIZED_IDENTITY=01a0cfae-d860-730d-88b8-d8b1b3f5d7dc
TENANT_SCOPE_VALID=YES
SOD_VALID=YES
CONTROL_CREATION_READY=YES
RECTOR_GATE=PASS
STEP6A3=PARTIAL_BLOCKED
STEP6A4=NOT_STARTED
```

## Identidad existente, sin grants nuevos

Cuenta indicada por el usuario y confirmada en proyección oficial: andres.barouh@tecdex.net, display_name Baruj, autenticación corporativa Zoho. UserIdentity `01a0cfae-d860-730d-88b8-d8b1b3f5d7dc`, identidad active. Membresía TECDEX `01a0cfc7-0e5d-764f-92d8-a15e25223325`, active. Tenant `01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9`.

Roles publicados que incluyen controls.control.create según catálogo05/rectores22/42/44: CONTROL_OWNER y GRC_MANAGER. La sesión actual devuelve ese permiso con scope tenant en GET /api/v2/auth/me/authorization. GET de su membresía confirma asignaciones:

- CONTROL_OWNER, MembershipRole `01a0d491-0364-77ab-ba43-50bf8fadbc0b`, tenant, desde2026-09-24T17:57:48.515959Z, sin valid_to.
- GRC_MANAGER, MembershipRole `01a10c22-9f7b-706c-b3e3-7765613343d8`, tenant, desde2026-10-05T12:55:58.072799Z, sin valid_to.

Una asignación histórica CONTROL_OWNER/assigned_object está expirada desde08/10 y **no** sustenta la autorización. La cuenta también tiene PLATFORM_ADMIN y TENANT_ADMIN, pero su creación de Control se autoriza por la cadena operacional de tenant, no por Platform Admin. Se verificaron identidad, membresía, roles y scopes vigentes por la API oficial. El POST aceptado confirma además entitlement CONTROLS_ASSURANCE, referencia global accesible QA y responsable activo/vigente del tenant, sin bypass de ObjectPolicy.

Se utilizó el flujo normal Zoho, con su política de autenticación vigente; no se cambiaron MFA, sesiones, proveedor o claims para conceder autoridad. No se inspeccionaron secretos/enrolamiento MFA de Zoho ni se afirma una auditoría independiente del IdP: la sesión fue autenticada y aceptada por el verificador de la aplicación. Los logins Managed Identity de prueba permanecen con su MFA normal. No se agregó un requisito MFA particular ni se relajó el contrato de controlInstantiate.

SOD_VALID=YES corresponde a **crear este Control QA y preparar su vinculación**, sin revisión, aprobación o autoaceptación ejecutada. El creador es distinto de la identidad de user3 que ejecutará la creación final. Tener múltiples roles no autoriza autoaprobar una Evidence propia ni otras operaciones prohibidas; SoD de futuras revisiones se revalida por objeto. No se declara independencia humana o aprobación sólo por disponer de varias cuentas.

## Resolución, usando la autorización previa de datos QA

La autorización previa de preparación funcional permitía crear un único objeto de prueba coherente mediante operaciones oficiales. Se continuó ese trabajo cuando quedó acreditada la cuenta creadora. Sin nuevas asignaciones de roles, aprovisionamiento ni cambios al modelo RBAC.

El PDF se leyó por GET oficial de contenido: GRC_Tecdex_Evidencia_QA_STEP6A3.pdf, FileObject `01a1551c-fdf8-72e0-aa91-85a45bd805c9`, 71932bytes. Es fixture/plan sintético para validar carga, finalización, creación, persistencia y trazabilidad, y excluye afirmar eficacia/cumplimiento real. Por ello se creó un control **QA de ese flujo**, no se reutilizó el control de requisitos de clientes. El vínculo documental sustenta la preparación/fixture, sin presentar resultados pendientes como PASS.

Consulta completa de controles antes de crear: código propuesto ausente, base global EVIDENCE-001 visible para validación QA. Se hizo **una sola** llamada oficial idempotente:

`POST /api/v1/controls:instantiate`, contexto TECDEX → HTTP202 completed.

Correlación `01a15910-4a26-775d-824f-31c443517299`. El servicio conserva las escrituras contractuales de Control/ControlVersion, auditoría `audit.controls.control.instantiate.v1`, outbox e idempotencia en transacción; no se fabricaron registros con SQL ni se escribieron auditorías manuales.

| Dato real creado | Valor |
| --- | --- |
| Tipo | Control, TENANT_OWNED, tenant_instantiated |
| ID | **01a15910-4a71-71ea-ad1d-bd772cf3358f** |
| Código | **QA_STEP6A3_TRAZABILIDAD_DOCUMENTAL_001** |
| Nombre | QA STEP6A3 — Validación de trazabilidad documental |
| Tenant | TECDEX — 01a0cfc7-0c97-75a3-890f-d6ca9db8bbe9 |
| Estado | active |
| Versión | 1, active — 01a15910-4a71-71ea-ad1d-c1b7e37d9a50 |
| Base | EVIDENCE-001, versión01a0ea93-d236-7544-8b75-b3d5d16b0007, accesible como referencia no autoritativa QA |
| Responsable | TecDex, organización activa — 01a0f27e-b912-72d2-a08e-c5fcbd4efe43 |
| Tipo / naturaleza / frecuencia | preventive / hybrid / event_driven |

Descripción/objetivo exacto: «Validar exclusivamente en QA TECDEX el flujo contractual de carga, finalización, vinculación tipada, creación, persistencia y recuperación de evidencia documental en PASO 9.2B. No acredita cumplimiento normativo ni eficacia de controles reales.»

El payload completo, con execution_method, verification_method y minimum_evidence, está en evidence/functional-scenario-20261020/creator-zoho/control-create-request.json. GET posterior del Control devuelve HTTP200 con el mismo ID/estado/version. El contrato crea active/version1 active; no hubo transiciones inventadas, publicación global ni modificación de mappings.

## Comprobación real con user3

La UI de user3 confirmó membresía activa TECDEX y roles EVIDENCE_OWNER/PRIVACY_MANAGER. Su autorización oficial incluye evidence.evidence.create/read y controls.control.read con scope tenant; **no** controls.control.create ni platform.role.assign/membership.read. Sirve para la aceptación final, no para preparar este Control.

Una sesión anterior de user3 devolvió401 y se renovó mediante un login humano normal con MFA, sin corregir duración de sesión ni tratar el cambio de VPN como fallo temporal. En la nueva sesión, el agente abrió el formulario real Evidencias → Evidencias → Nuevo registro, agregó un vínculo de tipo control_id y seleccionó el ID creado. Resultado PASS, captura real live-evidence-control-picker.png. El catálogo mostrado conservó el control tenant anterior y el QA nuevo; no ofreció el control global EVIDENCE-001 como control_id. **Cero POST /api/v1/evidence**, cero cargas de archivo. El formulario de prueba quedó abierto con el control seleccionado.

Esta comprobación verifica disponibilidad/selección real, no creación/persistencia/recuperación de la evidencia final. Esa última operación sigue reservada a user3.

## Valores exactos para retomar PASO 9.2B

| Campo | Valor |
| --- | --- |
| Sesión / empresa | user3 / TecDex (TECDEX) |
| Código de evidencia | QA_EVID_RET_001 |
| Tipo | Documento — document |
| Responsable de negocio | TecDex — 01a0f27e-b912-72d2-a08e-c5fcbd4efe43 |
| Clasificación | Interna — internal |
| Política | QA_RET_ORD_001 v1 publicada — 01a146ce-bf2e-74cc-972b-154081141b64 |
| Aplicabilidad | Interna v1 publicada — 01a146f1-8dbe-723a-92a1-24c2bbf1ae45 |
| Origen | Archivo aportado — uploaded |
| PDF | GRC_Tecdex_Evidencia_QA_STEP6A3.pdf, documento sintético leído; no el anexo ACME anterior |
| FileObject finalizado conocido | 01a1551c-fdf8-72e0-aa91-85a45bd805c9 |
| Referencia de procedencia | Documento sintético GRC Tecdex para validación funcional STEP6A3, emitido el 19/10/2026. |
| Vínculos → Tipo de objeto | ID de control — control_id |
| Vínculos → ID de control | QA_STEP6A3_TRAZABILIDAD_DOCUMENTAL_001 — **01a15910-4a71-71ea-ad1d-bd772cf3358f** |
| Declaración de evidencia | Fixture y plan de prueba QA para validar carga, creación, persistencia y recuperación documental de STEP6A3; no acredita ejecución PASS ni eficacia o cumplimiento real. |
| Fechas | Opcionales; usar valores reales elegidos por el operador en America/Santiago, sin inventar vigencias/vencimientos |

No volver a crear el Control ni sustituirlo por el global. El operador user3 completa su registro y ejecuta la creación final; después verifica por listado/GET/recarga que el ID y la versión persistieron y son recuperables. Hasta eso, no hay aceptación de PASO9.2B.

El formulario abierto por esta comprobación contiene el vínculo, **no** una transferencia/file_object_id precargado. La UI existente conserva un FileObject sólo en el mismo formulario que lo finalizó; no recupera un archivo antiguo entre formularios. Se debe conservar el formulario original con archivo finalizado, si existe, y refrescar la búsqueda del selector para elegir este Control. No se presenta el ID conocido como si estuviera recuperado en el formulario nuevo, no se vuelve a transferir el PDF por el agente ni se introduce otro mecanismo. Cualquier limitación restante de recuperación del archivo se mantiene explícita, sin declarar el flujo final resuelto por esta prueba.

## Procedimiento exacto de cuenta creadora y operación oficial

1. https://grc.tecdex.net/ → ingreso corporativo Zoho con andres.barouh@tecdex.net por el flujo habitual; completar las verificaciones del proveedor y elegir TecDex. No solicitar asignaciones nuevas.
2. Verificar controls.control.create a scope tenant y membresía activa. La mera presencia de PLATFORM_ADMIN no sirve como sustituto.
3. Controles → buscar QA_STEP6A3_TRAZABILIDAD_DOCUMENTAL_001. **Ya está creado: consultar, no duplicar**.
4. El procedimiento ejecutado fue instanciar referencia EVIDENCE-001 versión1, responsable TecDex y payload exacto del recibo, una vez con Idempotency-Key. No se entregan credenciales ni tokens ni se requiere cambiarlos.
5. user3 utiliza el Control tenant creado en el formulario de evidencias; no crea otra implementación ni modifica roles.

## Trazabilidad, gates y límites

Fuentes vigentes: GET access/me, GET autorización, GET propia membresía, GET controles, POST instantiate, GET recuperación, selección UI real user3. El primer GET administrativo de lista que combinaba tenant_id de query con contexto tenant devolvió403; se respetó y se usó GET de membresía propia en contexto tenant, HTTP200. No se trató como bypass ni se alteró una política. SSH de sólo lectura agotó conexión; la prueba decisiva se obtuvo por API oficial autenticada, no por datos históricos. Los candidatos de15/10 quedan sólo como antecedente; la cuenta autorizada se verificó nuevamente hoy.

Rector Governance Gate PASS (exit0), syntax del helper PASS, HTTP202/GET200 y selector real PASS. Sin suites o pruebas funcionales ajenas. MFA/contratos/tenant/RBAC/auditoría vigentes conservados. Una creación oficial de Control QA con su versión y efectos transaccionales normales; ninguna Evidence/EvidenceVersion creada por el agente. Sin SQL manual, grants, esquema, migraciones, modificaciones a código de producto/contratos/seguridad, deploy, cambios de main ni STEP6A4. Los cambios locales previos permanecen preservados.

Archivos añadidos/actualizados para esta investigación: helper diagnóstico READ ONLY qa-authorized-creator-readonly.cjs; helper de sesiones y lectura/selector oficial qa-functional-scenario-browser.mjs; este informe; evidencias authorized-creator-20261020 y functional-scenario-20261020 (sin secretos); referencias aditivas en preparación y MASTER_EXECUTION_STATUS.md. No hay conflictos rectores nuevos.
