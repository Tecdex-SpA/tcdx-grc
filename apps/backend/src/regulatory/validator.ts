import { REGULATORY_PACK_CODES } from "./model.js";
import { FoundationError } from "../errors.js";
import { calculateCoverage } from "./coverage.js";
import { hashCanonical, sha256 } from "./hash.js";
import type {
  ApprovalRole,
  RegulatoryAssertionKind,
  RegulatoryExecutionContext,
  RegulatoryExecutionEnvelope,
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
const TEST_SOURCE_ROLES = new Set(["official_metadata", "provisional_supporting_reference", "supporting_reference", "test_data_source"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if ((content ?? reference)?.trim().length === 0) fail(`${field} cannot be blank`, { field });
}

function validateInterval(value: { effectiveFrom?: string | null; effectiveTo?: string | null }, field: string): void {
  for (const timestamp of [value.effectiveFrom, value.effectiveTo]) {
    if (timestamp != null && (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) || !Number.isFinite(Date.parse(timestamp)))) {
      fail(`${field} requires a valid timestamp with timezone`);
    }
  }
  if (value.effectiveFrom != null && value.effectiveTo != null && Date.parse(value.effectiveTo) <= Date.parse(value.effectiveFrom)) {
    fail(`${field} effective interval must be increasing`);
  }
}

export function generatedRequirementCode(sourceLocator: string, ordinal: number): string {
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
  if (input.governance.authorityClass === "NON_AUTHORITATIVE_TEST_PACK") return "BLOCKED_LICENSE";
  if (!input.source.authorized) return "BLOCKED_SOURCE_UNAVAILABLE";
  if (input.packCode === "ISO_9001_2026" && !input.source.definitivePublication) return "BLOCKED_PUBLICATION_UNAVAILABLE";
  if (ISO_PACKS.has(input.packCode) && input.source.origin !== "licensed_file") return "BLOCKED_LICENSE";
  if (coveragePercent !== 100) return "BLOCKED_CONTRACT_DECISION";
  if (input.units.length === 0 || input.requirements.length === 0) return "BLOCKED_CONTRACT_DECISION";
  if (input.crosswalks.some(crosswalk => !crosswalk.reviewed || crosswalk.mappings.some(mapping => !mapping.reviewed))) return "BLOCKED_HUMAN_REVIEW";
  const presentRoles = new Set(input.approvals.map((approval) => approval.role));
  if ([...requiredApprovalRoles(input.packCode)].some((role) => !presentRoles.has(role))) return "BLOCKED_HUMAN_REVIEW";
  const distinctApprovers = new Set(input.approvals.map((approval) => approval.userIdentityId));
  if (distinctApprovers.size < 2 || (distinctApprovers.size === 1 && distinctApprovers.has(input.importedByUserIdentityId))) return "BLOCKED_HUMAN_REVIEW";
  return "CANDIDATE_READY_FOR_HUMAN_REVIEW";
}

function validateGovernance(input: RegulatoryPackImportInput): void {
  const governance = input.governance;
  if (!["AUTHORIZED_NORMATIVE_SOURCE", "NON_AUTHORITATIVE_TEST_PACK"].includes(governance.authorityClass)) fail("Unknown regulatory authority class");
  if (!["licensed_file", "official_source", "received_preliminary_file"].includes(input.source.origin)) fail("Unknown source origin");
  if (input.source.origin === "received_preliminary_file" && governance.authorityClass !== "NON_AUTHORITATIVE_TEST_PACK") fail("Received preliminary files cannot claim normative authority");
  if (governance.sourceRoles.length === 0 || new Set(governance.sourceRoles).size !== governance.sourceRoles.length) {
    fail("Regulatory source roles must be present and unique");
  }
  if ([governance.provenance, governance.contentScope, governance.coverageScope].some((value) => value.trim().length === 0)) {
    fail("Regulatory governance provenance and scopes are required");
  }
  if (governance.authorityClass === "AUTHORIZED_NORMATIVE_SOURCE") {
    if (!input.source.authorized || !governance.sourceRoles.includes("authorized_normative_source")) {
      fail("Authorized normative authority requires an authorized normative source role");
    }
    return;
  }
  if (input.packCode === "CL_LEY_21719") fail("CL_LEY_21719 official source cannot be classified as a test pack");
  if (input.source.authorized) fail("A non-authoritative test pack cannot mark its source as authorized normative content");
  if (input.source.origin === "licensed_file") fail("A non-authoritative test pack cannot transform licensed content authority");
  if (input.source.licenseClassification !== "non_authoritative_test_pack") {
    fail("A non-authoritative test pack requires the persisted non_authoritative_test_pack license classification");
  }
  if (!governance.devDemoExecutionEligible || governance.commercialPublicationEligible || governance.certificationAssertionEligible) {
    fail("A non-authoritative test pack must be DEV/DEMO-only and prohibit commercial and certification assertions");
  }
  if (governance.sourceRoles.includes("authorized_normative_source") || !governance.sourceRoles.some((role) => TEST_SOURCE_ROLES.has(role))) {
    fail("A non-authoritative test pack requires a supporting/test source role and cannot claim normative authority");
  }
}

export function importChecksumPayload(input: RegulatoryPackImportInput): Omit<RegulatoryPackImportInput, "importChecksum" | "approvals"> {
  const { importChecksum: _checksum, approvals: _approvals, ...payload } = input;
  return payload;
}

export function calculateImportChecksum(input: RegulatoryPackImportInput): string {
  return hashCanonical(importChecksumPayload(input));
}

export function validateAndNormalize(input: RegulatoryPackImportInput): NormalizedRegulatoryPack {
  if (!REGULATORY_PACK_CODES.includes(input.packCode)) fail("Unknown regulatory pack code");
  assertSha256(input.importChecksum, "importChecksum");
  assertSha256(input.source.sourceChecksum, "source.sourceChecksum");
  if (calculateImportChecksum(input) !== input.importChecksum) fail("Import checksum does not match the canonical source payload");
  if (!Number.isSafeInteger(input.versionNumber) || input.versionNumber < 1) fail("versionNumber must be a positive integer");
  for (const [field, value] of Object.entries({ packName: input.packName, edition: input.edition, frameworkCode: input.frameworkCode,
    frameworkName: input.frameworkName, sourceCode: input.source.sourceCode, publisher: input.source.publisher, officialUri: input.source.officialUri })) {
    if (typeof value !== "string" || value.trim().length === 0) fail(`${field} must be nonblank`);
  }
  validateInterval(input, "RegulatoryPackVersion");
  for (const expected of Object.values(input.coverageExpected)) {
    if (!Number.isSafeInteger(expected) || expected < 0) fail("Coverage expectations must be nonnegative integers");
  }
  validateGovernance(input);
  const authorizedNormativeSource = input.governance.authorityClass === "AUTHORIZED_NORMATIVE_SOURCE";
  if (authorizedNormativeSource && ISO_PACKS.has(input.packCode) && input.source.origin !== "licensed_file") fail("Protected ISO content requires a licensed file");
  if (authorizedNormativeSource && input.packCode === "ISO_9001_2026" && !input.source.definitivePublication) fail("ISO 9001:2026 definitive publication is unavailable");
  if (input.packCode === "CL_LEY_21719") {
    if (input.source.sourceType !== "law" || input.source.publisher !== "Biblioteca del Congreso Nacional de Chile" || input.source.origin !== "official_source") {
      fail("CL_LEY_21719 requires the official Biblioteca del Congreso Nacional source");
    }
    if (input.effectiveFrom !== "2026-12-01T00:00:00.000Z") fail("CL_LEY_21719 principal amendments require the governed effective date");
  } else if (input.packCode === "CL_LEY_21663") {
    if (input.source.sourceType !== "law") fail("CL_LEY_21663 requires a law source");
    if (authorizedNormativeSource && (input.source.origin !== "official_source" || !input.source.definitivePublication)) fail("CL_LEY_21663 official use requires an authentic definitive legal source");
    if (!input.edition.trim() || !input.source.publisher.trim() || !input.source.officialUri.trim() || input.effectiveFrom === null || !Number.isFinite(Date.parse(input.effectiveFrom))) fail("CL_LEY_21663 source edition and temporal metadata must be resolved");
  } else if (input.source.sourceType !== "standard") {
    fail("ISO packs require a standard source type");
  }

  assertUnique(input.units.map((item) => item.sourceLocator), "NormativeUnit");
  assertUnique(input.controls.map((item) => item.controlCode), "Control");
  assertUnique(input.approvals.map((item) => item.role), "approval role");
  assertUnique(input.requirements.map((item) => JSON.stringify([item.sourceLocator, item.statementOrdinal])), "requirement source statement");
  for (const approval of input.approvals) {
    if (!UUID.test(approval.userIdentityId) || !approval.approvalRef.trim()) fail("Approval requires an identity and evidence reference");
  }
  validateHierarchy(input);

  for (const unit of input.units) {
    validateInterval(unit, `NormativeUnit ${unit.sourceLocator}`);
    if (!Number.isSafeInteger(unit.displayOrder) || unit.displayOrder < 0) fail("NormativeUnit displayOrder must be a nonnegative integer", { sourceLocator: unit.sourceLocator });
    assertContentPair(unit.licensedContent, unit.licensedContentRef, `NormativeUnit ${unit.sourceLocator}`);
    assertSha256(unit.contentHash, `NormativeUnit ${unit.sourceLocator} contentHash`);
    if (unit.provenanceRef.length === 0) fail("NormativeUnit provenance is required", { sourceLocator: unit.sourceLocator });
  }

  const requirements = normalizeRequirements(input);
  const unitLocators = new Set(input.units.map((item) => item.sourceLocator));
  for (const requirement of requirements) {
    validateInterval(requirement, `Requirement ${requirement.requirementCode}`);
    if (!unitLocators.has(requirement.normativeUnitSourceLocator)) fail("Requirement is orphaned", { requirementCode: requirement.requirementCode });
    if (!Number.isSafeInteger(requirement.statementOrdinal) || requirement.statementOrdinal < 1) fail("Requirement statementOrdinal must be positive", { requirementCode: requirement.requirementCode });
    assertContentPair(requirement.licensedStatement, requirement.licensedContentRef, `Requirement ${requirement.requirementCode}`);
    assertSha256(requirement.contentHash, `Requirement ${requirement.requirementCode} contentHash`);
    if (!requirement.provenanceRef.trim()) fail("Requirement provenance is required");
  }

  const expectedOrigin = REFERENCE_CONTROL_PACKS.has(input.packCode) ? "regulatory_reference" : "tcdx_baseline";
  for (const control of input.controls) {
    if (!Number.isSafeInteger(control.versionNumber) || control.versionNumber < 1) fail("Control version must be a positive integer");
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

  assertUnique(input.crosswalks.map(crosswalk => JSON.stringify([crosswalk.targetFrameworkCode, crosswalk.targetEdition, crosswalk.targetVersionNumber ?? null, crosswalk.versionNumber])), "framework crosswalk version");
  for (const crosswalk of input.crosswalks) {
    if (input.crosswalks.some(other => other !== crosswalk && other.targetFrameworkCode === crosswalk.targetFrameworkCode
      && other.targetEdition === crosswalk.targetEdition && other.versionNumber === crosswalk.versionNumber
      && (other.targetVersionNumber === undefined || crosswalk.targetVersionNumber === undefined))) {
      fail("Crosswalk cannot mix qualified and unqualified selectors for the same target edition and crosswalk version");
    }
  }
  for (const crosswalk of input.crosswalks) {
    if (!Number.isSafeInteger(crosswalk.versionNumber) || crosswalk.versionNumber < 1) fail("Crosswalk version must be a positive integer");
    if (crosswalk.targetVersionNumber !== undefined && (!Number.isSafeInteger(crosswalk.targetVersionNumber) || crosswalk.targetVersionNumber < 1)) fail("Crosswalk target version must be a positive integer");
    validateInterval(crosswalk, "FrameworkCrosswalk");
    if (!["source_to_target", "target_to_source", "bidirectional"].includes(crosswalk.direction)) fail("Crosswalk direction is invalid");
    if (!crosswalk.targetFrameworkCode.trim() || !crosswalk.targetEdition.trim() || !crosswalk.provenanceRef.trim()) fail("Crosswalk target edition and provenance are required");
    assertUnique(crosswalk.mappings.map(mapping => JSON.stringify([mapping.objectType, mapping.sourceCode, mapping.targetCode])), "crosswalk relation");
    if (crosswalk.targetFrameworkCode === input.frameworkCode && crosswalk.targetEdition === input.edition
      && (crosswalk.targetVersionNumber === undefined || crosswalk.targetVersionNumber === input.versionNumber)) fail("Framework crosswalk cannot target itself");
    for (const mapping of crosswalk.mappings) {
      if (!Number.isSafeInteger(mapping.versionNumber) || mapping.versionNumber < 1 || !mapping.effectiveFrom) fail("Crosswalk relation requires its version and effective timestamp");
      validateInterval(mapping, "Crosswalk mapping");
      if (!["normative_unit", "requirement", "control"].includes(mapping.objectType)) fail("Crosswalk object type is invalid");
      if (!mapping.rationale.trim() || !mapping.provenanceRef?.trim()) fail("Crosswalk relation rationale and provenance are required");
      if (!RELATIONSHIP_TYPES.has(mapping.relationshipType)) fail("Crosswalk relationship type is invalid");
      if ((mapping.relationshipType === "no_match") !== (mapping.targetCode === null)) fail("Crosswalk target must be null exactly for no_match");
      if (!Number.isFinite(mapping.confidence) || mapping.confidence < 0 || mapping.confidence > 1) fail("Crosswalk confidence must be between zero and one");
      const sourceSet = mapping.objectType === "normative_unit" ? unitLocators : mapping.objectType === "requirement" ? requirementCodes : controlCodes;
      if (!sourceSet.has(mapping.sourceCode)) fail("Crosswalk source is not a typed member of the source framework", { sourceCode: mapping.sourceCode });
    }
  }

  const coverage = calculateCoverage(input, requirements);
  const contentHash = hashCanonical({
    source: input.source,
    governance: input.governance,
    units: input.units,
    requirements,
    controls: input.controls,
    requirementControlMappings: input.requirementControlMappings,
    normativeUnitControlMappings: input.normativeUnitControlMappings,
    crosswalks: input.crosswalks
  });
  return { ...input, requirements, coverage, contentHash };
}

export function authorizeRegulatoryExecution(input: RegulatoryPackImportInput, context: RegulatoryExecutionContext): RegulatoryExecutionEnvelope {
  validateAndNormalize(input);
  if (!UUID.test(context.tenantId) || context.tenantAccountClassification.tenantId !== context.tenantId) {
    fail("Regulatory execution tenant classification must belong to the active tenant");
  }
  if (context.tenantAccountClassification.selectedLayerId.length === 0 || context.tenantAccountClassification.layerIds.length === 0) {
    fail("Regulatory execution requires EffectiveConfiguration lineage for tenant classification");
  }
  const testPack = input.governance.authorityClass === "NON_AUTHORITATIVE_TEST_PACK";
  if (testPack && context.runtimeEnvironment === "production") {
    throw new FoundationError("TCDX.REGULATORY.TEST_PACK_PRODUCTION_BLOCKED", "Non-authoritative test packs cannot execute in production", 403);
  }
  if (testPack && !["demo", "test"].includes(context.tenantAccountClassification.value)) {
    throw new FoundationError("TCDX.REGULATORY.TEST_PACK_COMMERCIAL_TENANT_BLOCKED", "Non-authoritative test packs require an explicitly classified demo/test tenant", 403);
  }
  const executionPurpose = testPack ? "functional_test" : "governed";
  return {
    packCode: input.packCode,
    importChecksum: input.importChecksum,
    sourceChecksum: input.source.sourceChecksum,
    authorityClass: input.governance.authorityClass,
    sourceRoles: input.governance.sourceRoles,
    authorizedNormativeSource: input.source.authorized,
    executionContext: {
      runtimeEnvironment: context.runtimeEnvironment,
      tenantId: context.tenantId,
      tenantAccountClassification: context.tenantAccountClassification.value,
      configurationSelectedLayerId: context.tenantAccountClassification.selectedLayerId,
      configurationLayerIds: context.tenantAccountClassification.layerIds
    },
    resultProvenance: {
      packCode: input.packCode,
      importChecksum: input.importChecksum,
      sourceChecksum: input.source.sourceChecksum,
      authorityClass: input.governance.authorityClass,
      sourceRoles: input.governance.sourceRoles,
      governanceProvenance: input.governance.provenance,
      executionPurpose
    },
    commercialAssertionAllowed: input.governance.commercialPublicationEligible && !testPack,
    certificationAssertionAllowed: input.governance.certificationAssertionEligible && !testPack
  };
}

export function assertRegulatoryAssertionAllowed(envelope: RegulatoryExecutionEnvelope, assertionKind: RegulatoryAssertionKind): void {
  const allowed = assertionKind === "certification" ? envelope.certificationAssertionAllowed : envelope.commercialAssertionAllowed;
  if (!allowed) {
    throw new FoundationError("TCDX.REGULATORY.TEST_PACK_ASSERTION_BLOCKED", "Non-authoritative test results cannot support official compliance or certification assertions", 403);
  }
}
