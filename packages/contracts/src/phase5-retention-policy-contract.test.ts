import { describe, expect, it } from "vitest";
import migration from "../../../database/migrations/20260924000200_phase5_retention_policy_lifecycle.sql?raw";
import manifestSource from "../../../database/migrations/manifest.json?raw";
import expectedSchemaSource from "../../../database/expected-schema.json?raw";
import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import matrix from "../../../docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md?raw";
import permissions from "../../../docs/executable-contracts/05_PERMISSION_CATALOG.md?raw";
import lifecycle from "../../../docs/executable-contracts/09_SEED_MANIFESTS.md?raw";

const manifest = JSON.parse(manifestSource) as { migrations: Array<{ id: string; filename: string }> };
const expectedSchema = JSON.parse(expectedSchemaSource) as {
  tableCount: number;
  tables: Array<{ name: string; columns: Array<{ name: string; type: string; nullable: boolean; default: string | null }> }>;
};

describe("Phase 5 RetentionPolicy forward-only contract", () => {
  it("preserves the authorized RetentionPolicy reconciliation before the invitation successor", () => {
    expect(migration).toContain("ALTER COLUMN effective_from DROP NOT NULL");
    expect(migration).toContain("ALTER COLUMN effective_to DROP NOT NULL");
    expect(migration).toContain("ADD COLUMN row_version bigint NOT NULL DEFAULT 1");
    expect(migration).not.toMatch(/CREATE TABLE|DROP TABLE|DROP COLUMN/);
    expect(migration).toContain("PHASE5_RETENTION_POLICY_CHANGED_TABLE_COUNT");
    expect(migration).toContain("physical_rows <> 231");

    const table = expectedSchema.tables.find(({ name }) => name === "privacy.retention_policies");
    expect(table).toBeDefined();
    expect(table?.columns.find(({ name }) => name === "effective_from")?.nullable).toBe(true);
    expect(table?.columns.find(({ name }) => name === "effective_to")?.nullable).toBe(true);
    expect(table?.columns.find(({ name }) => name === "row_version")).toMatchObject({ type: "bigint", nullable: false, default: "1" });
    expect(expectedSchema.tableCount).toBe(237);
    expect(manifest.migrations.length).toBeGreaterThanOrEqual(21);
    expect(manifest.migrations.find(({ id }) => id === "20260924000200")).toMatchObject({ id: "20260924000200", filename: "20260924000200_phase5_retention_policy_lifecycle.sql" });
  });

  it("closes the approved vocabulary without a disposition column", () => {
    for (const value of ["legal_hold", "mandatory_regulatory_policy", "contractual_policy", "tenant_policy", "product_baseline", "expiry_or_closure"]) {
      expect(migration).toContain(`'${value}'`);
    }
    for (const rank of [500, 400, 300, 200, 100]) expect(migration).toContain(`precedence_rank = ${rank}`);
    expect(migration).not.toMatch(/ADD COLUMN (?:"?disposition|retention_start)/i);
    expect(openApi).toContain("purge_if_no_legal_hold");
    expect(openApi).not.toContain("retention_start_date:");
  });

  it("publishes the exact three-edge lifecycle with existing permissions", () => {
    const expected = [
      ["draft", "retention_policy.review", "under_review", "privacy.retention_policy.review"],
      ["under_review", "retention_policy.approve", "approved", "privacy.retention_policy.approve"],
      ["approved", "retention_policy.publish", "published", "privacy.retention_policy.publish"]
    ];
    for (const [from, command, to, permission] of expected) {
      expect(migration).toContain(`'${from}','${command}','${to}'`);
      expect(migration).toContain(`p.permission_code = '${permission}'`);
      expect(lifecycle).toContain(`\`${command}\``);
      expect(permissions).toContain(`\`${permission}\``);
    }
    expect(migration.match(/'RetentionPolicy',1,/g)).toHaveLength(3);
    expect(migration).toContain("contract:retention-policy-author-approver-distinct:v1");
  });

  it("publishes create/review/approve/publish with one If-Match authority", () => {
    for (const operation of ["retentionPolicyCreate", "retentionPolicyReview", "retentionPolicyApprove", "retentionPolicyPublish"]) {
      expect(openApi).toContain(`operationId: ${operation}`);
      expect(matrix).toMatch(new RegExp(`^\\| ${operation} \\| POST`, "m"));
    }
    const transitionSchema = openApi.slice(openApi.indexOf("    RetentionPolicyTransitionRequest:"), openApi.indexOf("    DomainCommandRequest:"));
    expect(transitionSchema).toContain("additionalProperties: false");
    expect(transitionSchema).not.toContain("expected_version");
    expect(openApi).toContain("name: If-Match");
    expect(openApi).toContain("Weak validators and a body expected_version are rejected");
  });
});
