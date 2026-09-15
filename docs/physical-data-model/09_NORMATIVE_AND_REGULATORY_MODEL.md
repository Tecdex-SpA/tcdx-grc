# Modelo normativo y regulatorio

## Estructura autoritativa

```text
RegulatorySource
→ RegulatoryImportManifest
→ RegulatoryPack → RegulatoryPackVersion
→ RegulatoryPackFrameworkVersion
→ Framework → FrameworkVersion
→ NormativeUnit hierarchy
→ Requirement
→ RequirementApplicability → RequirementAssessment
→ Issue → Action → Verification
```

Controles:

```text
NormativeUnit ── NormativeUnitControlMapping ──> ControlVersion (referencia editorial)
Requirement ── RequirementControlMapping ──> ControlVersion (contribución)
Control → ControlVersion → ControlAssessment / AssuranceTest → Evidence
```

NormativeUnit, Requirement, Control, Issue y Action tienen tablas/IDs/business keys distintos. Clause es sólo `unit_type`; no existe tabla Clause. NormativeUnit no tiene tenant assessment, result_status ni evidence directa.

## Ownership

- Fuentes globales/licenciadas: FrameworkVersion/NormativeUnit/Requirement GLOBAL_REFERENCE.
- Baseline TCDX: PLATFORM_CONTROL.
- Contrato/policy privada: TENANT_OWNED con tenant heredado/coherente.
- Applicability, assessments y SoA: siempre TENANT_OWNED.
- Controles reference/baseline globales no representan implementación; `tenant_instantiated`/`tenant_defined` son Control tenant-owned.

## Jerarquía y atomicidad

NormativeUnit usa parent de misma FrameworkVersion, orden determinístico, locator estable y prohibición de ciclos. Requirement tiene una unidad primaria exacta; si la fuente no da código, el importador produce código determinístico locator+ordinal y exige revisión humana antes de publicar. Ediciones no reusan identidades ni reescriben historia.

## Applicability y SoA

RequirementApplicability tiene tenant + Requirement + scope Subject opcional + version/validity. NULL scope significa tenant-wide. Una fila por scope; no arrays ni pares type/id.

StatementOfApplicabilityItem pertenece a SoA versionada y referencia ControlVersion de referencia, decisión/justificación, implementation state y Control/ControlVersion tenant opcional. No reemplaza applicability de Requirement.

## Crosswalks

FrameworkCrosswalk declara source/target FrameworkVersion. Tres tablas de item separan NormativeUnit, Requirement y ControlVersion. Cada item tipa relationship, direction, rationale, confidence, provenance, reviewer/status. Target sólo es NULL para `no_match`. No fusiona identidades ni copia assessments.

## Packs iniciales y publicación

Los cinco códigos de 41 se representan desde el modelo; ningún contenido protegido se inventa. Publicación exige import autorizado, coverage manifest con 100% separado para units/requirements/reference controls, integridad de jerarquía, ausencia de duplicados y aprobaciones por roles. ISO 9001:2026 permanece prepublication hasta fuente definitiva/autorizada.

`REGULATORY_PACK_<CODE>=PASS` es independiente por pack y no se registra en estas tablas como autoaprobación de diseño.
