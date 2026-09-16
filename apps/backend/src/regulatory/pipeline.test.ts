import { describe, expect, it } from "vitest";
import type { AuthorizationFacts } from "../security/authorization.js";
import { MemoryRegulatoryPackRepository } from "./memory-repository.js";
import type { RegulatoryPackImportInput } from "./model.js";
import { RegulatoryPackPipeline } from "./pipeline.js";
import { calculateImportChecksum, validateAndNormalize } from "./validator.js";

const USER_IMPORTER = "00000000-0000-7000-8000-000000000001";
const USER_STEWARD = "00000000-0000-7000-8000-000000000002";
const USER_COMPLIANCE = "00000000-0000-7000-8000-000000000003";
const USER_CISO = "00000000-0000-7000-8000-000000000004";
const USER_GRC = "00000000-0000-7000-8000-000000000005";

function finalize(input: RegulatoryPackImportInput): RegulatoryPackImportInput {
  return { ...input, importChecksum: calculateImportChecksum(input) };
}

function fixture(): RegulatoryPackImportInput {
  return finalize({
    packCode: "ISO_IEC_27001_2022",
    packName: "ISO/IEC 27001:2022",
    edition: "2022",
    versionNumber: 1,
    effectiveFrom: "2022-10-25T00:00:00.000Z",
    frameworkCode: "ISO_IEC_27001",
    frameworkName: "ISO/IEC 27001",
    source: {
      sourceCode: "ISO_IEC_27001_2022_LICENSED",
      sourceType: "standard",
      publisher: "International Organization for Standardization",
      officialUri: "https://www.iso.org/standard/27001.html",
      licenseClassification: "licensed_internal",
      origin: "licensed_file",
      authorized: true,
      definitivePublication: true,
      sourceChecksum: "a".repeat(64)
    },
    governance: {
      authorityClass: "AUTHORIZED_NORMATIVE_SOURCE",
      sourceRoles: ["authorized_normative_source"],
      devDemoExecutionEligible: true,
      commercialPublicationEligible: true,
      certificationAssertionEligible: true,
      provenance: "licensed-source-manifest:ISO_IEC_27001_2022",
      contentScope: "Governed licensed test fixture",
      coverageScope: "Complete fixture population only"
    },
    importedByUserIdentityId: USER_IMPORTER,
    importChecksum: "0".repeat(64),
    units: [{
      sourceLocator: "ISO_IEC_27001_2022:clause:4",
      parentSourceLocator: null,
      unitType: "clause",
      unitCode: "4",
      title: "Licensed title reference",
      displayOrder: 1,
      contentLanguage: "en",
      licensedContent: null,
      licensedContentRef: "licensed://iso/27001/2022/clause/4",
      contentHash: "b".repeat(64),
      provenanceRef: "source:ISO_IEC_27001_2022_LICENSED#clause-4",
      reviewed: true
    }],
    requirements: [{
      sourceLocator: "ISO_IEC_27001_2022:clause:4:statement:1",
      normativeUnitSourceLocator: "ISO_IEC_27001_2022:clause:4",
      requirementCode: null,
      statementOrdinal: 1,
      requirementKind: "shall",
      contentLanguage: "en",
      licensedStatement: null,
      licensedContentRef: "licensed://iso/27001/2022/clause/4/statement/1",
      contentHash: "c".repeat(64),
      isMandatory: true,
      applicabilityGuidance: "Governed licensed guidance reference",
      evidenceExpectations: "Governed evidence expectation",
      provenanceRef: "source:ISO_IEC_27001_2022_LICENSED#clause-4-statement-1",
      reviewed: true
    }],
    controls: [{
      controlCode: "ISO_IEC_27001_2022:A.5.1",
      name: "Licensed control reference",
      origin: "regulatory_reference",
      objective: "Licensed objective reference",
      controlType: "directive",
      nature: "manual",
      frequencyCode: "continuous",
      executionMethod: "Governed method",
      verificationMethod: "Governed verification",
      minimumEvidence: "Governed evidence",
      suggestedOwnerRoleCode: "CISO_SECURITY_MANAGER",
      reviewed: true
    }],
    requirementControlMappings: [],
    normativeUnitControlMappings: [{
      normativeUnitSourceLocator: "ISO_IEC_27001_2022:clause:4",
      controlCode: "ISO_IEC_27001_2022:A.5.1",
      sourceLocator: "ISO_IEC_27001_2022:annex-a:A.5.1",
      rationale: "Editorial location",
      provenanceRef: "source:ISO_IEC_27001_2022_LICENSED#annex-a-5-1",
      reviewed: true
    }],
    crosswalks: [],
    coverageExpected: { normativeUnits: 1, requirements: 1, referenceControls: 1, editorialMappings: 1, complianceMappings: 0 },
    approvals: [
      { role: "REGULATORY_CONTENT_STEWARD", userIdentityId: USER_STEWARD, approvalRef: "approval:steward:1" },
      { role: "COMPLIANCE_MANAGER", userIdentityId: USER_COMPLIANCE, approvalRef: "approval:compliance:1" },
      { role: "CISO_SECURITY_MANAGER", userIdentityId: USER_CISO, approvalRef: "approval:ciso:1" },
      { role: "GRC_MANAGER", userIdentityId: USER_GRC, approvalRef: "approval:grc:1" }
    ]
  });
}

function nonAuthoritativeTestFixture(packCode: "ISO_9001_2015" | "ISO_9001_2026" | "ISO_IEC_27001_2022" | "ISO_IEC_42001_2023" = "ISO_IEC_27001_2022"): RegulatoryPackImportInput {
  const input = fixture();
  input.packCode = packCode;
  input.packName = `${packCode} non-authoritative functional test pack`;
  input.edition = `test-${packCode.toLowerCase()}`;
  input.versionNumber = 9000001;
  input.frameworkCode = packCode.startsWith("ISO_9001") ? "ISO_9001" : packCode.replace(/_2022$|_2023$/, "");
  input.frameworkName = `${packCode} governed functional test version`;
  input.source = {
    ...input.source,
    sourceCode: `${packCode}_PUBLIC_REFERENCE_TEST`,
    origin: "official_source",
    authorized: false,
    definitivePublication: packCode !== "ISO_9001_2026",
    licenseClassification: "non_authoritative_test_pack"
  };
  input.governance = {
    authorityClass: "NON_AUTHORITATIVE_TEST_PACK",
    sourceRoles: ["official_metadata", "provisional_supporting_reference", "test_data_source"],
    devDemoExecutionEligible: true,
    commercialPublicationEligible: false,
    certificationAssertionEligible: false,
    provenance: "docs/regulatory-packs/provisional-sources/provisional-public-reference-packs.json",
    contentScope: "Public metadata and deliberately non-normative functional test markers",
    coverageScope: "The declared test fixture only; never the ISO standard"
  };
  input.units = [{
    ...input.units[0]!,
    sourceLocator: `${packCode}:test-marker:1`,
    parentSourceLocator: null,
    unitType: "other",
    unitCode: "TEST-1",
    title: "Non-normative functional test marker",
    licensedContentRef: `test-data://${packCode}/marker/1`,
    provenanceRef: `public-metadata:${packCode}#functional-test-marker`,
    reviewed: true
  }];
  input.requirements = [];
  input.controls = [];
  input.requirementControlMappings = [];
  input.normativeUnitControlMappings = [];
  input.crosswalks = [];
  input.coverageExpected = { normativeUnits: 1, requirements: 0, referenceControls: 0, editorialMappings: 0, complianceMappings: 0 };
  input.approvals = [];
  return finalize(input);
}

function executionContext(runtimeEnvironment: "development" | "test" | "qa" | "production", value: "demo" | "test" | "commercial", tenantId = "00000000-0000-7000-8000-000000000101") {
  return {
    runtimeEnvironment,
    tenantId,
    tenantAccountClassification: {
      tenantId,
      value,
      selectedLayerId: "effective-configuration:tenant-account-classification",
      layerIds: ["configuration-definition:tenant-account-classification", "configuration-override:demo-tenant"]
    }
  } as const;
}

const publishAuthorization: AuthorizationFacts = {
  authenticated: true,
  tenantMembershipActive: true,
  capabilityEnabled: true,
  permissions: new Set(["knowledge.regulatory_pack.publish"]),
  scopes: new Set(["platform"]),
  objectAccessible: true,
  sodAllowed: true
};

describe("generic regulatory pack pipeline", () => {
  it("imports deterministically and replays without duplicates", async () => {
    const pipeline = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository());
    const first = await pipeline.import(fixture());
    const second = await pipeline.import(fixture());
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.regulatoryPackVersionId).toBe(first.regulatoryPackVersionId);
    expect(second.frameworkVersionId).toBe(first.frameworkVersionId);
  });

  it("generates a stable requirement code from locator and ordinal", () => {
    const first = validateAndNormalize(fixture()).requirements[0]?.requirementCode;
    const second = validateAndNormalize(fixture()).requirements[0]?.requirementCode;
    expect(first).toMatch(/^REQ-[A-F0-9]{24}$/);
    expect(second).toBe(first);
  });

  it("calculates 100 percent only when every applicable population is independently complete", () => {
    expect(validateAndNormalize(fixture()).coverage.coveragePercent).toBe(100);
    const incomplete = fixture();
    incomplete.units = [{ ...incomplete.units[0]!, reviewed: false }];
    const finalized = finalize(incomplete);
    expect(validateAndNormalize(finalized).coverage.coveragePercent).toBe(0);
  });

  it("rejects duplicates, orphan requirements, missing hashes and dual content authority", () => {
    const duplicate = fixture();
    duplicate.units = [...duplicate.units, duplicate.units[0]!];
    expect(() => validateAndNormalize(finalize(duplicate))).toThrow("Duplicate NormativeUnit identifiers");

    const orphan = fixture();
    orphan.requirements = [{ ...orphan.requirements[0]!, normativeUnitSourceLocator: "missing" }];
    expect(() => validateAndNormalize(finalize(orphan))).toThrow("Requirement is orphaned");

    const hashGap = fixture();
    hashGap.units = [{ ...hashGap.units[0]!, contentHash: "missing" }];
    expect(() => validateAndNormalize(finalize(hashGap))).toThrow("lowercase SHA-256");

    const dual = fixture();
    dual.units = [{ ...dual.units[0]!, licensedContent: "content", licensedContentRef: "ref" }];
    expect(() => validateAndNormalize(finalize(dual))).toThrow("exactly one");
  });

  it("rejects cyclic and missing-parent hierarchy relations", () => {
    const cycle = fixture();
    cycle.units = [
      { ...cycle.units[0]!, sourceLocator: "a", parentSourceLocator: "b" },
      { ...cycle.units[0]!, sourceLocator: "b", parentSourceLocator: "a", displayOrder: 2 }
    ];
    cycle.coverageExpected = { ...cycle.coverageExpected, normativeUnits: 2 };
    expect(() => validateAndNormalize(finalize(cycle))).toThrow("cycle");

    const missing = fixture();
    missing.units = [{ ...missing.units[0]!, parentSourceLocator: "missing" }];
    expect(() => validateAndNormalize(finalize(missing))).toThrow("parent is missing");
  });

  it("keeps NormativeUnit structural and typed mappings separate", () => {
    const normalized = validateAndNormalize(fixture());
    expect(normalized.units[0]).not.toHaveProperty("resultStatus");
    expect(normalized.units[0]).not.toHaveProperty("applicability");
    expect(normalized.normativeUnitControlMappings).toHaveLength(1);
    expect(normalized.requirementControlMappings).toHaveLength(0);
  });

  it("enforces reference-control and TCDX baseline-control ownership semantics by pack", () => {
    const wrongIso = fixture();
    wrongIso.controls = [{ ...wrongIso.controls[0]!, origin: "tcdx_baseline" }];
    expect(() => validateAndNormalize(finalize(wrongIso))).toThrow("Control origin");

    const law = fixture();
    law.packCode = "CL_LEY_21719";
    law.packName = "Ley 21.719";
    law.frameworkCode = "CL_LEY_21719";
    law.edition = "2026-12-01";
    law.effectiveFrom = "2026-12-01T00:00:00.000Z";
    law.source = { ...law.source, sourceCode: "BCN_CL_LEY_21719", sourceType: "law", publisher: "Biblioteca del Congreso Nacional de Chile", origin: "official_source" };
    law.controls = [{ ...law.controls[0]!, origin: "tcdx_baseline" }];
    law.approvals = [
      { role: "REGULATORY_CONTENT_STEWARD", userIdentityId: USER_STEWARD, approvalRef: "a:1" },
      { role: "COMPLIANCE_MANAGER", userIdentityId: USER_COMPLIANCE, approvalRef: "a:2" },
      { role: "PRIVACY_MANAGER", userIdentityId: USER_CISO, approvalRef: "a:3" },
      { role: "LEGAL_REVIEWER", userIdentityId: "00000000-0000-7000-8000-000000000006", approvalRef: "a:4" },
      { role: "GRC_MANAGER", userIdentityId: USER_GRC, approvalRef: "a:5" }
    ];
    expect(() => validateAndNormalize(finalize(law))).not.toThrow();
  });

  it("blocks unlicensed synthesis, unauthorized sources and definitive-edition substitution", () => {
    const synthesized = fixture();
    synthesized.source = { ...synthesized.source, origin: "official_source" };
    expect(() => validateAndNormalize(finalize(synthesized))).toThrow("licensed file");

    const unauthorized = fixture();
    unauthorized.source = { ...unauthorized.source, authorized: false };
    expect(() => validateAndNormalize(finalize(unauthorized))).toThrow("authorized normative source role");

    const prepublication = fixture();
    prepublication.packCode = "ISO_9001_2026";
    prepublication.source = { ...prepublication.source, definitivePublication: false };
    expect(() => validateAndNormalize(finalize(prepublication))).toThrow("definitive publication");
  });

  it("executes a non-authoritative ISO test pack only in non-production for an explicitly classified demo/test tenant", async () => {
    const pipeline = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository());
    const input = nonAuthoritativeTestFixture();
    const imported = await pipeline.import(input);
    const envelope = pipeline.authorizeExecution(input, executionContext("qa", "demo"));
    expect(imported.authorityClass).toBe("NON_AUTHORITATIVE_TEST_PACK");
    expect(imported.candidateState).toBe("BLOCKED_LICENSE");
    expect(envelope.resultProvenance.executionPurpose).toBe("functional_test");
    expect(envelope.authorizedNormativeSource).toBe(false);
  });

  it("rejects the same test pack for production, commercial tenants and cross-tenant classification lineage", () => {
    const pipeline = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository());
    const input = nonAuthoritativeTestFixture();
    expect(() => pipeline.authorizeExecution(input, executionContext("production", "demo"))).toThrow("cannot execute in production");
    expect(() => pipeline.authorizeExecution(input, executionContext("qa", "commercial"))).toThrow("demo/test tenant");
    const mismatched = executionContext("qa", "demo");
    expect(() => pipeline.authorizeExecution(input, {
      ...mismatched,
      tenantAccountClassification: { ...mismatched.tenantAccountClassification, tenantId: "00000000-0000-7000-8000-000000000102" }
    })).toThrow("active tenant");
  });

  it("retains test authority and provenance while blocking official compliance and certification assertions", () => {
    const pipeline = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository());
    const input = nonAuthoritativeTestFixture();
    const envelope = pipeline.authorizeExecution(input, executionContext("development", "test"));
    expect(envelope).toMatchObject({
      authorityClass: "NON_AUTHORITATIVE_TEST_PACK",
      commercialAssertionAllowed: false,
      certificationAssertionAllowed: false,
      resultProvenance: {
        authorityClass: "NON_AUTHORITATIVE_TEST_PACK",
        sourceRoles: ["official_metadata", "provisional_supporting_reference", "test_data_source"]
      }
    });
    expect(() => pipeline.authorizeResultAssertion(envelope, "commercial_compliance")).toThrow("cannot support official compliance");
    expect(() => pipeline.authorizeResultAssertion(envelope, "certification")).toThrow("cannot support official compliance");
  });

  it.each(["ISO_9001_2015", "ISO_9001_2026", "ISO_IEC_27001_2022", "ISO_IEC_42001_2023"] as const)(
    "keeps %s commercially BLOCKED_LICENSE without transforming public references into licensed content",
    async (packCode) => {
      const input = nonAuthoritativeTestFixture(packCode);
      const result = await new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository()).import(input);
      expect(result.candidateState).toBe("BLOCKED_LICENSE");
      expect(input.source.authorized).toBe(false);
      expect(input.source.licenseClassification).toBe("non_authoritative_test_pack");
      expect(input.governance.commercialPublicationEligible).toBe(false);
    }
  );

  it("does not expose a global license bypass and keeps test publication blocked", async () => {
    const pipeline = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository());
    const invalid = nonAuthoritativeTestFixture();
    invalid.governance = { ...invalid.governance, commercialPublicationEligible: true };
    expect(() => validateAndNormalize(finalize(invalid))).toThrow("DEV/DEMO-only");

    const input = nonAuthoritativeTestFixture();
    const imported = await pipeline.import(input);
    await expect(pipeline.publish(input, {
      regulatoryPackVersionId: imported.regulatoryPackVersionId,
      actorUserIdentityId: USER_GRC,
      correlationId: "00000000-0000-7000-8000-000000000010",
      idempotencyKey: "test-publish-1",
      requestHash: "d".repeat(64)
    }, publishAuthorization)).rejects.toMatchObject({ code: "TCDX.REGULATORY.PUBLICATION_BLOCKED" });
  });

  it("replays test-pack imports idempotently and rejects source drift", async () => {
    const pipeline = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository());
    const input = nonAuthoritativeTestFixture();
    const first = await pipeline.import(input);
    const second = await pipeline.import(input);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    const drifted = nonAuthoritativeTestFixture();
    drifted.units = [{ ...drifted.units[0]!, title: "Changed non-normative marker", contentHash: "f".repeat(64) }];
    await expect(pipeline.import(finalize(drifted))).rejects.toMatchObject({ code: "TCDX.REGULATORY.SOURCE_DRIFT" });
  });

  it("treats any attempted test-to-licensed authority change as source drift", async () => {
    const pipeline = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository());
    const testInput = nonAuthoritativeTestFixture();
    await pipeline.import(testInput);
    const reclassified = nonAuthoritativeTestFixture();
    reclassified.source = {
      ...reclassified.source,
      sourceCode: "ISO_IEC_27001_2022_LICENSED_REPLACEMENT",
      origin: "licensed_file",
      authorized: true,
      licenseClassification: "licensed_internal"
    };
    reclassified.governance = {
      ...reclassified.governance,
      authorityClass: "AUTHORIZED_NORMATIVE_SOURCE",
      sourceRoles: ["authorized_normative_source"],
      commercialPublicationEligible: true,
      certificationAssertionEligible: true
    };
    await expect(pipeline.import(finalize(reclassified))).rejects.toMatchObject({ code: "TCDX.REGULATORY.SOURCE_DRIFT" });
  });

  it("keeps the official Ley 21.719 path available outside demo without test-pack restrictions", () => {
    const law = fixture();
    law.packCode = "CL_LEY_21719";
    law.packName = "Ley 21.719";
    law.frameworkCode = "CL_LEY_21719";
    law.edition = "2026-12-01";
    law.effectiveFrom = "2026-12-01T00:00:00.000Z";
    law.source = { ...law.source, sourceCode: "BCN_CL_LEY_21719", sourceType: "law", publisher: "Biblioteca del Congreso Nacional de Chile", origin: "official_source" };
    law.controls = [{ ...law.controls[0]!, origin: "tcdx_baseline" }];
    law.governance = { ...law.governance, provenance: "official-bcn-source-manifest:CL_LEY_21719" };
    law.approvals = [
      { role: "REGULATORY_CONTENT_STEWARD", userIdentityId: USER_STEWARD, approvalRef: "a:1" },
      { role: "COMPLIANCE_MANAGER", userIdentityId: USER_COMPLIANCE, approvalRef: "a:2" },
      { role: "PRIVACY_MANAGER", userIdentityId: USER_CISO, approvalRef: "a:3" },
      { role: "LEGAL_REVIEWER", userIdentityId: "00000000-0000-7000-8000-000000000006", approvalRef: "a:4" },
      { role: "GRC_MANAGER", userIdentityId: USER_GRC, approvalRef: "a:5" }
    ];
    const finalized = finalize(law);
    const envelope = new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository()).authorizeExecution(finalized, executionContext("production", "commercial"));
    expect(envelope.authorityClass).toBe("AUTHORIZED_NORMATIVE_SOURCE");
    expect(envelope.resultProvenance.executionPurpose).toBe("governed");
    expect(envelope.commercialAssertionAllowed).toBe(true);
  });

  it("validates typed crosswalk integrity without generic polymorphic targets", () => {
    const invalid = fixture();
    invalid.crosswalks = [{
      targetFrameworkCode: "ISO_IEC_27001_NEXT",
      targetEdition: "next",
      direction: "source_to_target",
      provenanceRef: "approved-crosswalk:1",
      reviewed: true,
      mappings: [{ objectType: "requirement", sourceCode: "missing", targetCode: "target", relationshipType: "overlaps", rationale: "reviewed", confidence: 1, reviewed: true }]
    }];
    expect(() => validateAndNormalize(finalize(invalid))).toThrow("typed member");

    const noMatch = fixture();
    noMatch.crosswalks = [{
      targetFrameworkCode: "ISO_IEC_27001_NEXT",
      targetEdition: "next",
      direction: "source_to_target",
      provenanceRef: "approved-crosswalk:1",
      reviewed: true,
      mappings: [{ objectType: "normative_unit", sourceCode: noMatch.units[0]!.sourceLocator, targetCode: "must-be-null", relationshipType: "no_match", rationale: "reviewed", confidence: 1, reviewed: true }]
    }];
    expect(() => validateAndNormalize(finalize(noMatch))).toThrow("target must be null");
  });

  it("rolls back the entire transaction when persistence fails", async () => {
    const repository = new MemoryRegulatoryPackRepository();
    repository.failNextPersist = true;
    const pipeline = new RegulatoryPackPipeline(repository);
    await expect(pipeline.import(fixture())).rejects.toThrow("injected persistence failure");
    const result = await pipeline.import(fixture());
    expect(result.replayed).toBe(false);
  });

  it("requires every publication approval role and segregated reviewers", async () => {
    const input = fixture();
    input.approvals = input.approvals.filter((approval) => approval.role !== "CISO_SECURITY_MANAGER");
    const finalized = finalize(input);
    const result = await new RegulatoryPackPipeline(new MemoryRegulatoryPackRepository()).import(finalized);
    expect(result.candidateState).toBe("BLOCKED_HUMAN_REVIEW");
  });

  it("enforces platform publication permission and publisher identity", async () => {
    const repository = new MemoryRegulatoryPackRepository();
    const pipeline = new RegulatoryPackPipeline(repository);
    const input = fixture();
    const imported = await pipeline.import(input);
    const command = {
      regulatoryPackVersionId: imported.regulatoryPackVersionId,
      actorUserIdentityId: USER_GRC,
      correlationId: "00000000-0000-7000-8000-000000000010",
      idempotencyKey: "publish-1",
      requestHash: "d".repeat(64)
    };
    await expect(pipeline.publish(input, command, { ...publishAuthorization, permissions: new Set() })).rejects.toThrow("Access denied");
    await expect(pipeline.publish(input, { ...command, actorUserIdentityId: USER_CISO }, publishAuthorization)).rejects.toThrow("publishing actor");
    await expect(pipeline.publish(input, command, publishAuthorization)).resolves.toBeUndefined();
  });

  it("detects source drift and preserves published-version immutability", async () => {
    const repository = new MemoryRegulatoryPackRepository();
    const pipeline = new RegulatoryPackPipeline(repository);
    const input = fixture();
    const imported = await pipeline.import(input);
    await pipeline.publish(input, {
      regulatoryPackVersionId: imported.regulatoryPackVersionId,
      actorUserIdentityId: USER_GRC,
      correlationId: "00000000-0000-7000-8000-000000000010",
      idempotencyKey: "publish-1",
      requestHash: "d".repeat(64)
    }, publishAuthorization);
    const drifted = fixture();
    drifted.units = [{ ...drifted.units[0]!, title: "changed", contentHash: "e".repeat(64) }];
    await expect(pipeline.import(finalize(drifted))).rejects.toMatchObject({ code: "TCDX.REGULATORY.SOURCE_DRIFT" });
  });
});
