# 41 — Baseline regulatorio obligatorio desde el inicio

## 1. Decisión

TCDX GRC nace con cinco `RegulatoryPack` obligatorios, globales, versionados e inseparables del baseline de producto:

| pack_code | edición | tipo canónico | estado inicial | uso oficial |
|---|---|---|---|---|
| `ISO_9001_2015` | ISO 9001:2015 + Amd 1:2024 | requisitos de sistema de gestión de calidad | `published` tras importación licenciada y revisión | sí |
| `ISO_9001_2026` | ISO 9001:2026, edición 6 | requisitos de sistema de gestión de calidad | `prepublication` hasta publicación oficial; luego importación, revisión y `published` | no antes de publicación y validación |
| `ISO_IEC_27001_2022` | ISO/IEC 27001:2022 | requisitos ISMS + controles de referencia de Annex A | `published` tras importación licenciada y revisión | sí |
| `ISO_IEC_42001_2023` | ISO/IEC 42001:2023 | requisitos AIMS + controles de referencia de Annex A | `published` tras importación licenciada y revisión | sí |
| `CL_LEY_21719` | Ley 21.719 y texto consolidado aplicable de Ley 19.628 | obligaciones legales de protección de datos | `published`, `effective_from=2026-12-01` para las modificaciones principales | sí según fecha efectiva |

El registro de Ley 21.719 se mantiene separado de normas ISO: comparte el motor de Regulatory Packs, pero conserva `source_type=law`, jurisdicción Chile, fechas legales y citas oficiales.

Fuentes oficiales rectoras de metadatos: catálogo ISO para cada edición y Biblioteca del Congreso Nacional de Chile para Ley 21.719. El texto legal consolidado debe considerar modificaciones posteriores publicadas oficialmente; la versión nunca se obtiene de blogs o resúmenes.

## 2. Cobertura completa obligatoria

Cada edición debe incluir el 100% de la estructura y contenido aplicable de la fuente autorizada, separando:

- `NormativeUnit` jerárquicas con identidad editorial estable;
- Requirements atómicos evaluables contenidos en las unidades correspondientes;
- controles de referencia cuando la fuente los contenga;
- applicability, evidencias esperadas y preguntas de evaluación;
- mappings `RequirementControlMapping` versionados;
- cláusulas transitorias, fecha de publicación, vigencia y reemplazo;
- checksum, licencia/provenance, fuente oficial y responsable de revisión;
- manifiesto de cobertura con conteos esperados/importados/revisados y coverage separados para NormativeUnit, Requirements y controles de referencia.

Un pack sólo puede pasar a `published` si cada población aplicable tiene `coverage_percent=100`, no tiene identificadores duplicados, todas las relaciones padre-hijo son válidas, todo Requirement referencia una NormativeUnit válida y fue aprobado por los roles exigidos.

## 3. Regla de propiedad intelectual y exactitud

La base rectora no reproduce texto protegido de las normas ISO ni permite que IA lo reconstruya. Los contenidos completos se importan exclusivamente desde copias licenciadas aportadas por Tecdex o una fuente autorizada. El sistema conserva identificadores, estructura, metadatos, referencias y hashes; el texto se gobierna conforme a la licencia.

No se considera “incorporado” un estándar porque exista un nombre de pack. La incorporación se completa sólo con el manifiesto de cobertura al 100% y el gate `REGULATORY_PACK_<CODE>=PASS`.

## 4. ISO 9001:2026

A la fecha de este baseline (2026-09-15), ISO informa la edición 6 como `under publication`, con reemplazo previsto de ISO 9001:2015 el 2026-09-16. Por ello:

1. se crea desde el modelo físico como FrameworkVersion independiente;
2. permanece no seleccionable para evaluaciones oficiales mientras esté `prepublication`;
3. al publicarse, se carga sólo desde copia licenciada definitiva;
4. se construye crosswalk 2015→2026 sin fusionar identidades;
5. tenants mantienen historia 2015 y adoptan 2026 explícitamente durante la transición;
6. ningún borrador DIS/FDIS se trata como texto definitivo.

Esto es una política cerrada; no queda una decisión de producto pendiente.

## 5. Controles base de producto

Los controles de Annex A de ISO/IEC 27001 e ISO/IEC 42001 se representan como `Control/ControlVersion` globales `regulatory_reference`, se ubican mediante `NormativeUnitControlMapping` y se vinculan a Requirements mediante `RequirementControlMapping` sólo cuando exista una relación de cumplimiento justificada. No se fabrican Requirements para alojarlos. Para ISO 9001 y Ley 21.719, que expresan requisitos/obligaciones y no un catálogo equivalente de controles, TCDX mantiene controles `tcdx_baseline` derivados y trazables; nunca se etiqueta como “control textual de la norma” algo que la fuente no denomina así.

Todo control base declara: origen, código, versión, objetivo, tipo (`preventive|detective|corrective|directive`), naturaleza (`manual|automated|hybrid`), frecuencia, evidencia mínima, owner-role sugerido, Requirements relacionados y estado. Los controles `tenant_instantiated` se crean desde una versión global mediante `based_on_control_version_id`, sin mutar ni presentar el control global como implementado.

## 6. Roles de aprobación de packs

- `Regulatory Content Steward`: importa y mantiene estructura/provenance.
- `Compliance Manager`: revisa requisitos y mappings.
- `CISO/Security Manager`: coaprueba ISO/IEC 27001.
- `AI Governance Manager`: coaprueba ISO/IEC 42001.
- `Quality Manager`: coaprueba ISO 9001.
- `Privacy Manager` y `Legal Reviewer`: coaprueban Ley 21.719.
- `GRC Manager`: publica una versión que ya superó validaciones.

El autor/importador no puede ser el único aprobador.

## 7. Gates

Ninguna evaluación oficial, score, SoA o declaración de readiness usa un pack sin:

`REGULATORY_PACK_<CODE>=PASS`

El desarrollo de la plataforma no se bloquea por falta del texto licenciado, porque el esquema y los flujos se construyen primero. Sí queda bloqueada la publicación y utilización oficial del pack afectado.
