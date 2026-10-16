# Decisiones macro para continuar STEP 6A3

Destinatario Andrés Barouh, Product Owner con funciones acumuladas. Paquete R5 DRAFT_NOT_APPROVED. Rector v1.8 activo y R1/R2/R3 preservados; una sola persona puede decidir las funciones internas conforme a49. Este paquete no exige revisores independientes por defecto.

Se necesita decidir el delta IANA exacto y el camino para obtener bindings metodológicos/jurídicos y scope RLS. La preparación y los checks no sustituyen prueba de suficiencia, contrato jurídico, aprobación de hashes ni aceptación externa. Ninguna opción viene marcada.

Marcar UNA alternativa por grupo D1–D5 y registrar funciones/fecha/aceptación humana al final. La aprobación de preparación no autoriza QA, IAM real, grants, DDL compartido, despliegue o STEP6A4. El manifiesto externo R5_MACRO_APPROVAL_MANIFEST.json identifica bytes y alcance; no contiene firma de Codex.

# D1 Fuentes y publicación de CFG D

Cláusulas CFG-D-COMPLIANCE-V1, CFG-D-CONTROLS-V1 y CFG-D-PUBLICATION. S01/S02 publican factores1/0.50/0, peso baseline1, coverage80 y min(design,operating); no se someten otra vez a aprobación. S08/S09 conservan método/formula v1 inmutables y EC opcional compatible.

La revisión de modelo y contrato no demuestra cada vínculo v1 a inputs de recencia/suficiencia/procedencia, pesos overridePack, SourceResolution, confianza y modo inmutable. NO_BINDING_DEMONSTRATED; esto no demuestra inexistencia fuera de las fuentes revisadas.

[ ] A Identifico fuentes/versiones publicadas existentes y sus relaciones para cada baseline v1; autorizo sólo su verificación y derivación mecánica tras gates. Debo completar la matriz de inputs con fuente y locator. Una firma sin esas fuentes mantiene bloqueado none.

[ ] B Solicito un diseño de delta canónico sucesor para los inputs sin fuente, con reglas exactas que debo proporcionar y manifest posterior; no autorizo escoger valores ni modificar v1 publicada.

[ ] C Mantengo vigente EC opcional compatible y aplazo la declaración none; no cierro las tres cláusulas.

Recomendación técnica A si existe fuente publicada verificable; B si falta, conservando comportamiento actual mientras se publica el sucesor. No se recomienda inventar otra ventana, peso o threshold. Inputs necesarios por metodología: aplicabilidad/población y aprobación; weightsPack/vigencia; evidencia requerida/validación; recencia y origen; source/conflicto/resolución; blocking/coverage/confianza; agregación/lineage y declaración modo/version/formula/sourceHash/effective interval. Campo de respuesta fuente y locator por input: __________________________________________.

# D2 Binding jurídico CT04

C-04W mantiene revalidación de publicación/vigencia/aplicabilidad/prioridad y coherencia upload→FileObject→Evidence. S03 fija precedencia y aclara que baseline de producto no es mínimo legal universal. S07 conserva retention_policy_id obligatorio. PrivacyProcessingActivity tiene policy y legal_bases pero no se demostró vínculo tipado a los tres objetos.

[ ] A Identifico PrivacyProcessingActivity como contexto jurídicamente correcto de esos objetos y solicito propuesta exacta de relación/alcance/versionado/guards para aprobación posterior. Su coincidencia policy_id no basta y esta opción no crea FK ni autoriza DDL.

[ ] B Identifico otra entidad/contexto rector con fuente/cláusula efectiva y relación que deben examinarse; no se inventa una entidad por conveniencia.

[ ] C Mantengo aplicación nueva bloqueada hasta entregar contexto y fuente; PENDIENTE sigue sólo donde contrato vigente admite flujo sin política.

Recomendación técnica reutilizar contexto existente únicamente si A refleja la aplicabilidad jurídica real; de lo contrario B con fuente oficial. C es el estado seguro mientras faltan datos. La técnica no decide cuál actividad u obligación aplica.

Respuesta obligatoria para A/B: contrato de servicio Tecdex/version/cláusula (distinto de política tenant); política tenant/versión; autoridad legal y locator; tenant/objeto/classificación/jurisdicción; vigencia; prioridad/conflictos/hold; relación tipada y aprobación de alcance. __________________________________________. No se atribuye cumplimiento ni firma jurídica a este paquete.

# D3 Proyección IANA exacta

Dependencia TENANT_TIMEZONE_CONTEXT fuera de las48filas. Texto de R4 reproducido sin modificación; SHA256 UTF8 con salto final 6205faaafa3cb0cbd4d0cf34cd9c8343ccca64392e638a833e10fa7db8c73375. S10/S11 ya definen contexto propio y DTO cerrado; Tenant.default_timezone ya persiste/valida. No hay aprobación efectiva del texto DRAFT.

[ ] A Apruebo íntegramente el texto exacto siguiente y sus bytes identificados por el manifiesto R5; autorizo publicación e implementación local tras gates, sin QA ni deploy.

[ ] B No apruebo ese delta; contexto IANA sigue pendiente hasta una propuesta distinta exacta. No autoriza default ni fallback.

Recomendación técnica A: aprovecha campo y autorización propios existentes, sin nueva ruta/permisos/columnas. Amplía un DTO cerrado y exige negativos/schema/PG/DST/context-switch y regresión; la recomendación no lo publica.

Apruebo para STEP 6A.3 añadir default_timezone, string obligatorio de longitud 1 a 64 y validado como identificador IANA, a CurrentPrincipalTenantPermissions de CurrentPrincipalAuthorization. Su valor proviene exclusivamente de platform.tenants.default_timezone del tenant seleccionado mediante x-tcdx-tenant-id, leído en la misma transacción read-only repeatable-read que valida la membresía humana propia activa y tenant activo. Sin tenant seleccionado, tenant_permissions permanece null. Se preservan errores y autorización actuales: header inválido 400, autenticación 401, principal no humano o membresía/tenant inactivos 403, contexto ajeno o inexistente 404, dependencia o dato temporal persistido inválido 503. No se concede Tenant.read, no se exponen datos adicionales de empresa o persona y Platform Admin/Support no adquiere acceso tenant sin vínculo autorizado por contrato. El dato es presentación efímera; no es fuente de autorización. Al cambiar tenant o perder contexto se invalida el dato anterior; no se convierte una fecha con zona de navegador, host, locale o default supuesto. Backend y API conservan UTC Z; la UI usa la zona persistida validada. Se rechazan entradas locales inexistentes o ambiguas por DST hasta que el usuario pueda expresar un instante inequívoco conforme al contrato temporal; no se elige un offset automáticamente. No se cambia esquema, grants, auditoría de comandos, metodología ni GET EC R1. Publicación e implementación sólo después del manifiesto de este texto aprobado por el PO y de las pruebas aplicables.

# D4 Alcance y viabilidad RLS

S04 exige RLS para tablas críticas cuando sea operacionalmente viable. Es obligación condicional, no dispensa ni mandato universal. RLS físicoR3=0tablas/0policies/0forced. EvaluaciónR5 completa en R5_RLS_VIABILITY.md;24candidatas derivadas del slice, sin scope aprobado.

[ ] A Solicito un diseño de contextoDB/roles/predicados para las24candidatas descritas o el subconjunto exacto escrito abajo, con manifest y aprobación posteriores antes de implementación. No autorizo activar RLS ni QA mediante esta selección.

[ ] B Presento evidencia de condición de viabilidad distinta para el scope exacto indicado; requiere evaluación contra rector26 y no constituye dispensa general ni PASS de RLS.

[ ] C Mantengo sin decidir el alcance y viabilidad; RLS NOT_IMPLEMENTED y gate de defensa en profundidad pendiente.

Recomendación técnica A. PostgreSQL16 tiene la capacidad; falta contrato confiable de contexto, actor runtime sin bypass, tratamiento global/tenant/worker/pool y backup. La evidencia app/FK no equivale a RLS. Scope exacto/subconjunto y fuente si B: __________________________________________. Las alternativas no conceden PlatformSupport transversal.

# D5 Preparación operacional QA

C-07/CFG-UQ1/CFG-UQ2/CFG-DEFAULT son operaciones reales reservadas; C-08/CFG-QA/VOC-QA aceptación externa y VOC-C04 inventario histórico. R3 local ya aprobado; no repetir44+52firmas ni38pruebasSQL sin cambio. QA_PROMOTION_PACKAGE_R5.md preserva artifacts31/32/33/34 y backups/recuperación.

[ ] A Identifico actores/cuentas/destino/ventana y autorizo sólo completar el plan operacional exacto para una aprobación posterior; no autoriza conexión ni ejecución.

[ ] B Mantengo paquete PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED sin inputs operacionales; se continúa únicamente local decidido.

Recomendación técnica A para dejar un próximo plan ejecutable; requiere ServicePrincipal PLATFORM_CONTROL activo existente para33/34, identidadDBA, cuentas/membresías/entitlements reales deQA, ventana propuesta y backup/restore. No entregar secretos. Datos operacionales y responsables: __________________________________________.

Ventana tentativa del planR5: sesión supervisada después de resolver bindings y sellar candidato; fecha/hora/duración por fijar expresamente por PO/DBA y nunca autorizada por tiempo transcurrido. Inventario de sólo lectura debe preceder y estar autorizado separadamente a migración/deploy. GO no puede superar bindings faltantes, incompatibilidad histórica o controles de tenant/auditoría.

# Aceptación agrupada y cláusulas exactas

Una sola aceptación humana puede registrar las cinco selecciones con funciones acumuladas. Firmar identifica decisión y alcance exactos; no acredita pruebas futuras ni cierra por sí sola STEP6A3. Si la respuesta modifica cualquier texto material se prepara sucesor con hash, preservando éste.

Nombre: ____________________ Funciones ejercidas: ____________________ Fecha UTC o instante con zona explícita: ____________________ Decisiones D1/D2/D3/D4/D5: ____________________ Firma o aceptación expresa: ____________________.

Las doce cláusulas literales siguientes se conservan desde el ledger y R4; categoría o propuesta IANA no las renombra.

C-04W: Aprobar revalidación de publicación/vigencia/aplicabilidad/prioridad y coherencia upload→FileObject→Evidence en comandos futuros. Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:42

C-07: Aprobar estrategia44 grants/template set y44 por tenant completo, SEED010, preflight, versionado/audit; ejecución operacional sigue NOT_AUTHORIZED. Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:46

C-08: Aprobar18 pruebas negativas/regresión/gates de §10. Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:47

CFG-D-COMPLIANCE-V1: Confirmar autosuficiencia de BASELINE_COMPLIANCE v1 y ausencia de configuración adicional conforme a 28; aprobar la cláusula individual, no una preferencia operativa Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:50

CFG-D-CONTROLS-V1: Confirmar autosuficiencia de BASELINE_CONTROL_EFFECTIVENESS v1 y ausencia de configuración adicional conforme a 28 Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:51

CFG-D-PUBLICATION: Aprobar forma de publicación versionada del modo por metodología y enlace verificable a la versión; sin columnas/tablas ni flags inferidos; resolver requisito de nueva versión inmutable antes de ejecutar Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:53

CFG-UQ1: Reconciliar business key EC: tenant/Definition/Subject/effective_at/hash, NULLS NOT DISTINCT Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:54

CFG-UQ2: Reconciliar unicidad de layers por EC + precedence_level + ordinal Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:55

CFG-DEFAULT: Mantener exactamente un typed default que coincida con value_type; cero requiere resolución competente, no default fabricado Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:56

CFG-QA: Aprobar aceptación de 28 CFG-T01..08 sin autoaprobar runtime Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:58

VOC-C04: Aprobar inventario histórico y compatibilidad antes del enforcement conforme a 23/30 Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:78

VOC-QA: Aprobar pruebas T-VOC01..12 y compatibilidad por ocurrencia sin certificar ejecución de capacidades nuevas Fuente docs/phase6a/STEP_6A3/26_PO_APPROVAL_AND_COMPETENT_REVIEW_LEDGER.md:81

# Fuentes versionadas y hashes

Rutas relativas a la raíz del checkout. El hash identifica bytes inspeccionados; fuentes publicadas conservan su vigencia y los DRAFT su estado. El hash del propio Word se registra fuera del documento para evitar autorreferencia.

S01 | v1.8 rector17 §§3,6,8
docs/rector/baseline/17_CATALOGO_METRICAS_FORMULAS_Y_AGREGACIONES.md
SHA256 b5a6eb29e7877a5e1217f9177170354f694d57265175c10883849a5938db465d

S02 | v1.8 rector19 §§2–3
docs/rector/baseline/19_METODOLOGIAS_GRC_COMPLIANCE_RISK_ASSURANCE.md
SHA256 549e64e9ab8f0c2edcfb3e6c5c03939125e311d32298c3fac8d0b09b2d1f5c95

S03 | v1.8 rector23 §§6–8
docs/rector/baseline/23_CONTRATO_TEMPORAL_VERSIONADO_RETENCION_RECALCULO.md
SHA256 27fe799dc0bf1dcefb1e8af7efb56e1b019b934d8d18b0f6a957f6d162eff50a

S04 | v1.8 rector26 §1
docs/rector/baseline/26_NON_FUNCTIONAL_SECURITY_RELIABILITY_OBSERVABILITY.md
SHA256 6bd7535ac7314da4b3b48284f57d42095af1a200f04d0dcbbaa732a552987af9

S05 | v1.8 rector45 §3
docs/rector/baseline/45_CONTRATO_DESARROLLO_CERRADO_Y_NO_INFERENCIA.md
SHA256 e283b2a059aa7f1a563fb3ac1fc242eab6156232cb183217b38afe02a196d7ba

S06 | v1.8 rector49 §3
docs/rector/baseline/49_GOBIERNO_INTERNO_Y_REVISION_UNIPERSONAL.md
SHA256 544fd5083cf38ba5df954152d83cd02b65be3ce3f57e634ff47c685373de8c1b

S07 | Frozen physical model;33,107–114,172–178,203–229
docs/physical-data-model/01_PHYSICAL_DATA_MODEL.md
SHA256 cdbee203ac9afe9f89cbb4320f6b7010a0e315bc160d2be6134ed3c2a15fabd5

S08 | Published Phase5 methodology contract
docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md
SHA256 eedf85debfb5eb48e25d4abdd5ff4332c5dba8197ab7b96a66b97f640cfef4df

S09 | Historical migration30; immutable methodology v1
database/migrations/20261007000200_phase5_methodology_binding.sql
SHA256 fa178ad731d48045313a11b22f1bdf3c228be502dafa1883136162ad48127850

S10 | Current schema CurrentPrincipalTenantPermissions:5262
docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml
SHA256 739ba3c21aaa58f892e95c69fe3c8415dbf46798ebf07cc61753660479d2ac67

S11 | MI7A authorization context §3
docs/executable-contracts/23_FRONTEND_AUTHENTICATION_AUTHORIZATION_PROJECTIONS.md
SHA256 897cfc51449b3a8b667e9e830a3e83f5b66be6093ae1e1c64bf5fff685ae3a61

S12 | R4 DRAFT exact IANA text
docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/R4_DECISIONS_REQUIRED.md
SHA256 fba086a1c82f4cc032594a7dd49751072cdf498048d369982c6adf9b92797519

S13 | R4 literal12 clauses
docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/REMAINING_12_CLAUSES_R4.md
SHA256 ed25ebce02c56b680f09f217e80283f692c5ca96907f92213c98df7488b6aac6

S14 | QA R3 PREPARED_NOT_READY_NOT_AUTHORIZED_NOT_EXECUTED
docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/QA_OPERATIONAL_PLAN_R3.json
SHA256 3a1451f6b733fc7c2f45b46b9bf376364dcd24428affe1a2062256b640afc0e8
