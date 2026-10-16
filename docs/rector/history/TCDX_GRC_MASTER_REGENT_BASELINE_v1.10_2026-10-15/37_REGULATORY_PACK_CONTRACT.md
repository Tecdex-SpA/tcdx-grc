# 37 - Contrato canónico de Regulatory Packs

## 1. Propósito

Permitir ISO, NIST, leyes, regulación sectorial, contratos y políticas internas sin crear schemas, motores o semánticas paralelas.

## 2. Contenido

Un `RegulatoryPackVersion` publicado puede contener: Framework/Version; jerarquía `NormativeUnit`; Requirements atómicos; applicability guidance; controles de referencia y mappings diferenciados; evidence expectations; metric/rule mappings; assessment methodology references; crosswalks; jurisdiction/sector metadata; source citations; effective dates; supersession relations; reporting templates.

Para los packs obligatorios de 41, “puede contener” se interpreta como “debe contener cuando la fuente lo exija o el manifiesto lo declare”. La cobertura completa se prueba mediante `RegulatoryCoverageManifest`.

## 3. Invariantes

- NormativeUnit tiene identidad y jerarquía estable dentro de una FrameworkVersion; la jerarquía no admite ciclos.
- Requirement tiene identidad estable, pertenece a una NormativeUnit primaria y representa una obligación evaluable, no una cláusula ni una brecha.
- NormativeUnit estructural no recibe applicability, assessment ni conclusion tenant.
- RequirementControlMapping y NormativeUnitControlMapping poseen propósitos distintos conforme a 44.
- Una nueva edición crea nueva versión; no muta la publicada.
- FrameworkCrosswalk identifica versiones fuente/destino; sus mappings tipados expresan equivalencia/overlap/supersession con dirección, rationale y confianza, sin fusionar NormativeUnit, Requirements ni Controls.
- Applicability es tenant-owned y no modifica el pack global.
- Un pack no puede introducir cálculo fuera de Metric/Calculation/Rule contracts.
- Un pack no puede crear permissions ni lifecycle alternativos.

## 4. Estados

Pack: `prepublication -> draft -> review -> approved -> published -> deprecated -> retired`. `prepublication` sólo se usa para una edición oficialmente anunciada aún no publicada. Sólo `published` es seleccionable para evaluación oficial.

## 5. Baseline vinculante

Los packs, roles de aprobación, fuentes y gates obligatorios quedan definidos en 41. Ese documento complementa este contrato y no permite packs nominales o parciales.

## 6. Actualización regulatoria

RegulatoryChange propone impacto entre versiones. La adopción por tenant es explícita cuando corresponda; la historia de assessments conserva la versión evaluada.

## 7. Contenido asistido por IA

IA puede sugerir mappings/crosswalks, pero éstos permanecen draft hasta revisión/aprobación humana.

## 8. Autoridad estructural

La estructura `FrameworkVersion → NormativeUnit → Requirement` y la distinción entre controles de referencia y controles tenant se rigen exclusivamente por 44. Ningún importador puede inferir un Requirement por cada heading ni fabricar Requirements para representar un catálogo de controles.
