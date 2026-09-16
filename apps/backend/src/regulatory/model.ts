export const REGULATORY_PACK_CODES = [
  "ISO_9001_2015",
  "ISO_9001_2026",
  "ISO_IEC_27001_2022",
  "ISO_IEC_42001_2023",
  "CL_LEY_21719"
] as const;

export type RegulatoryPackCode = typeof REGULATORY_PACK_CODES[number];
export type PackCandidateState =
  | "CANDIDATE_READY_FOR_HUMAN_REVIEW"
  | "BLOCKED_SOURCE_UNAVAILABLE"
  | "BLOCKED_PUBLICATION_UNAVAILABLE"
  | "BLOCKED_LICENSE"
  | "BLOCKED_HUMAN_REVIEW"
  | "BLOCKED_CONTRACT_DECISION";

export type SourceOrigin = "licensed_file" | "official_source";
export type RegulatoryAuthorityClass = "AUTHORIZED_NORMATIVE_SOURCE" | "NON_AUTHORITATIVE_TEST_PACK";
export type RegulatorySourceRole =
  | "authorized_normative_source"
  | "official_metadata"
  | "provisional_supporting_reference"
  | "supporting_reference"
  | "test_data_source";
export type RegulatoryRuntimeEnvironment = "development" | "test" | "qa" | "production";
export type TenantAccountClassification = "demo" | "test" | "commercial";
export type UnitType = "section" | "chapter" | "clause" | "subclause" | "annex" | "article" | "paragraph" | "numeral" | "transitory_provision" | "schedule" | "control_group" | "other";
export type RequirementKind = "shall" | "legal_obligation" | "contractual_obligation" | "policy_mandate" | "other";
export type ControlOrigin = "regulatory_reference" | "tcdx_baseline";
export type MappingType = "satisfies" | "supports" | "mitigates" | "detects" | "evidences";
export type RelationshipType = "equivalent" | "partially_equivalent" | "overlaps" | "supports" | "supersedes" | "no_match";
export type ApprovalRole =
  | "REGULATORY_CONTENT_STEWARD"
  | "COMPLIANCE_MANAGER"
  | "QUALITY_MANAGER"
  | "CISO_SECURITY_MANAGER"
  | "AI_GOVERNANCE_MANAGER"
  | "PRIVACY_MANAGER"
  | "LEGAL_REVIEWER"
  | "GRC_MANAGER";

export type RegulatorySourceInput = {
  sourceCode: string;
  sourceType: "standard" | "law";
  publisher: string;
  officialUri: string;
  licenseClassification: string;
  origin: SourceOrigin;
  authorized: boolean;
  definitivePublication: boolean;
  sourceChecksum: string;
};

export type NormativeUnitInput = {
  sourceLocator: string;
  parentSourceLocator: string | null;
  unitType: UnitType;
  unitCode: string | null;
  title: string;
  displayOrder: number;
  contentLanguage: string;
  licensedContent: string | null;
  licensedContentRef: string | null;
  contentHash: string;
  provenanceRef: string;
  reviewed: boolean;
};

export type RequirementInput = {
  sourceLocator: string;
  normativeUnitSourceLocator: string;
  requirementCode: string | null;
  statementOrdinal: number;
  requirementKind: RequirementKind;
  contentLanguage: string;
  licensedStatement: string | null;
  licensedContentRef: string | null;
  contentHash: string;
  isMandatory: boolean;
  applicabilityGuidance: string | null;
  evidenceExpectations: string | null;
  provenanceRef: string;
  reviewed: boolean;
};

export type ReferenceControlInput = {
  controlCode: string;
  name: string;
  origin: ControlOrigin;
  objective: string;
  controlType: "preventive" | "detective" | "corrective" | "directive";
  nature: "manual" | "automated" | "hybrid";
  frequencyCode: string;
  executionMethod: string;
  verificationMethod: string;
  minimumEvidence: string;
  suggestedOwnerRoleCode: string | null;
  reviewed: boolean;
};

export type RequirementControlMappingInput = {
  requirementCode: string;
  controlCode: string;
  mappingType: MappingType;
  coverageContribution: number | null;
  rationale: string;
  provenanceRef: string;
  reviewed: boolean;
};

export type NormativeUnitControlMappingInput = {
  normativeUnitSourceLocator: string;
  controlCode: string;
  sourceLocator: string;
  rationale: string | null;
  provenanceRef: string;
  reviewed: boolean;
};

export type CrosswalkMappingInput = {
  objectType: "normative_unit" | "requirement" | "control";
  sourceCode: string;
  targetCode: string | null;
  relationshipType: RelationshipType;
  rationale: string;
  confidence: number;
  reviewed: boolean;
};

export type FrameworkCrosswalkInput = {
  targetFrameworkCode: string;
  targetEdition: string;
  direction: "source_to_target" | "target_to_source" | "bidirectional";
  provenanceRef: string;
  reviewed: boolean;
  mappings: ReadonlyArray<CrosswalkMappingInput>;
};

export type CoverageExpectations = {
  normativeUnits: number;
  requirements: number;
  referenceControls: number;
  editorialMappings: number;
  complianceMappings: number;
};

export type ApprovalInput = {
  role: ApprovalRole;
  userIdentityId: string;
  approvalRef: string;
};

export type RegulatoryPackImportInput = {
  packCode: RegulatoryPackCode;
  packName: string;
  edition: string;
  versionNumber: number;
  effectiveFrom: string | null;
  frameworkCode: string;
  frameworkName: string;
  source: RegulatorySourceInput;
  governance: {
    authorityClass: RegulatoryAuthorityClass;
    sourceRoles: ReadonlyArray<RegulatorySourceRole>;
    devDemoExecutionEligible: boolean;
    commercialPublicationEligible: boolean;
    certificationAssertionEligible: boolean;
    provenance: string;
    contentScope: string;
    coverageScope: string;
  };
  importedByUserIdentityId: string;
  importChecksum: string;
  units: ReadonlyArray<NormativeUnitInput>;
  requirements: ReadonlyArray<RequirementInput>;
  controls: ReadonlyArray<ReferenceControlInput>;
  requirementControlMappings: ReadonlyArray<RequirementControlMappingInput>;
  normativeUnitControlMappings: ReadonlyArray<NormativeUnitControlMappingInput>;
  crosswalks: ReadonlyArray<FrameworkCrosswalkInput>;
  coverageExpected: CoverageExpectations;
  approvals: ReadonlyArray<ApprovalInput>;
};

export type NormalizedRequirement = RequirementInput & { requirementCode: string };

export type CoverageResult = {
  normativeUnitsExpected: number;
  normativeUnitsImported: number;
  normativeUnitsReviewed: number;
  requirementsExpected: number;
  requirementsImported: number;
  requirementsReviewed: number;
  referenceControlsExpected: number;
  referenceControlsImported: number;
  referenceControlsReviewed: number;
  validParentLinks: number;
  reviewedEditorialMappings: number;
  reviewedComplianceMappings: number;
  coveragePercent: number;
};

export type NormalizedRegulatoryPack = Omit<RegulatoryPackImportInput, "requirements"> & {
  requirements: ReadonlyArray<NormalizedRequirement>;
  coverage: CoverageResult;
  contentHash: string;
};

export type ImportResult = {
  packCode: RegulatoryPackCode;
  regulatoryPackVersionId: string;
  frameworkVersionId: string;
  importChecksum: string;
  replayed: boolean;
  authorityClass: RegulatoryAuthorityClass;
  candidateState: PackCandidateState;
  coverage: CoverageResult;
};

export type RegulatoryExecutionContext = {
  runtimeEnvironment: RegulatoryRuntimeEnvironment;
  tenantId: string;
  tenantAccountClassification: {
    tenantId: string;
    value: TenantAccountClassification;
    selectedLayerId: string;
    layerIds: ReadonlyArray<string>;
  };
};

export type RegulatoryExecutionEnvelope = {
  packCode: RegulatoryPackCode;
  importChecksum: string;
  sourceChecksum: string;
  authorityClass: RegulatoryAuthorityClass;
  sourceRoles: ReadonlyArray<RegulatorySourceRole>;
  authorizedNormativeSource: boolean;
  executionContext: {
    runtimeEnvironment: RegulatoryRuntimeEnvironment;
    tenantId: string;
    tenantAccountClassification: TenantAccountClassification;
    configurationSelectedLayerId: string;
    configurationLayerIds: ReadonlyArray<string>;
  };
  resultProvenance: {
    packCode: RegulatoryPackCode;
    importChecksum: string;
    sourceChecksum: string;
    authorityClass: RegulatoryAuthorityClass;
    sourceRoles: ReadonlyArray<RegulatorySourceRole>;
    governanceProvenance: string;
    executionPurpose: "governed" | "functional_test";
  };
  commercialAssertionAllowed: boolean;
  certificationAssertionAllowed: boolean;
};

export type RegulatoryAssertionKind = "commercial_compliance" | "certification";
