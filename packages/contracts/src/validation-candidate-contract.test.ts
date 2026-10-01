import { describe, expect, it } from "vitest";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import tests from "../../../docs/executable-contracts/10_TEST_CONTRACTS.md?raw";
import traceability from "../../../docs/executable-contracts/18_EXECUTABLE_CONTRACT_TRACEABILITY.md?raw";
import amendment from "../../../docs/executable-contracts/amendments/PHASE_5_PLUS_SUBJECT_VALIDATION_v1.0/00_README.md?raw";

describe("STEP 22J derived candidate read contract", () => {
  it("binds one platform-only read to the approved existing permission and five physical authorities", () => {
    const operation = openApi.split('  "/platform/regulatory-pack-validation-candidates":\n')[1]?.split(/^  "[^\n]+":$/m)[0];
    expect(operation).toContain("operationId: validationAccessCandidateList");
    expect(operation).toContain('x-tcdx-permission: "`platform.regulatory_pack_validation_access.read`"');
    expect(operation).toContain('x-tcdx-scope: "platform"');
    expect(operation).toContain('x-tcdx-audit-event: "NONE"');
    expect(operation).toContain('x-tcdx-domain-events: "NONE"');
    expect(operation).toContain('x-tcdx-idempotency-class: "NATURALLY_IDEMPOTENT"');
    expect(operation).toContain('x-tcdx-transaction-boundary: "RO"');
    for (const entity of ["regulatory.regulatory_packs", "regulatory.regulatory_pack_versions",
      "regulatory.regulatory_pack_validation_provenances", "regulatory.regulatory_import_manifests",
      "regulatory.regulatory_sources"]) expect(operation).toContain(entity);
    expect(matrix).toMatch(/^\| validationAccessCandidateList \| GET `\/platform\/regulatory-pack-validation-candidates` \| regulatory; CORE_PLATFORM \| PLATFORM_ADMIN \|/m);
    expect(permissions).toContain("tenant read cannot enumerate others or global candidates");
    expect(tests).toContain("TC-F5PLUS-CANDIDATE-001");
    expect(traceability).toContain("validationAccessCandidateList");
    expect(amendment).toContain("proyección derivada y no persistida");
  });

  it("closes the response to the thirteen approved metadata fields", () => {
    const schema = openApi.split("    ValidationAccessCandidate:\n")[1]?.split("    UuidV7:\n")[0];
    const required = schema?.match(/required: \[([^\]]+)\]/)?.[1]?.split(", ");
    expect(required).toEqual([
      "regulatory_pack_version_id", "regulatory_pack_validation_provenance_id", "pack_code", "name",
      "edition", "license_classification", "version_state", "pack_state", "authority_class",
      "source_role", "provenance_ref", "version_effective_from", "version_effective_to"
    ]);
    expect(schema).toContain("additionalProperties: false");
    expect(schema).not.toMatch(/normative_text|licensed_statement|tenant_id|subscription_id/);
  });
});
