# Ejecución 2/3 — biblioteca normativa

`NORMATIVE_LIBRARY_TECHNICAL_CLOSURE=PARTIAL`. `RECTOR_GATE=PASS` para el alcance local autorizado y verificado; no acredita cierre integral del producto. Baseline activa `TCDX_GRC_MASTER_REGENT_BASELINE_v1.12_2026-10-16`; fase `POST_STEP6A4_PRE_STEP6A5`. Ejecución 3, STEP6A5/6A6, merge, despliegues e importaciones externas no iniciados.

## Continuidad y autoridad

Entrada limpia en `256d00aed1afa14066b3b3186fe93b456d2b6e04`, rama `feat/phase6a-functional-completion-20261023`, PR27 abierto. Main `c2a774f1f55b1edc3abc347ed155c4730d18fe31`: nueve commits por delante, ninguno por detrás al reconstruir. PR26 permanece abierto/draft en `6f558f45f242068afc90e48c877e7203c0adf867`, sin cambios. No reset, force-push ni rebase.

Se leyeron AGENTS, regente46/enforcement, contratos especializados, estados y los cuatro documentos completos del expediente de ejecución1. Se verificaron sus recibos y hashes de pruebas como antecedentes, sin contarlos como ejecuciones nuevas. Ya existían pipeline canónico, seis identidades de pack, lectores/matrices, publicación única, IAM/RBAC/SoD, ticket documental, catálogo, suscripciones y entitlements. Se conservaron P1, P2, T1, P1-TX y el amendment H04 interno formalizados; no se solicitaron otra vez.

La baseline versionada activa y sus 51 entradas de integridad pasan los verificadores. No se encontró el ZIP original v1.12. El ZIP local v1.4 coincide con sus 50 archivos históricos: comparado con la baseline activa tiene 21 iguales, 29 distintos y dos documentos adicionales en la activa. No se usó v1.4 como autoridad vigente. La limitación y las diferencias exactas constan en `SOURCE_INVENTORY.json`; los contratos y sus hashes en `TRACEABILITY.json`.

## Fuentes realmente disponibles

Se inspeccionó nuevamente `/Users/andresbarouh/repos/tcdx-grc/docs/normative-sources`, incluyendo ignorados/ocultos y miembros de ambos ZIP. El paquete de revisión contiene 103 archivos y el anterior 97; los 97 comunes son idénticos. CRC y SHA de ambos verificados. Cinco PDF originales recibidos, 204 páginas procesadas de nuevo. El manifiesto interno antiguo conserva nueve rutas obsoletas: cinco hashes se localizan en otra ruta, cuatro miembros faltan; no se reparó ni alteró ningún original. El manifiesto unificado y los PDF seleccionados se verificaron por separado.

No están los cuerpos definitivos de ISO9001:2026 ni ISO9001:2015/Amd1:2024. Los 104 controles editoriales y el índice de 2026 se declaran preparatorios en el propio kit. Los kits anidados de Downloads contienen plantillas/procedimientos, no el original 2026. El amendment local de 27001 no sustituye al de 9001. Las páginas oficiales verifican metadata, no proporcionan esos cuerpos recibidos.

El PDF chileno NCh27001:2023 conserva su identidad de adopción del estándar 2022; no se etiqueta silenciosamente como original ISO. Un PDF inglés 2022 adicional permitió cotejar los 93 identificadores de Anexo A, sin afirmar equivalencia semántica o derechos. ISO42001 recibido requiere PDFium por su estructura EOF; se leyó sin modificar bytes. Páginas 8/61 sin texto extraíble se registran sin afirmar OCR o revisión visual completos.

Ley21663 conserva la versión BCN2025-03-01. Ley21719 conserva la versión diferida y la modificación21806 de2026-02-05. Su texto es una ley modificatoria: los artículos insertados permanecen bajo su artículo modificatorio; no se fabrica una consolidación íntegra de Ley19628. Una exportación independiente BCN del consolidado devolvió401 y no se eludió el acceso. Fechas por disposición quedan NULL hasta su resolución; la fecha de versión del pack no se propaga como vigencia universal.

## Implementación realizada

- Extracción reproducible con hashes de ZIP/PDF/derivado/página; jerarquías ISO, namespace del Anexo A de la adopción chilena, artículos modificatorios, bis y transitorios legales. Cuerpos completos sólo en custodia privada.
- 619 unidades con página/offset, padre y hash; revisión literal de referencias, condiciones, temporalidad, enumeraciones y duplicados. No se hallaron duplicados exactos de los 501 enunciados candidatos; eso no prueba ausencia de contradicciones semánticas.
- Los 501 enunciados permanecen como evidencia de fuente. Sólo siete obligaciones con acción evaluable y alcance explícitamente cotejados se preparan como Requirement: dos9001, uno27001, uno42001, uno21663 y dos21719. Los otros494 requieren atomización; no se materializan automáticamente como obligaciones auténticas.
- 131 Control/ControlVersion de referencia con los atributos editoriales canónicos existentes y 131 localizaciones de Anexo A; no controles tenant ni frecuencias normativas inventadas. Nueve referencias A.6 de42001 se preparan con identificadores correctos y propuestas draft de supersesión hacia los anteriores; éstos se conservan.
- Siete comparaciones específicas con fuentes en ambos extremos refinan las seis temáticas recibidas. Tipos `supports/overlaps`, alcance limitado, confianza0, reviewed=false; ninguna equivalencia o garantía de cumplimiento. Una relación Requirement→Control expresa soporte parcial de protección de registros al control documental ISMS, sin contribución numérica inventada.
- Cinco payloads privados parciales, persistidos mediante RegulatoryPackPipeline en PostgreSQL16 propio desechable. Cuatro versiones en draft y Ley21719 en review conforme al runtime existente; todas con cobertura revisada0 y sin validaciones humanas, derechos ficticios o publicación. No hay payload definitivo2026.

Se preservan íntegramente los 211 IDs originales y los 104 independientes.151 referencias coinciden literalmente con una unidad;60 requieren reconciliar su alcance. Eso no homologa las propuestas editoriales. No se crean KnowledgeItem/KnowledgeVersion a partir de candidatos sin validación ni relaciones tenant con riesgos, evidencias o procesos ficticios.

## Corrección mínima del runtime

FrameworkVersion se identifica por raíz+versión, conforme rector23/37/44 y el FK físico. El selector interno anterior sólo aceptaba edición, y rechazaba cruzar revisiones distintas de una misma edición. `targetVersionNumber` opcional permite seleccionar exactamente la versión ya modelada. Sin selector, una edición ambigua sigue DENY. Se rechazan self-target real, versiones inválidas y selectores calificados/no calificados mezclados para la misma identidad de crosswalk. Se reutiliza el generador canónico de Requirement, sin segundo algoritmo.

Cambió el input TypeScript interno y su binding/validación; no los contratos HTTP sellados, permisos, IAM, tablas, migraciones históricas, infraestructura, publicación canónica ni UI. No se identifica nueva deuda en este cambio verificado. No se certifica el contenido todavía no revisado ni se traslada su trabajo pendiente a ejecución3.

## Resultado por marco

|Marco|Unidades|Enunciados fuente|Requirements draft acotados|Controles referencia|Estado real|
|---|---:|---:|---:|---:|---|
|ISO9001:2015+Amd1:2024|104|122|2|0|Base2015 parcial; falta amendment|
|ISO9001:2026|0|0|0|0|Falta cuerpo definitivo;104 propuestas conservadas|
|ISO/IEC27001:2022|144|54|1|93|Adopción2023 cotejada; semántica integral pendiente|
|ISO/IEC42001:2023|209|73|1|38|Jerarquía recibida; nueve correcciones versionadas; semántica pendiente|
|Ley21719|90|163|2|0|Ley modificatoria; incisos, atomización y vigencias pendientes|
|Ley21663|72|89|1|0|55 artículos permanentes, seis transitorios; detalle semántico pendiente|

Los 16 criterios de cada marco se informan separadamente en `FRAMEWORK_STATUS.json`. `source-review/` contiene catálogo/revisión trazable sin cuerpos normativos. `PACKAGES_MANIFEST.json` registra hashes de los payloads privados; `POSTGRES_PREPARATION_RECEIPT.json` recoge una consulta real de la base desechable y sus identificadores locales, que no son recibos de runtime externo.

Las seis matrices pasan regresión funcional con fixtures poblados; no se atribuye ese PASS a cobertura integral de los cinco textos ni a UI operando sobre una importación externa. CI verde no convierte este resultado en completitud, homologación, aprobación, publicación ni contratabilidad.

Commit fuente: `75f377a230bf11eac003fb91b44c56b1daf00eea`. CI de ese commit: [rector-governance PASS](https://github.com/Tecdex-SpA/tcdx-grc/actions/runs/40013624129/job/120619985085). El commit sucesor consolida estos recibos documentales; su HEAD/CI se verifican después de publicarlo, sin autorreferenciar su propio SHA.
