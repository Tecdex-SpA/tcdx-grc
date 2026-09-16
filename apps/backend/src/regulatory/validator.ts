import { FoundationError } from "../errors.js";
import { calculateCoverage } from "./coverage.js";
import { hashCanonical, sha256 } from "./hash.js";
import type {
  ApprovalRole,
  NormalizedRegulatoryPack,
  NormalizedRequirement,
  PackCandidateState,
  RegulatoryPackCode,
  RegulatoryPackImportInput
} from "./model.js";

const SHA256 = /^[a-f0-9]{64}$/;
const ISO_PACKS = new Set<RegulatoryPackCode>(["ISO_9001_2015", "ISO_9001_2026", "ISO_IEC_27001_2022", "ISO_IEC_42001_2023"]);
const REFERENCE_CONTROL_PACKS = new Set<RegulatoryPackCode>(["ISO_IEC_27001_2022", "ISO_IEC_42001_2023"]);
const RELATIONSHIP_TYPES = new Set(["equivalent", "partially_equivalent", "overlaps", "supports", "supersedes", "no_match"]);

function fail(message: string, details?: Record<string, unknown>): never {
  throw new FoundationError("TCDX.REGULATORY.IMPORT_INVALID", message, 400, false, details);
}

function assertSha256(value: string, field: string): void {
  if (!SHA256.test(value)) fail(`${field} must be a lowercase SHA-256`, { field });
}

function assertUnique(values: ReadonlyArray<string>, population: string): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) fail(`Duplicate ${population} identifiers`, { population, duplicates: [...new Set(duplicates)] });
}

function assertContentPair(content: string | null, reference: string | null, field: string): void {
  if ((content === null) === (reference === null)) fail(`${field} requires exactly one licensed content value or reference`, { field });
}

function generatedRequirementCode(sourceLocator: string, ordinal: number): string {
  return `REQ-${sha256(`${sourceLocator}#${ordinal}`).slice(0, 24).toUpperCase()}`;
}

function normalizeRequirements(input: RegulatoryPackImportInput): ReadonlyArray<NormalizedRequirement> {
  const normalized = input.requirements.map((requirement) => ({
    ...requirement,
    requirementCode: requirement.requirementCode ?? generatedRequirementCode(requirement.sourceLocator, requirement.statementOrdinal)
  }));
  assertUnique(normalized.map((item) => item.requirementCode), "requirement");
  return normalized;
}

function validateHierarchy(input: RegulatoryPackImportInput): void {
  const byLocator = new Map(input.units.map((unit) => [unit.sourceLocator, unit]));
  for (const unit of input.units) {
    if (unit.parentSourceLocator !== null && !byLocator.has(unit.parentSourceLocator)) fail("NormativeUnit parent is missing", { sourceLocator: unit.sourceLocator });
    if (unit.parentSourceLocator === unit.sourceLocator) fail("NormativeUnit cannot parent itself", { sourceLocator: unit.sourceLocator });
    const visited = new Set<string>();
    let cursor: typeof unit | undefined = unit;
    while (cursor && cursor.parentSourceLocator !== null) {
      if (visited.has(cursor.sourceLocator)) fail("NormativeUnit hierarchy contains a cycle", { sourceLocator: unit.sourceLocator });
      visited.add(cursor.sourceLocator);
      cursor = byLocator.get(cursor.parentSourceLocator);
    }
  }
}

function requiredApprovalRoles(packCode: RegulatoryPackCode): ReadonlySet<ApprovalRole> {
  const roles = new Set<ApprovalRole>(["REGULATORY_CONTENT_STEWARD", "COMPLIANCE_MANAGER", "GRC_MANAGER"]);
  if (packCode === "ISO_9001_2015" || packCode === "ISO_9001_2026") roles.add("QUALITY_MANAGER");
  if (packCode === "ISO_IEC_27001_2022") roles.add("CISO_SECURITY_MANAGER");
  if (packCode === "ISO_IEC_42001_2023") roles.add("AI_GOVERNANCE_MANAGER");
  if (packCode === "CL_LEY_21719") {
    roles.add("PRIVACY_MANAGER");
    roles.add("LEGAL_REVIEWER");
  }
  return roles;
}

export function candidateState(input: RegulatoryPackImportInput, coveragePercent: number): PackCandidateState {
  if (!input.source.authorized) return "BLOCKED_SOURCE_UNAVAILABLE";
  if (input.packCode === "ISO_9001_2026" && !input.source.definitivePublication) return "BLOCKED_PUBLICATION_UNAVAILABLE";
  if (ISO_PACKS.has(input.packCode) && input.source.origin !== "licensed_file") return "BLOCKED_LICENSE";
  if (coveragePercent !== 100) return "BLOCKED_CONTRACT_DECISION";
  const presentRoles = new Set(input.approvals.map((approval) => approval.role));
  if ([...requiredApprovalRoles(input.packCode)].some((role) => !presentRoles.has(role))) return "BLOCKED_HUMAN_REVIEW";
  const distinctApprovers = new Set(input.approvals.map((approval) => approval.userIdentityId));
  if (distinctApprovers.size < 2 || (distinctApprovers.size === 1 && distinctApprovers.has(input.importedByUserIdentityId))) return "BLOCKED_HUMAN_REVIEW";
  return "CANDIDATE_READY_FOR_HUMAN_REVIEW";
}

export function importChecksumPayload(input: RegulatoryPackImportInput): Omit<RegulatoryPackImportInput, "importChecksum" | "approvals"> {
  const { importChecksum: _checksum, approvals: _approvals, ...payload } = input;
  return payload;
}

export function calculateImportChecksum(input: RegulatoryPackImportInput): string {
  return hashCanonical(importChecksumPayload(input));
}

export function validateAndNormalize(input: RegulatoryPackImportInput): NormalizedRegulatoryPack {
  assertSha256(input.importChecksum, "importChecksum");
  assertSha256(input.source.sourceChecksum, "source.sourceChecksum");
  if (calculateImportChecksum(input) !== input.importChecksum) fail("Import checksum does not match the canonical source payload");
  if (!Number.isSafeInteger(input.versionNumber) || input.versionNumber < 1) fail("versionNumber must be a positive integer");
  if (!input.source.authorized) fail("Regulatory source is not authorized");
  if (ISO_PACKS.has(input.packCode) && input.source.origin !== "licensed_file") fail("Protected ISO content requires a licensed file");
  if (input.packCode === "ISO_9001_2026" && !input.source.definitivePublication) fail("ISO 9001:2026 definitive publication is unavailable");
  if (input.packCode === "CL_LEY_21719") {
    if (input.source.sourceType !== "law" || input.source.publisher !== "Biblioteca del Congreso Nacional de Chile" || input.source.origin !== "official_source") {
      fail("CL_LEY_21719 requires the official Biblioteca del Congreso Nacional source");
    }
    if (input.effectiveFrom !== "2026-12-01T00:00:00.000Z") fail("CL_LEY_21719 principal amendments require the governed effective date");
  } else if (input.source.sourceType !== "standard") {
    fail("ISO packs require a standard source type");
  }

  assertUnique(input.units.map((item) => item.sourceLocator), "NormativeUnit");
  assertUnique(input.controls.map((item) => item.controlCode), "Control");
  assertUnique(input.approvals.map((item) => item.role), "approval role");
  validateHierarchy(input);

  for (const unit of input.units) {
    if (!Number.isSafeInteger(unit.displayOrder) || unit.displayOrder < 0) fail("NormativeUnit displayOrder must be a nonnegative integer", { sourceLocator: unit.sourceLocator });
    assertContentPair(unit.licensedContent, unit.licensedContentRef, `NormativeUnit ${unit.sourceLocator}`);
    assertSha256(unit.contentHash, `NormativeUnit ${unit.sourceLocator} contentHash`);
    if (unit.provenanceRef.length === 0) fail("NormativeUnit provenance is required", { sourceLocator: unit.sourceLocator });
  }

  const requirements = normalizeRequirements(input);
  const unitLocators = new Set(input.units.map((item) => item.sourceLocator));
  for (const requirement of requirements) {
    if (!unitLocators.has(requirement.normativeUnitSourceLocator)) fail("Requirement is orphaned", { requirementCode: requirement.requirementCode });
    if (!Number.isSafeInteger(requirement.statementOrdinal) || requirement.statementOrdinal < 1) fail("Requirement statementOrdinal must be positive", { requirementCode: requirement.requirementCode });
    assertContentPair(requirement.licensedStatement, requirement.licensedContentRef, `Requirement ${requirement.requirementCode}`);
    assertSha256(requirement.contentHash, `Requirement ${requirement.requirementCode} contentHash`);
  }

  const expectedOrigin = REFERENCE_CONTROL_PACKS.has(input.packCode) ? "regulatory_reference" : "tcdx_baseline";
  for (const control of input.controls) {
    if (control.origin !== expectedOrigin) fail("Control origin does not match the governed pack semantics", { controlCode: control.controlCode, expectedOrigin });
  }

  const requirementCodes = new Set(requirements.map((item) => item.requirementCode));
  const controlCodes = new Set(input.controls.map((item) => item.controlCode));
  for (const mapping of input.requirementControlMappings) {
    if (!requirementCodes.has(mapping.requirementCode) || !controlCodes.has(mapping.controlCode)) fail("RequirementControlMapping contains an invalid typed reference");
  }
  for (const mapping of input.normativeUnitControlMappings) {
    if (!unitLocators.has(mapping.normativeUnitSourceLocator) || !controlCodes.has(mapping.controlCode)) fail("NormativeUnitControlMapping contains an invalid typed reference");
  }

  for (const crosswalk of input.crosswalks) {
    if (crosswalk.targetFrameworkCode === input.frameworkCode && crosswalk.targetEdition === input.edition) fail("Framework crosswalk cannot target itself");
    for (const mapping of crosswalk.mappings) {
      if (!RELATIONSHIP_TYPES.has(mapping.relationshipType)) fail("Crosswalk relationship type is invalid");
      if ((mapping.relationshipType === "no_match") !== (mapping.targetCode === null)) fail("Crosswalk target must be null exactly for no_match");
      if (mapping.confidence < 0 || mapping.confidence > 1) fail("Crosswalk confidence must be between zero and one");
      const sourceSet = mapping.objectType === "normative_unit" ? unitLocators : mapping.objectType === "requirement" ? requirementCodes : controlCodes;
      if (!sourceSet.has(mapping.sourceCode)) fail("Crosswalk source is not a typed member of the source framework", { sourceCode: mapping.sourceCode });
    }
  }

  const coverage = calculateCoverage(input, requirements);
  const contentHash = hashCanonical({
    sourceChecksum: input.source.sourceChecksum,
    units: input.units,
    requirements,
    controls: input.controls,
    requirementControlMappings: input.requirementControlMappings,
    normativeUnitControlMappings: input.normativeUnitControlMappings,
    crosswalks: input.crosswalks
  });
  return { ...input, requirements, coverage, contentHash };
}
