# TCDX Unified Compliance & Control Catalog v1

Fecha: 2026-09-28

## Propósito
Paquete de conocimiento estructurado para poblar el modelo canónico TCDX GRC sin crear una arquitectura paralela. Cubre ISO 9001:2015, ISO 9001:2026, ISO/IEC 27001:2022, ISO/IEC 42001:2023 y Ley 21.719.

## Regla de licencia
Los estándares ISO no están aún licenciados por TCDX. Este paquete NO reproduce su texto normativo. Usa metadata oficial pública, identificadores/estructura públicamente documentada y resúmenes/controles authored por TCDX. Los objetos ISO se marcan NOT_YET_LICENSED/provisional y deben reconciliarse con la copia licenciada sin cambiar las identidades canónicas de negocio cuando sea posible. La Ley 21.719 usa BCN como fuente pública oficial.

## Modelo
Framework -> NormativeUnit -> Requirement -> RequirementControlMapping -> TCDX Baseline Control/ControlVersion. Los crosswalks son relaciones tipadas y no implican equivalencia automática.

## Conteos
Frameworks: 5
Normative units: 258
Requirements/reference controls: 249
TCDX baseline controls: 81
Requirement-control mappings: 1014
Requirement crosswalks: 998
Evidence expectations: 81

## Estados de fuente
- OFFICIAL_PUBLIC_SOURCE: ley/fuente oficial pública.
- OFFICIAL_PUBLIC_METADATA: metadata pública del emisor.
- PROVISIONAL_SUPPORTING_REFERENCE: estructura/resumen provisional no equivalente al texto licenciado.
- TCDX_AUTHORED: contenido propio TCDX.

## Importación
No ejecutar SQL manual. Codex debe adaptar estos datasets al mecanismo rector de seed/import/materialization existente, validar vocabularios y campos físicos, y bloquear únicamente si el contrato rector contradice un dato. La falta de licencia ISO no bloquea el desarrollo funcional; sí impide marcar el contenido como texto normativo oficial/licenciado.
