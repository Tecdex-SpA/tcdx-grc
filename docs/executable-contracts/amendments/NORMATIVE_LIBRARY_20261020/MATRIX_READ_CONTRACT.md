# matrixRead — proyección tipada común

GET /api/v1/matrices/{matrix_type}. OpenAPI fija seis tipos, parámetros, response y errores. MATRIX_TYPES.json fija ejes, tablas, FKs reales, filtros válidos, temporalidad y permisos de fuente; no acepta SQL/nombres de tabla/ejes arbitrarios. reporting.matrix.read es entrada CORE_PLATFORM a la consulta, no entitlement de reporting avanzado, Risk, exportación o Report Studio. Los permisos de fuente y sus capabilities vigentes son acumulativos, no sustituidos por el permiso de entrada.

## Autorización, ejes y celdas

Verificar ALL permisos requeridos para el tipo y autorización de cada eje/relación/resultado antes de join, búsqueda y paginación. Un filtro por objeto privado ajeno da404 seguro. El inspector sólo sigue destinos legibles; detalle adicional conserva su permiso. La consulta de un crosswalk exige acceso a ambas ediciones; item detail requiere el permiso de sus unidades/requisitos/controles. Propuestas preliminares sólo se muestran cuando su ownership/estado/access_mode de validación lo permiten, con estado literal; no se publican como equivalencias.

MatrixAxisRef y MatrixRelationRef son uniones cerradas con nombres de IDs tipados, no un par libre type/id ni persistencia de relaciones. En Controles×Evidencias se distingue Control tenant de ControlVersion exacta según el FK del EvidenceLink. Nunca se asigna una versión actual supuesta al vínculo control_id. Normas×Normas conserva no_match con targetNULL justificado sin crear un nodo destino ficticio. Los Items pueden mostrarse en inspector autorizado; no se agregan porcentajes de equivalencia.

Las celdas exponen relación, lifecycle real, versión/procedencia/intervalo y resultados almacenados cuando son accesibles. Un timestamp, período o metodología ausentes quedan NULL; as_of no sustituye assessed_at. El hash de revisión es del fragmento autorizado, no un supuesto checksum normativo. No se crea CalculationRun, score, indicador o porcentaje. El resultado canónico conserva result_status y domain_conclusion originales. Sin método/ámbito/validez suficientes para interpretación oficial, la UI no aplica color de cumplimiento, aunque un registro antiguo contenga valid; se muestra la limitación sin reescribirlo.

## Filtros y tiempo

Unknown query y filtro no soportado por tipo producen400. Marcos/ediciones exactos se verifican contra FKs y acceso. Subject sólo filtra matrices con RequirementApplicability.scope_subject_id; no se interpreta un owner como scope ni se inventa una relación de proceso. Fechas son UTC; filtros por período de assessments se aplican a assessed_at, sin fabricar períodos medidos. Intervalos efectivos son [from,to). Issues/Actions devuelven lifecycle actual a read_at y población creada a as_of; no simulan reconstrucción histórica. La temporalidad se declara en response.

Cursores separados de filas/columnas/celdas, con keyset estable por códigos/IDs canónicos, as_of/filtros y fingerprint de proyecciones autorizadas. Límites50/50/500 por defecto y200/200/2500 máximos son límites técnicos publicados, no cálculos normativos. El cliente recorre next_*_cursor sin truncamiento oculto. El servidor firma el cursor, vinculado a actor/tenant/permisos/ediciones/consulta; reautoriza y detecta drift409 al seguirlo. Cada página usa snapshot coherente READ ONLY/REPEATABLE READ; no crea snapshot de negocio ni lease entre requests. El fingerprint no incluye datos ocultos.

## Dashboard, vista completa y restricciones

Miniaturas piden ventanas menores del mismo lector y navegan a la vista específica completa preferentemente agrupada en Riesgos. El acceso a esas seis lecturas se distingue de transacciones Risk. Si el shell condiciona todo el grupo a RISK, el desarrollo autorizado deberá separar esa navegación sin conceder capability ni activar Riesgos. Riesgos×Controles espera su fase; Reporting/exportación espera su binding.

El color informativo de relación no significa cumplimiento. Un semáforo de conclusión sólo consume método/estado/ámbito válidos ya publicados; no nace de un link, evidencia cargada o parecido textual. Diferenciar ausencia/insuficiencia/conflicto/revisión y restricciones conocidas con texto/patrón además del color. No colorear para revelar cantidad o existencia de objetos ocultos. La advertencia genérica de autorización se muestra siempre y no afirma que existan objetos privados. Los contratos visuales activos, español, teclado, foco, responsive y aceptación humana nueva se conservan; nada de ello se ejecuta aquí.

El filtro lifecycle_state usa la columna y entidad declaradas por tipo en MATRIX_TYPES.json y sólo vocabulario/registry publicado; no crea estados. El cursor de celdas está ligado a la ventana exacta de filas/columnas, que se repite al continuar. Se agotan sus celdas antes de avanzar ejes; referencias fuera de ventana se rechazan.
