# 11 — Criterios de aceptación aprobados y verificaciones futuras

`HUMAN_ACCEPTANCE_CRITERIA=APPROVED` por el mandato PO de 2026-10-20. **No significa HUMAN_UI_REVIEW ni aceptación de una biblioteca implementada.** Esta entrega formula casos verificables; las pruebas de producto siguientes no fueron ejecutadas aquí.

## Cinco criterios de autoridad recibidos

1. **Integridad normativa:** ninguna obligación se atribuye incorrectamente a una fuente; cada contenido publicado conserva procedencia verificable.
2. **Experiencia funcional:** el usuario puede comprender, implementar y consultar cómo demostrar cumplimiento mediante objetos canónicos.
3. **Seguridad:** ninguna operación permite eludir tenant, RBAC o SoD.
4. **Trazabilidad:** las decisiones, configuraciones, relaciones y revisiones conservan autoridad e historial.
5. **Integridad arquitectónica:** no existen estructuras paralelas, cálculos incompatibles ni dependencias indebidas.

La aceptación funcional de la biblioteca es independiente de los gates de publicación de cada paquete normativo. N01–N17, D01–D09 y las tres capas mantienen su aprobación conceptual definitiva.

## Casos propuestos para verificar el resultado implementado

| Caso local de este expediente | Condición verificable | Evidencia requerida para PASS futuro |
| --- | --- | --- |
| AC01 | Nombre, ubicación post6A4/pre6A5, baseline efectiva y límites coinciden; sin etapa numérica inventada ni reapertura de STEP6A4 | Task packet, activación contractual autorizada, manifiestos/estado único y preservación |
| AC02 | N01/N02: elegir marco/edición, navegar jerarquía con parent/código/título/locator y búsqueda conservando contexto; cero UUID/JSON manual | API real paginada, relaciones y UI por rol/viewport |
| AC03 | Ley 21.663 es sexto ámbito independiente con sus 10 candidatos; tablas genéricas y source/version/manifests separados | Allowlist/contratos efectivos, cotejo y casos negativos por ámbito |
| AC04 | 211 candidatos y 104 propuestas conservan identidad/naturaleza; 2015/2026 no se fusionan ni se declaran 315 obligaciones | Índices fuente, hashes por fila, matriz de homologación y diff de identidades |
| AC05 | Se distinguen integridad, autenticidad/procedencia, semántica, derechos, homologación y publicación; cada afirmación oficial tiene cita revisada | Registro de fuente/edición/uso, cotejo y revisiones reales; SHA solo no basta |
| AC06 | Flujos internos de desarrollo/QA autorizados no quedan bloqueados globalmente por falta de publicación comercial; actos con derecho no acreditado restringidos sólo en ese alcance; no salida oficial falsa | Casos funcionales y de autorización por entorno/actor/contenido/uso, access_mode y prohibición de distribuir/afirmar sin autoridad |
| AC07 | COMPRENDER ofrece texto o referencia autorizada, explicación, propósito, alcance, interpretación, términos, relaciones, ejemplos y errores frecuentes; distingue editorial | Versiones/citas/revisión, API/lectura y aceptación humana de las secciones completas |
| AC08 | IMPLEMENTAR ofrece actividad, controles, responsabilidades, procedimiento, frecuencia y recomendación contextualizados sin crear grants/personas ni plazos legales ficticios | ControlVersion/KnowledgeVersion y targets exactos; UI y tests de autoridad |
| AC09 | DEMOSTRAR consulta expectativas, evidencia existente, evaluaciones/resultados, hallazgos/acciones y suficiencia según método publicado | Grafo autorizado, resultado/status/método/período/versiones y casos de dato faltante |
| AC10 | Los cuatro targets de Knowledge son tipados/versionados/auditables; XOR y ownership válidos; cuerpo/vínculos publicados inmutables | PostgreSQL 16 real: FK/XOR/foreign/global-private negativos, replay/concurrencia y nueva versión correctiva |
| AC11 | Contexto escrito es tenant-owned/versionado/Subject propio, con source/hash/fecha; no modifica verdad global ni autorización desde prosa | Lectura/escritura/revisión/context snapshot por actor y tenant; rechazo a target ajeno |
| AC12 | Los cuatro ajustes muestran original, propuesta, valor efectivo y procedencia/versiones; sólo Definition y target autorizados | Definiciones publicadas, resolver único, tipos/scopes/validaciones y proyección UI |
| AC13 | Propuesta→revisión→aprobación/rechazo→vigencia→auditoría; motivo y versión exacta en cada decisión | Registro de transiciones autorizadas, estado persistido, intervalo/hash/audit/outbox |
| AC14 | GRC Manager sólo decide con grant/policy/scope efectivos; base NONE actual sigue DENY hasta publicación; Tenant Admin no autoaprueba; Platform no gana autoridad tenant | Matriz ALLOW/DENY generada y pruebas reales; publicación IAM exacta sin grants auxiliares |
| AC15 | Autor no revisa/decide su propia versión; ETag desactualizado 409, replay idéntico sin duplicación, conflicto de igual scope explícito; historia preservada | TC-SOD/CONFIG/CONC/IDEM con recibos DB/API/audit, incluyendo roles acumulados |
| AC16 | Seis cruces preliminares conservados; ambas ediciones/targets/tipo/dirección/rationale/confianza/procedencia/review presentes antes de equivalencia publicada | Crosswalks tipados revisados, no_match justificable, sin conclusiones copiadas |
| AC17 | Contexto fundamenta una propuesta; applicability usa RequirementApplicability con actor/rationale/scope/intervalo y contexto exacto; aceptar sugerencia no ejecuta command | Flujo existente y FK de procedencia candidata efectiva; comandos y auditoría separados |
| AC18 | NormativeUnit no recibe assessment ni EvidenceLink directo; por unidad se agregan descendientes autorizados | Schema/contrato negativo y navegación real a targets válidos |
| AC19 | Dashboard muestra miniaturas coloreadas y vista completa de seis matrices; ubicación preferente Riesgos sin habilitar transacciones Risk ni exigirlas para lecturas independientes | API común, navegación/inspector, capabilities y pruebas funcionales/accesibles |
| AC20 | Ningún color implica cumplimiento por mero link/carga; sólo resultado válido según método; insuficiencia/permiso/conflicto/ausencia distinguibles sin cero ficticio | Casos de celda/leyenda con datos reales y negativas; revisión visual humana |
| AC21 | Marcos/ediciones/filtros/celdas/procedencia/navegación respetan permisos; no conteos/targets ajenos ni truncamiento oculto | Matriz de permisos por ejes, cursores/filtros/tenant, pruebas de volumen y negativas |
| AC22 | Riesgos × Controles sólo cuando esté habilitado; presets/export sólo con binding autorizado; no Report Studio anticipado ni matrix_results | Contratos y pruebas de habilitación/deny; filtros efímeros sin autoridad persistida |
| AC23 | Metadatos/citas/versiones/rights/contexto/review/audit están preparados sin crear trabajos/recomendaciones IA ficticios | Artefactos versionados y vinculación trazable; no llamadas IA en este paso |
| AC24 | ia-engine/192.168.2.44 consta como destino futuro PO; ia2.tcdx.int sigue como referencia contractual hasta reconciliación; ninguna equivalencia/infra/conectividad inferida | Registro de discrepancia; para fase futura ADR/contrato/seguridad reales antes de runtime |
| AC25 | Etiquetas editoriales/confirmación/confianza no reemplazan result_status/domain_conclusion ni métodos; insuficiencia no es automáticamente FAIL/N/A | Casos de homologación semántica y guards con métodos vigentes; historia no recalculada |
| AC26 | No estructuras paralelas, hardcodes, deuda deliberada o pérdida de historia; slice nuevo alcanza persistencia→API→auth/audit→UI→pruebas/E2E/runtime→traza | Revisión de delta, CI/tests adecuados, evidencia QA y aceptación humana del alcance nuevo, separada de PACK PASS |

Las familias TC-REG-001, TC-CONFIG-001, TC-TENANT, TC-AUTHZ, TC-SOD, TC-IDEM y TC-CONC son contratos existentes aplicables; ACxx sólo identifica refinamientos verificables de este expediente. No crea gates oficiales nuevos. Tests locales/mocks nunca se presentan como prueba runtime. La aceptación conceptual no sustituye una prueba ni un grant; no se pide repetirla.

## Cierre documental de esta ejecución

Registro fiel D01–D09, alcance completo, soluciones mínimas o impedimentos demostrados, task packet, dependencias, criterios, trazabilidad, continuidad autocontenida y checks de preservación/integridad. Esto sí se verifica ahora en evidence/CHECKS.json y FINAL_INTEGRITY.json. No equivale a PASS de AC02–AC26 sobre software todavía no implementado.
