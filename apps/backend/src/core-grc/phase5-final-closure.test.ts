import { PostgresQueryCompiler, type Transaction } from "kysely";
import { describe, expect, it } from "vitest";
import type { ScopeKind } from "@tcdx-grc/shared-types";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import type { AuthorizedFileAccess, FileStoragePort, QuarantineUploadRequest } from "../ports/file-storage.js";
import { Readable } from "node:stream";
import type { CoreActor } from "./model.js";
import { executeMutation, mutations, type MutationDefinition } from "./service.js";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const actorId = "018f47f2-6170-7bd0-9d43-12f644a2b112";
const membershipId = "018f47f2-6170-7bd0-9d43-12f644a2b113";
const targetId = "018f47f2-6170-7bd0-9d43-12f644a2b114";
const evidenceVersionId = "018f47f2-6170-7bd0-9d43-12f644a2b115";
const retentionPolicyId = "018f47f2-6170-7bd0-9d43-12f644a2b116";
const correlationId = "018f47f2-6170-7bd0-9d43-12f644a2b117";

type Query = { sql: string; parameters: readonly unknown[] };
type QueryResult = { rows: Record<string, unknown>[]; numAffectedRows?: bigint };

function executor(handler: (query: Query) => QueryResult | Promise<QueryResult>) {
  const compiler = new PostgresQueryCompiler();
  const queryExecutor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
    executeQuery: handler
  };
  return { executeQuery: handler, getExecutor: () => queryExecutor } as unknown as Transaction<FoundationDatabase>;
}

function actorFor(definition: MutationDefinition, scope: ScopeKind = "tenant", identityId = actorId): CoreActor {
  return {
    tenantId,
    membershipId,
    userIdentityId: identityId,
    permissions: new Set([definition.permission]),
    scopes: new Set([scope]),
    permissionScopes: new Map([[definition.permission, new Set([scope])]]),
    capabilityGroups: new Set([definition.capability]),
    roles: ["EVIDENCE_OWNER"]
  };
}

function intentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    file_upload_intent_id: targetId,
    row_version: 1,
    purpose: "evidence_document",
    original_filename: "evidence.pdf",
    declared_mime: "application/pdf",
    expected_size_bytes: 12,
    classification: "confidential",
    retention_policy_id: retentionPolicyId,
    source_provenance: "customer-upload",
    effective_from: null,
    effective_to: null,
    quarantine_object_key: `quarantine/${targetId}`,
    lifecycle_state: "pending_upload",
    expires_at: new Date(Date.now() + 300_000),
    uploaded_at: null,
    scan_started_at: null,
    scan_completed_at: null,
    promoted_at: null,
    rejected_at: null,
    expired_at: null,
    cancelled_at: null,
    file_object_id: null,
    tenant_id: tenantId,
    created_at: new Date(),
    created_by_user_identity_id: actorId,
    ...overrides
  };
}

class StorageDouble implements FileStoragePort {
  allocationCalls = 0;
  finalizeCalls = 0;
  quarantineRemovals = 0;
  finalRemovals = 0;
  finalizeError: FoundationError | undefined;

  async allocateQuarantineUpload(request: QuarantineUploadRequest) {
    this.allocationCalls += 1;
    return {
      objectKey: `quarantine/${request.uploadIntentId}`,
      uploadReference: "https://storage.invalid/signed-secret-query",
      expiresAt: request.expiresAt ?? new Date(Date.now() + 300_000)
    };
  }

  async finalizeQuarantine(request: AuthorizedFileAccess & { uploadIntentId: string; fileObjectId: string; quarantineObjectKey: string; declaredMime: string; expectedSizeBytes: number }) {
    this.finalizeCalls += 1;
    if (this.finalizeError) throw this.finalizeError;
    return {
      objectKey: `objects/${request.fileObjectId}`,
      detectedMime: "application/pdf",
      sizeBytes: 12,
      sha256: "a".repeat(64),
      scanState: "passed" as const,
      storageVersion: "version-1",
      encryptionKeyRef: "kms/runtime/evidence"
    };
  }

  async removeQuarantine(_request: AuthorizedFileAccess & { uploadIntentId: string; quarantineObjectKey: string }) { this.quarantineRemovals += 1; }
  async removeFinalizedObject(_request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string }) { this.finalRemovals += 1; }
  async createDownloadReference(_request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string; sha256: string; scanState: "passed"; classification: string }) { return { downloadReference: "https://storage.invalid/download" }; }
  async uploadQuarantineContent() { return undefined; }
  async openDownload() { return Readable.from([Buffer.from("%PDF-test")]); }
}

function code(error: unknown): string | undefined {
  return error instanceof FoundationError ? error.code : undefined;
}

describe("Phase 5 FileUploadIntent runtime", () => {
  it("creates a durable intent without creating FileObject or persisting the signed URL", async () => {
    const definition = mutations.get("uploadIntentCreate")!;
    const storage = new StorageDouble();
    const statements: Query[] = [];
    const database = executor((query) => {
      statements.push(query);
      if (query.sql.startsWith("SELECT 1 AS found FROM privacy.retention_policies")) return { rows: [{ found: 1 }] };
      if (query.sql.startsWith("INSERT INTO evidence.file_upload_intents")) return { rows: [intentRow()] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });

    const result = await definition.execute({
      transaction: database,
      actor: actorFor(definition),
      correlationId,
      fileStorage: storage,
      body: {
        original_filename: "evidence.pdf",
        declared_mime: "application/pdf",
        size_bytes: 12,
        classification: "confidential",
        retention_policy_id: retentionPolicyId,
        source_provenance: "customer-upload"
      }
    });

    expect(result.resource).toBe("fileUploadIntent");
    expect(result.response?.upload_url).toBe(`/api/v1/file-upload-intents/${result.id}/content`);
    expect(statements.filter((query) => query.sql.startsWith("INSERT INTO evidence.file_upload_intents"))).toHaveLength(1);
    expect(statements.some((query) => query.sql.includes("INSERT INTO evidence.file_objects"))).toBe(false);
    expect(statements.flatMap((query) => [...query.parameters])).not.toContain("https://storage.invalid/signed-secret-query");
    expect(JSON.stringify(result.auditAfter)).not.toContain("signed-secret-query");
  });

  it("rejects invalid classification and a missing retention policy before intent persistence", async () => {
    const definition = mutations.get("uploadIntentCreate")!;
    const storage = new StorageDouble();
    const noPersistence = executor(() => { throw new Error("persistence must not run"); });
    await expect(executeMutation(noPersistence, actorFor(definition), definition, {
      body: { original_filename: "x", declared_mime: "application/pdf", size_bytes: 1, classification: "secret", retention_policy_id: retentionPolicyId, source_provenance: "upload" },
      idempotencyKey: "invalid-classification",
      correlationId,
      fileStorage: storage
    })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");

    let inserted = false;
    const missingPolicy = executor((query) => {
      if (query.sql.startsWith("SELECT 1 AS found FROM privacy.retention_policies")) return { rows: [] };
      if (query.sql.startsWith("INSERT")) inserted = true;
      return { rows: [] };
    });
    await expect(definition.execute({
      transaction: missingPolicy,
      actor: actorFor(definition),
      correlationId,
      fileStorage: storage,
      body: { original_filename: "x", declared_mime: "application/pdf", size_bytes: 1, classification: "internal", retention_policy_id: retentionPolicyId, source_provenance: "upload" }
    })).rejects.toSatisfy((error: unknown) => code(error) === "TCDX.RESOURCE.NOT_FOUND");
    expect(inserted).toBe(false);
  });

  it("promotes clean content to exactly one final FileObject and cleans quarantine after commit", async () => {
    const definition = mutations.get("uploadFinalize")!;
    const storage = new StorageDouble();
    const statements: Query[] = [];
    const database = executor((query) => {
      statements.push(query);
      if (query.sql.includes("FROM evidence.file_upload_intents t")) return { rows: [intentRow()] };
      if (query.sql.startsWith("INSERT INTO evidence.file_objects")) return { rows: [{ file_object_id: query.parameters[0] }] };
      if (query.sql.startsWith("UPDATE evidence.file_upload_intents")) return { rows: [intentRow({ lifecycle_state: "promoted", row_version: 2, file_object_id: query.parameters.at(-1) })] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });

    const result = await definition.execute({ transaction: database, actor: actorFor(definition), body: { expected_version: 1 }, targetId, correlationId, fileStorage: storage });
    expect(result.resource).toBe("fileObject");
    expect(storage.finalizeCalls).toBe(1);
    expect(statements.filter((query) => query.sql.startsWith("INSERT INTO evidence.file_objects"))).toHaveLength(1);
    expect(storage.quarantineRemovals).toBe(0);
    await result.afterCommit?.();
    expect(storage.quarantineRemovals).toBe(1);
    expect(storage.finalRemovals).toBe(0);
  });

  it("persists malware rejection, creates no FileObject, and leaves scanner outages retryable", async () => {
    const definition = mutations.get("uploadFinalize")!;
    const storage = new StorageDouble();
    storage.finalizeError = new FoundationError("TCDX.FILE.MALWARE_REJECTED", "malware", 422);
    let selectCount = 0;
    const statements: string[] = [];
    const rejectedDatabase = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("FROM evidence.file_upload_intents t")) {
        selectCount += 1;
        return { rows: [intentRow(selectCount === 1 ? {} : { lifecycle_state: "rejected", row_version: 2, rejected_at: new Date() })] };
      }
      if (query.sql.startsWith("UPDATE evidence.file_upload_intents")) return { rows: [intentRow({ lifecycle_state: "rejected", row_version: 2, rejected_at: new Date() })] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const rejected = await definition.execute({ transaction: rejectedDatabase, actor: actorFor(definition), body: { expected_version: 1 }, targetId, correlationId, fileStorage: storage });
    expect(rejected.deferredError?.code).toBe("TCDX.FILE.MALWARE_REJECTED");
    expect(rejected.auditOutcome).toBe("failure");
    expect(statements.some((sql) => sql.startsWith("INSERT INTO evidence.file_objects"))).toBe(false);

    const unavailable = new StorageDouble();
    unavailable.finalizeError = new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "scanner unavailable", 503, true);
    let mutated = false;
    const unavailableDatabase = executor((query) => {
      if (query.sql.includes("FROM evidence.file_upload_intents t")) return { rows: [intentRow()] };
      if (query.sql.startsWith("INSERT") || query.sql.startsWith("UPDATE")) mutated = true;
      return { rows: [] };
    });
    await expect(definition.execute({ transaction: unavailableDatabase, actor: actorFor(definition), body: { expected_version: 1 }, targetId, correlationId, fileStorage: unavailable }))
      .rejects.toMatchObject({ code: "TCDX.DEPENDENCY.UNAVAILABLE", statusCode: 503, retryable: true });
    expect(mutated).toBe(false);
  });

  it("expires stale intents and denies cross-tenant finalization before storage access", async () => {
    const definition = mutations.get("uploadFinalize")!;
    const storage = new StorageDouble();
    let selectCount = 0;
    const expiredDb = executor((query) => {
      if (query.sql.includes("FROM evidence.file_upload_intents t")) {
        selectCount += 1;
        return { rows: [intentRow(selectCount === 1 ? { expires_at: new Date(Date.now() - 1_000) } : { lifecycle_state: "expired", row_version: 2, expired_at: new Date() })] };
      }
      if (query.sql.startsWith("UPDATE evidence.file_upload_intents")) return { rows: [intentRow({ lifecycle_state: "expired", row_version: 2, expired_at: new Date() })] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const expired = await definition.execute({ transaction: expiredDb, actor: actorFor(definition), body: { expected_version: 1 }, targetId, correlationId, fileStorage: storage });
    expect(expired.deferredError?.code).toBe("TCDX.LIFECYCLE.TRANSITION_DENIED");
    expect(storage.finalizeCalls).toBe(0);

    const crossTenant = executor((query) => query.sql.includes("FROM evidence.file_upload_intents t") ? { rows: [] } : { rows: [] });
    await expect(definition.execute({ transaction: crossTenant, actor: actorFor(definition), body: { expected_version: 1 }, targetId, correlationId, fileStorage: storage }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.RESOURCE.NOT_FOUND");
    expect(storage.finalizeCalls).toBe(0);
  });
});

describe("Phase 5 evidenceRequestFulfill", () => {
  it("fulfills an exact same-tenant target and materializes one fulfillment row", async () => {
    const definition = mutations.get("evidenceRequestFulfill")!;
    const statements: string[] = [];
    const database = executor((query) => {
      statements.push(query.sql);
      if (query.sql.includes("FROM evidence.evidence_requests t")) return { rows: [{ evidence_request_id: targetId, row_version: 1, lifecycle_state: "open", assigned_membership_id: membershipId, tenant_id: tenantId, created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "fulfilled", audit_event_code: definition.auditEvent, sod_policy_ref: "contract:default-deny-sod:v1", scope_kind: "tenant" }] };
      if (query.sql.includes("FROM evidence.evidence_versions ev") && !query.sql.includes("evidence.evidence_requests er")) return { rows: [{ lifecycle_state: "approved", scan_status: "passed" }] };
      if (query.sql.includes("FROM evidence.evidence_requests er")) return { rows: [{ found: 1 }] };
      if (query.sql.startsWith("UPDATE evidence.evidence_requests")) return { rows: [{ evidence_request_id: targetId, row_version: 2, lifecycle_state: "fulfilled" }] };
      if (query.sql.startsWith("INSERT INTO evidence.evidence_request_fulfillments")) return { rows: [{}] };
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    const result = await definition.execute({ transaction: database, actor: actorFor(definition), body: { expected_version: 1, evidence_version_id: evidenceVersionId }, targetId });
    expect(result).toMatchObject({ resource: "evidenceRequest", id: targetId });
    expect(statements.filter((sql) => sql.startsWith("INSERT INTO evidence.evidence_request_fulfillments"))).toHaveLength(1);
    expect(definition.auditEvent).toBe("audit.lifecycle.evidence_request.fulfill.v1");
    expect(definition.domainEvent).toBe("evidence.request.fulfilled.v1");
  });

  it("denies incompatible evidence, cross-tenant target and lost concurrency", async () => {
    const definition = mutations.get("evidenceRequestFulfill")!;
    const mismatch = executor((query) => {
      if (query.sql.includes("FROM evidence.evidence_requests t")) return { rows: [{ evidence_request_id: targetId, row_version: 1, lifecycle_state: "open", assigned_membership_id: membershipId, tenant_id: tenantId, created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "fulfilled", audit_event_code: definition.auditEvent, sod_policy_ref: "none", scope_kind: "tenant" }] };
      if (query.sql.includes("FROM evidence.evidence_versions ev") && !query.sql.includes("evidence.evidence_requests er")) return { rows: [{ lifecycle_state: "approved", scan_status: "passed" }] };
      if (query.sql.includes("FROM evidence.evidence_requests er")) return { rows: [] };
      return { rows: [] };
    });
    await expect(definition.execute({ transaction: mismatch, actor: actorFor(definition), body: { expected_version: 1, evidence_version_id: evidenceVersionId }, targetId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.INVARIANT.VIOLATION");

    const crossTenant = executor(() => ({ rows: [] }));
    await expect(definition.execute({ transaction: crossTenant, actor: actorFor(definition), body: { expected_version: 1, evidence_version_id: evidenceVersionId }, targetId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.RESOURCE.NOT_FOUND");

    let requestSelect = 0;
    const concurrent = executor((query) => {
      if (query.sql.includes("FROM evidence.evidence_requests t")) return { rows: [{ evidence_request_id: targetId, row_version: 1, lifecycle_state: "open", assigned_membership_id: membershipId, tenant_id: tenantId, created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "fulfilled", audit_event_code: definition.auditEvent, sod_policy_ref: "none", scope_kind: "tenant" }] };
      if (query.sql.includes("FROM evidence.evidence_versions ev") && !query.sql.includes("evidence.evidence_requests er")) return { rows: [{ lifecycle_state: "approved", scan_status: "passed" }] };
      if (query.sql.includes("FROM evidence.evidence_requests er")) return { rows: [{ found: 1 }] };
      if (query.sql.startsWith("UPDATE evidence.evidence_requests")) return { rows: [] };
      if (query.sql.startsWith("SELECT row_version,lifecycle_state FROM evidence.evidence_requests")) { requestSelect += 1; return { rows: [{ row_version: 2, lifecycle_state: "fulfilled" }] }; }
      return { rows: [] };
    });
    await expect(definition.execute({ transaction: concurrent, actor: actorFor(definition), body: { expected_version: 1, evidence_version_id: evidenceVersionId }, targetId }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.CONFLICT.CONCURRENCY");
    expect(requestSelect).toBe(1);
  });
});

describe("Phase 5 controlAssessmentSubmit", () => {
  it("allows the published tenant grant and derives overall effectiveness with min(design, operating)", async () => {
    const definition = mutations.get("controlAssessmentSubmit")!;
    let update: Query | undefined;
    const database = executor((query) => {
      if (query.sql.includes("FROM controls.control_assessments t")) return { rows: [{ control_assessment_id: targetId, methodology_version_ref: targetId, control_id: evidenceVersionId, row_version: 1, lifecycle_state: "in_progress", tenant_id: tenantId, created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("FROM controls.control_effectiveness_methodologies")) return { rows: [{ methodology_version_ref: targetId, minimum_coverage: 80, version_number: 1 }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "completed", audit_event_code: definition.auditEvent, sod_policy_ref: "contract:default-deny-sod:v1", scope_kind: "tenant" }] };
      if (query.sql.startsWith("UPDATE controls.control_assessments")) { update = query; return { rows: [{ control_assessment_id: targetId, methodology_version_ref: targetId, row_version: 2, lifecycle_state: "completed" }] }; }
      throw new Error(`Unexpected SQL: ${query.sql}`);
    });
    await definition.execute({ transaction: database, actor: actorFor(definition), targetId, body: { expected_version: 1, result_status: "valid", domain_conclusion: "partially_effective", design_effectiveness: 65, operating_effectiveness: 80, coverage_percent: 90 } });
    expect(update?.parameters).toContain(65);
    expect(update?.parameters.filter((value) => value === 65)).toHaveLength(2);
    expect(definition.domainEvent).toBe("controls.control_assessment.completed.v1");
  });

  it("denies creator-only owned scope and incomplete valid results", async () => {
    const definition = mutations.get("controlAssessmentSubmit")!;
    let queried = false;
    const noQuery = executor(() => { queried = true; return { rows: [] }; });
    await expect(definition.execute({ transaction: noQuery, actor: actorFor(definition, "owned_object"), targetId, body: { expected_version: 1, result_status: "valid", domain_conclusion: "effective", design_effectiveness: 90, operating_effectiveness: 90, coverage_percent: 100 } }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.AUTHORIZATION.DENIED");
    expect(queried).toBe(false);

    let updated = false;
    const incomplete = executor((query) => {
      if (query.sql.includes("FROM controls.control_assessments t")) return { rows: [{ control_assessment_id: targetId, methodology_version_ref: targetId, row_version: 1, lifecycle_state: "in_progress", tenant_id: tenantId, created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("FROM controls.control_effectiveness_methodologies")) return { rows: [{ methodology_version_ref: targetId, minimum_coverage: 80, version_number: 1 }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "completed", audit_event_code: definition.auditEvent, sod_policy_ref: "none", scope_kind: "tenant" }] };
      if (query.sql.startsWith("UPDATE")) updated = true;
      return { rows: [] };
    });
    await expect(definition.execute({ transaction: incomplete, actor: actorFor(definition), targetId, body: { expected_version: 1, result_status: "valid", domain_conclusion: "effective", design_effectiveness: 90, coverage_percent: 100 } }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.VALIDATION.FAILED");
    expect(updated).toBe(false);
  });

  it("denies cross-tenant and invalid-state submissions", async () => {
    const definition = mutations.get("controlAssessmentSubmit")!;
    const crossTenant = executor(() => ({ rows: [] }));
    await expect(definition.execute({ transaction: crossTenant, actor: actorFor(definition), targetId, body: { expected_version: 1, result_status: "insufficient_data" } }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.RESOURCE.NOT_FOUND");

    const invalidState = executor((query) => {
      if (query.sql.includes("FROM controls.control_assessments t")) return { rows: [{ control_assessment_id: targetId, methodology_version_ref: targetId, row_version: 2, lifecycle_state: "completed", tenant_id: tenantId, created_at: new Date(), created_by_user_identity_id: actorId }] };
      if (query.sql.includes("FROM controls.control_effectiveness_methodologies")) return { rows: [{ methodology_version_ref: targetId, minimum_coverage: 80, version_number: 1 }] };
      if (query.sql.includes("current_edges")) return { rows: [{ to_state: "completed", audit_event_code: definition.auditEvent, sod_policy_ref: "none", scope_kind: "tenant" }] };
      if (query.sql.startsWith("UPDATE controls.control_assessments")) return { rows: [] };
      if (query.sql.startsWith("SELECT row_version,lifecycle_state FROM controls.control_assessments")) return { rows: [{ row_version: 2, lifecycle_state: "completed" }] };
      return { rows: [] };
    });
    await expect(definition.execute({ transaction: invalidState, actor: actorFor(definition), targetId, body: { expected_version: 2, result_status: "insufficient_data" } }))
      .rejects.toSatisfy((error: unknown) => code(error) === "TCDX.LIFECYCLE.TRANSITION_DENIED");
  });
});
