import type { CoverageResult, NormalizedRequirement, RegulatoryPackImportInput } from "./model.js";

function populationComplete(expected: number, imported: number, reviewed: number): boolean {
  return imported === expected && reviewed === expected;
}

export function calculateCoverage(input: RegulatoryPackImportInput, requirements: ReadonlyArray<NormalizedRequirement>): CoverageResult {
  const normativeUnitsReviewed = input.units.filter((item) => item.reviewed).length;
  const requirementsReviewed = requirements.filter((item) => item.reviewed).length;
  const referenceControlsReviewed = input.controls.filter((item) => item.reviewed).length;
  const validParentLinks = input.units.filter((item) => item.parentSourceLocator === null || input.units.some((candidate) => candidate.sourceLocator === item.parentSourceLocator)).length;
  const reviewedEditorialMappings = input.normativeUnitControlMappings.filter((item) => item.reviewed).length;
  const reviewedComplianceMappings = input.requirementControlMappings.filter((item) => item.reviewed).length;
  const complete = populationComplete(input.coverageExpected.normativeUnits, input.units.length, normativeUnitsReviewed)
    && populationComplete(input.coverageExpected.requirements, requirements.length, requirementsReviewed)
    && populationComplete(input.coverageExpected.referenceControls, input.controls.length, referenceControlsReviewed)
    && input.normativeUnitControlMappings.length === input.coverageExpected.editorialMappings
    && reviewedEditorialMappings === input.coverageExpected.editorialMappings
    && input.requirementControlMappings.length === input.coverageExpected.complianceMappings
    && reviewedComplianceMappings === input.coverageExpected.complianceMappings
    && validParentLinks === input.units.length;

  return {
    normativeUnitsExpected: input.coverageExpected.normativeUnits,
    normativeUnitsImported: input.units.length,
    normativeUnitsReviewed,
    requirementsExpected: input.coverageExpected.requirements,
    requirementsImported: requirements.length,
    requirementsReviewed,
    referenceControlsExpected: input.coverageExpected.referenceControls,
    referenceControlsImported: input.controls.length,
    referenceControlsReviewed,
    validParentLinks,
    reviewedEditorialMappings,
    reviewedComplianceMappings,
    coveragePercent: complete ? 100 : 0
  };
}
