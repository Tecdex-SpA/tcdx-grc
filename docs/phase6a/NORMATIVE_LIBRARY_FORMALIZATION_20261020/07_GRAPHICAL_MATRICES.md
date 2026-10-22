# 07 — Dashboard y vista completa de matrices

D07 está aprobada íntegramente. Se formalizan requisitos y fuentes de lectura; no se modifican frontend, navegación, tokens, contratos visuales o APIs.

## Relaciones canónicas

| Matriz | Fuente | Información legítima |
| --- | --- | --- |
| Requisitos × Controles | RequirementControlMapping → ControlVersion; NormativeUnitControlMapping para ubicación, por separado | Tipo de relación, versión y procedencia; cumplimiento sólo desde una evaluación válida |
| Controles × Evidencias | EvidenceLink.control_id/control_version_id → EvidenceVersion/Review | Vínculo, revisión, validez, período y retención; cargar no equivale a aprobar |
| Requisitos × Evaluaciones | Requirement → RequirementApplicability → RequirementAssessment | Ámbito, versión y estados/resultados según método publicado |
| Normas × Normas | FrameworkCrosswalk y mappings tipados de ambas ediciones | Tipo, dirección, fundamento, confianza y revisión; sin equivalencia automática |
| Obligaciones × Aplicabilidad | Requirement → RequirementApplicability | Decisión, razón, autoridad y fecha; sin derivar estados jurídicos de prosa |
| Hallazgos × Acciones | Issue → Action → ActionVerification, con origen tipado | Estados reales; distinguir envío, finalización y verificación |
| Riesgos × Controles | RiskControlMapping y resultados autorizados | Integración posterior, cuando contratos y capacidades Risk estén habilitados |

## Ubicación y dependencias

La vista completa es una vista específica de matrices, preferentemente agrupada bajo **Riesgos**. Se separa la ubicación de navegación de las transacciones: consultar relaciones de Compliance, Evidence o Actions no exige habilitar operaciones Risk. Sólo Riesgos × Controles depende de esas capacidades.

Si el shell actual condiciona todo el grupo a una capability Risk, el futuro cambio autorizado deberá distinguir el acceso al workspace de matrices del acceso a funciones Risk. No concede entitlements nuevos, no habilita botones transaccionales ni presenta Riesgos como terminado. Se conserva la ubicación preferente aprobada; no se traslada unilateralmente. Los workflows genéricos y las transacciones mantienen las etapas del roadmap.

## Dashboard y estados visuales

Las miniaturas coloreadas y la vista completa consumen la misma proyección autorizada. Incluyen título, ejes, edición, fecha y leyenda, y permiten navegación por ratón o teclado al detalle accesible. No crean porcentajes oficiales, contadores normativos ni cachés de resultados de negocio.

El color puede representar presencia/tipo de relación. Un color de cumplimiento exige un resultado legible, vigente y válido para su método, edición y ámbito; un vínculo o archivo cargado no basta. Ausencia, insuficiencia, conflicto, restricción de acceso y revisión pendiente se distinguen con texto y señales adicionales al color. Ni tonalidad ni densidad revelan objetos ocultos. Un dato desconocido no se convierte en cero.

## Vista completa y seguridad

Permitir selección de marcos/ediciones, ejes compatibles, filtros autorizados, inspección de celdas y consulta de relaciones/procedencia. Subject, proceso, responsable, estado y fecha son filtros sólo cuando exista una relación y un lector canónicos. El inspector muestra identidades y versiones exactas y navega a objetos que el actor pueda consultar.

B08 propone **matrixRead**, sin ruta ni permiso publicados. El contrato debe definir ejes tipados, filtros permitidos, límites, cursores y la intersección de permisos de los dominios involucrados. No recibe SQL ni nombres de tablas. No descarga datos privados para ocultarlos en UI, cruza tenants ni filtra existencia mediante conteos. La paginación/virtualización conserva el universo autorizado sin truncamiento silencioso; el cursor queda vinculado a tenant, tipo, ejes, ediciones y filtros.

## Preferencias, exportación y autoridad visual

La selección efímera no necesita persistencia. Guardar preferencias requiere una Definition de presentación con esquema cerrado o el binding canónico de Reporting aplicable. No se guardan reglas críticas o IDs libres como autoridad en JSON ni se crea matrix_results. Exportaciones persistidas/formateadas utilizan ReportDefinition/Run/Artifact/Snapshot y sus permisos cuando se habilite su contrato. No se anticipa Report Studio ni se simula exportación; se conserva la dependencia aprobada.

El desarrollo futuro debe preservar activos Tecdex, tokens y contratos visuales activos. Verificará capturas deterministas, anchos pertinentes, teclado, foco, contraste, nombres accesibles, leyendas y errores. La aceptación humana del alcance nuevo será real y separada del PASS de STEP6A4. No se cambia ninguna imagen de baseline en esta preparación.
