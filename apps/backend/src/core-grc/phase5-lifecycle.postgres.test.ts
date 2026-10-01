import { describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import type { ScopeKind } from "@tcdx-grc/shared-types";
import { loadConfig } from "../config.js";
import { createDatabase, sql } from "../database.js";
import { FoundationError } from "../errors.js";
import type { FileStoragePort } from "../ports/file-storage.js";
import { newUuidV7 } from "../uuid.js";
import { resources, type CoreActor } from "./model.js";
import { detailResource, listResource } from "./repository.js";
import { executeMutation, mutations, type MutationDefinition } from "./service.js";
import { packVisibility } from "../regulatory/pack-entitlement.js";
import { listTenantNormativeContent } from "../regulatory/tenant-read.js";
import { listSelectableSubjects } from "./subject-read.js";

const enabled = process.env.TCDX_PHASE5_LIFECYCLE_INTEGRATION === "true";
const rollback = Symbol("isolated-phase5-rollback");

function actor(definition: MutationDefinition, tenantId: string, membershipId: string, identityId: string, role: string, scope: ScopeKind = "tenant"): CoreActor {
  return {
    tenantId,
    membershipId,
    userIdentityId: identityId,
    permissions: new Set([definition.permission]),
    scopes: new Set([scope]),
    permissionScopes: new Map([[definition.permission, new Set([scope])]]),
    capabilityGroups: new Set([definition.capability]),
    roles: [role]
  };
}

function storagePort(reject: () => boolean): FileStoragePort {
  return {
    allocateQuarantineUpload: async ({ uploadIntentId, expiresAt }) => ({
      objectKey: `quarantine/${uploadIntentId}`,
      uploadReference: "https://storage.isolated.invalid/one-time-upload",
      expiresAt: expiresAt ?? new Date(Date.now() + 300_000)
    }),
    finalizeQuarantine: async ({ fileObjectId }) => {
      if (reject()) throw new FoundationError("TCDX.FILE.MALWARE_REJECTED", "Malware rejected", 422);
      return {
        objectKey: `objects/${fileObjectId}`,
        detectedMime: "application/pdf",
        sizeBytes: 12,
        sha256: "a".repeat(64),
        scanState: "passed" as const,
        storageVersion: "isolated-version-1",
        encryptionKeyRef: "kms/isolated/evidence"
      };
    },
    removeQuarantine: async () => undefined,
    removeFinalizedObject: async () => undefined,
    createDownloadReference: async () => ({ downloadReference: "https://storage.isolated.invalid/download" }),
    uploadQuarantineContent: async () => undefined,
    openDownload: async () => Readable.from([Buffer.from("%PDF-test")])
  };
}

describe.skipIf(!enabled)("Phase 5 lifecycle PostgreSQL isolated integration", () => {
  it("persists RetentionPolicy, Storage, Evidence and ControlAssessmentSubmit with isolated actors", async () => {
    if (process.env.DATABASE_HOST !== "127.0.0.1" || process.env.DATABASE_PORT !== "55432"
      || process.env.TCDX_ISOLATED_REBUILD !== "true") {
      throw new Error("PHASE5_LIFECYCLE_TEST_REQUIRES_ISOLATED_LOCAL_POSTGRES");
    }
    const database = createDatabase(loadConfig(process.env));
    const tenantId = newUuidV7();
    const authorId = newUuidV7();
    const approverId = newUuidV7();
    const authorMembershipId = newUuidV7();
    const approverMembershipId = newUuidV7();
    let completed = false;
    try {
      await database.transaction().execute(async (tx) => {
        await sql`
          INSERT INTO iam.user_identities (user_identity_id,identity_key,display_name,lifecycle_state)
          VALUES (${authorId}::uuid,${`phase5-lifecycle:${authorId}`},'Isolated Author','active'),
                 (${approverId}::uuid,${`phase5-lifecycle:${approverId}`},'Isolated Reviewer','active')
        `.execute(tx);
        await sql`
          INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${tenantId}::uuid,${`LC-${tenantId.slice(0, 13)}`},'Isolated Lifecycle Tenant','Isolated Lifecycle Tenant','UTC',${authorId}::uuid,${authorId}::uuid)
        `.execute(tx);
        await sql`
          INSERT INTO iam.tenant_memberships (tenant_membership_id,tenant_id,user_identity_id,membership_state,joined_at,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${authorMembershipId}::uuid,${tenantId}::uuid,${authorId}::uuid,'active',transaction_timestamp(),${authorId}::uuid,${authorId}::uuid),
                 (${approverMembershipId}::uuid,${tenantId}::uuid,${approverId}::uuid,'active',transaction_timestamp(),${authorId}::uuid,${authorId}::uuid)
        `.execute(tx);

        const create = mutations.get("retentionPolicyCreate")!;
        const update = mutations.get("retentionPolicyUpdate")!;
        const review = mutations.get("retentionPolicyReview")!;
        const approve = mutations.get("retentionPolicyApprove")!;
        const publish = mutations.get("retentionPolicyPublish")!;
        const author = (definition: MutationDefinition) => actor(definition, tenantId, authorMembershipId, authorId, "PRIVACY_MANAGER");
        const legalReviewer = actor(approve, tenantId, approverMembershipId, approverId, "LEGAL_REVIEWER");
        const body = {
          policy_code: `ISOLATED-EVIDENCE-7Y-${tenantId.slice(0, 8)}`,
          version_number: 1,
          policy_kind: "tenant_policy",
          retention_seconds: 220752000,
          trigger_event_code: "expiry_or_closure",
          precedence_rank: 200,
          is_mandatory: false
        };
        const createKey = newUuidV7();
        const created = await executeMutation(tx, author(create), create, { body, idempotencyKey: createKey, correlationId: newUuidV7() });
        const policyId = created.response.retention_policy_id as string;
        expect(created.response).toMatchObject({ lifecycle_state: "draft", effective_from: null, row_version: 1 });
        const replay = await executeMutation(tx, author(create), create, { body, idempotencyKey: createKey, correlationId: newUuidV7() });
        expect(replay.replayed).toBe(true);
        expect(replay.response.retention_policy_id).toBe(policyId);

        const reader: CoreActor = {
          ...author(create), permissions: new Set(["privacy.retention_policy.read"]),
          permissionScopes: new Map([["privacy.retention_policy.read", new Set(["tenant"])]])
        };
        expect((await listResource(tx, reader, resources.retentionPolicy, {})).items.some((item) => item.retention_policy_id === policyId)).toBe(true);
        expect((await detailResource(tx, reader, resources.retentionPolicy, policyId)).retention_policy_id).toBe(policyId);
        const foreignReader = { ...reader, tenantId: newUuidV7() };
        await expect(detailResource(tx, foreignReader, resources.retentionPolicy, policyId)).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        const deniedReader = { ...reader, permissionScopes: new Map<string, Set<ScopeKind>>() };
        await expect(detailResource(tx, deniedReader, resources.retentionPolicy, policyId)).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        await expect(update.execute({ transaction: tx, actor: { ...author(update), tenantId: newUuidV7() }, body: { expected_version: 1, retention_seconds: 220752000, is_mandatory: false }, targetId: policyId, correlationId: newUuidV7() })).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        await expect(executeMutation(tx, { ...author(update), permissionScopes: new Map(), permissions: new Set() }, update, {
          body: { expected_version: 1, retention_seconds: 220752000, is_mandatory: false }, targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });

        const updated = await executeMutation(tx, author(update), update, {
          body: { expected_version: 1, retention_seconds: 220752000, is_mandatory: false },
          targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(updated.response).toMatchObject({ lifecycle_state: "draft", row_version: 2 });
        await expect(executeMutation(tx, author(update), update, {
          body: { expected_version: 1, retention_seconds: 220752000, is_mandatory: false },
          targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.CONFLICT.CONCURRENCY" });

        const reviewed = await executeMutation(tx, author(review), review, {
          body: { expected_version: 2 }, targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(reviewed.response).toMatchObject({ lifecycle_state: "under_review", row_version: 3, effective_from: null });
        await expect(executeMutation(tx, author(approve), approve, {
          body: { expected_version: 3 }, targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        const approved = await executeMutation(tx, legalReviewer, approve, {
          body: { expected_version: 3 }, targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(approved.response).toMatchObject({ lifecycle_state: "approved", row_version: 4, effective_from: null });
        const published = await executeMutation(tx, author(publish), publish, {
          body: { expected_version: 4 }, targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(published.response).toMatchObject({ lifecycle_state: "published", row_version: 5 });
        expect(published.response.effective_from).toBeTruthy();
        await expect(executeMutation(tx, author(publish), publish, {
          body: { expected_version: 5 }, targetId: policyId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED" });

        const effects = await sql<{ audits: number; events: number; policies: number }>`
          SELECT
            (SELECT count(*)::integer FROM ops_audit.audit_events WHERE tenant_id=${tenantId}::uuid AND aggregate_id=${policyId}::uuid
               AND event_code IN ('audit.privacy.retention_policy.create.v1','audit.privacy.retention_policy.update.v1','audit.privacy.retention_policy.review.v1',
                                  'audit.privacy.retention_policy.approve.v1','audit.privacy.retention_policy.publish.v1')) AS audits,
            (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE tenant_id=${tenantId}::uuid AND aggregate_id=${policyId}::uuid
               AND event_type='privacy.retention_policy.published.v1') AS events,
            (SELECT count(*)::integer FROM privacy.retention_policies WHERE tenant_id=${tenantId}::uuid AND retention_policy_id=${policyId}::uuid) AS policies
        `.execute(tx);
        expect(effects.rows[0]).toMatchObject({ audits: 5, events: 1, policies: 1 });

        const uploadCreate = mutations.get("uploadIntentCreate")!;
        const uploadFinalize = mutations.get("uploadFinalize")!;
        const fileOwner = (definition: MutationDefinition) => actor(definition, tenantId, authorMembershipId, authorId, "EVIDENCE_OWNER");
        let rejectMalware = false;
        const storage = storagePort(() => rejectMalware);
        const uploadBody = {
          original_filename: "isolated-evidence.pdf",
          declared_mime: "application/pdf",
          size_bytes: 12,
          classification: "confidential",
          retention_policy_id: policyId,
          source_provenance: "isolated-test-upload"
        };
        const upload = await executeMutation(tx, fileOwner(uploadCreate), uploadCreate, {
          body: uploadBody, idempotencyKey: newUuidV7(), correlationId: newUuidV7(), fileStorage: storage
        });
        const uploadId = upload.response.upload_intent_id as string;
        expect(upload.response.upload_url).toBe(`/api/v1/file-upload-intents/${uploadId}/content`);
        const finalized = await executeMutation(tx, fileOwner(uploadFinalize), uploadFinalize, {
          body: { expected_version: 1 }, targetId: uploadId, idempotencyKey: newUuidV7(), correlationId: newUuidV7(), fileStorage: storage
        });
        const fileId = finalized.response.file_object_id as string;
        expect(finalized.response).toMatchObject({ scan_status: "passed", retention_policy_id: policyId });
        const stored = await sql<{ intent_state: string; objects: number; leaked_url: number }>`
          SELECT
            (SELECT lifecycle_state FROM evidence.file_upload_intents WHERE tenant_id=${tenantId}::uuid AND file_upload_intent_id=${uploadId}::uuid) AS intent_state,
            (SELECT count(*)::integer FROM evidence.file_objects WHERE tenant_id=${tenantId}::uuid) AS objects,
            (SELECT count(*)::integer FROM ops_audit.audit_events WHERE tenant_id=${tenantId}::uuid
               AND after_payload::text LIKE '%one-time-upload%') AS leaked_url
        `.execute(tx);
        expect(stored.rows[0]).toMatchObject({ intent_state: "promoted", objects: 1, leaked_url: 0 });
        const infected = await executeMutation(tx, fileOwner(uploadCreate), uploadCreate, {
          body: { ...uploadBody, original_filename: "infected.pdf" }, idempotencyKey: newUuidV7(), correlationId: newUuidV7(), fileStorage: storage
        });
        rejectMalware = true;
        const rejected = await executeMutation(tx, fileOwner(uploadFinalize), uploadFinalize, {
          body: { expected_version: 1 }, targetId: infected.response.upload_intent_id as string,
          idempotencyKey: newUuidV7(), correlationId: newUuidV7(), fileStorage: storage
        });
        expect(rejected.deferredError?.code).toBe("TCDX.FILE.MALWARE_REJECTED");
        const rejectState = await sql<{ lifecycle_state: string; objects: number }>`
          SELECT lifecycle_state,(SELECT count(*)::integer FROM evidence.file_objects WHERE tenant_id=${tenantId}::uuid) AS objects
            FROM evidence.file_upload_intents WHERE tenant_id=${tenantId}::uuid
             AND file_upload_intent_id=${infected.response.upload_intent_id as string}::uuid
        `.execute(tx);
        expect(rejectState.rows[0]).toMatchObject({ lifecycle_state: "rejected", objects: 1 });
        rejectMalware = false;

        const subjectId = newUuidV7();
        await sql`
          INSERT INTO org.subjects (subject_id,tenant_id,subject_type,canonical_key,display_name,lifecycle_state,effective_from,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${subjectId}::uuid,${tenantId}::uuid,'person',${`isolated-owner:${subjectId}`},'Isolated Control Owner','active',transaction_timestamp(),${authorId}::uuid,${authorId}::uuid)
        `.execute(tx);
        const futureSubjectId = newUuidV7();
        const archivedSubjectId = newUuidV7();
        const otherTenantId = newUuidV7();
        const foreignSubjectId = newUuidV7();
        await sql`INSERT INTO platform.tenants (tenant_id,tenant_code,legal_name,display_name,default_timezone,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${otherTenantId}::uuid,${`LC-${otherTenantId.slice(0, 13)}`},'Foreign tenant','Foreign tenant','UTC',${authorId}::uuid,${authorId}::uuid)`.execute(tx);
        await sql`INSERT INTO org.subjects (subject_id,tenant_id,subject_type,canonical_key,display_name,lifecycle_state,effective_from,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${foreignSubjectId}::uuid,${otherTenantId}::uuid,'process',${`foreign:${foreignSubjectId}`},'Foreign Owner','active',transaction_timestamp(),${authorId}::uuid,${authorId}::uuid)`.execute(tx);
        await sql`
          INSERT INTO org.subjects (subject_id,tenant_id,subject_type,canonical_key,display_name,lifecycle_state,effective_from,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${futureSubjectId}::uuid,${tenantId}::uuid,'process',${`future:${futureSubjectId}`},'Future Owner','active',transaction_timestamp()+interval '1 day',${authorId}::uuid,${authorId}::uuid),
                 (${archivedSubjectId}::uuid,${tenantId}::uuid,'process',${`archived:${archivedSubjectId}`},'Archived Owner','archived',transaction_timestamp()-interval '1 day',${authorId}::uuid,${authorId}::uuid)
        `.execute(tx);
        const subjectReader = actor(mutations.get("controlInstantiate")!, tenantId, authorMembershipId, authorId, "CONTROL_OWNER");
        const selectedSubjects = await listSelectableSubjects(tx, subjectReader, { "filter[query]": "Control Owner" });
        expect(selectedSubjects.items.map((item) => item.subject_id)).toContain(subjectId);
        expect(selectedSubjects.items[0]).toEqual({ subject_id: subjectId, subject_type: "person", canonical_key: `isolated-owner:${subjectId}`, display_name: "Isolated Control Owner", lifecycle_state: "active" });
        expect((await listSelectableSubjects(tx, subjectReader, {})).items.map((item) => item.subject_id))
          .not.toEqual(expect.arrayContaining([futureSubjectId, archivedSubjectId, foreignSubjectId]));
        const reference = await sql<{ control_id: string; control_version_id: string; regulatory_pack_version_id: string; framework_version_id: string }>`
          SELECT cv.control_id,cv.control_version_id,pfv.regulatory_pack_version_id,r.framework_version_id
            FROM controls.control_versions cv
            JOIN regulatory.requirement_control_mappings rcm ON rcm.control_version_id=cv.control_version_id
            JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
            JOIN regulatory.regulatory_pack_framework_versions pfv ON pfv.framework_version_id=r.framework_version_id
            JOIN regulatory.regulatory_pack_versions pv ON pv.regulatory_pack_version_id=pfv.regulatory_pack_version_id
           WHERE cv.ownership_class='PLATFORM_CONTROL'
             AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
             AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
             AND EXISTS (
               SELECT 1 FROM regulatory.requirement_control_mappings other_mapping
               JOIN regulatory.requirements other_requirement ON other_requirement.requirement_id=other_mapping.requirement_id
                WHERE other_mapping.control_version_id=cv.control_version_id
                  AND other_requirement.framework_version_id<>r.framework_version_id
             )
           ORDER BY cv.control_version_id LIMIT 1
        `.execute(tx);
        const globalControlVersionId = reference.rows[0]?.control_version_id;
        const packVersionId = reference.rows[0]?.regulatory_pack_version_id;
        if (!globalControlVersionId || !packVersionId) throw new Error("CATALOG_V1_1_MUST_BE_IMPORTED_BEFORE_PHASE5_INTEGRATION");
        await sql`UPDATE regulatory.regulatory_packs SET lifecycle_state='published'
          WHERE regulatory_pack_id=(SELECT regulatory_pack_id FROM regulatory.regulatory_pack_versions WHERE regulatory_pack_version_id=${packVersionId}::uuid)`.execute(tx);
        await sql`UPDATE regulatory.regulatory_pack_versions SET lifecycle_state='published'
          WHERE regulatory_pack_version_id=${packVersionId}::uuid`.execute(tx);
        const plan = await sql<{ plan_version_id: string }>`
          SELECT plan_version_id FROM platform.plan_versions WHERE lifecycle_state='published' ORDER BY plan_version_id LIMIT 1
        `.execute(tx);
        const planVersionId = plan.rows[0]?.plan_version_id;
        if (!planVersionId) throw new Error("PUBLISHED_PLAN_VERSION_REQUIRED");
        const subscriptionId = newUuidV7();
        const assignmentId = newUuidV7();
        await sql`
          INSERT INTO platform.subscriptions
            (subscription_id,tenant_id,plan_version_id,subscription_code,lifecycle_state,starts_at,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${subscriptionId}::uuid,${tenantId}::uuid,${planVersionId}::uuid,${`LC-${subscriptionId.slice(0, 13)}`},'active',transaction_timestamp(),${authorId}::uuid,${authorId}::uuid)
        `.execute(tx);
        await sql`
          INSERT INTO platform.subscription_regulatory_packs
            (subscription_regulatory_pack_id,tenant_id,subscription_id,regulatory_pack_version_id,lifecycle_state,effective_from,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${assignmentId}::uuid,${tenantId}::uuid,${subscriptionId}::uuid,${packVersionId}::uuid,'active',transaction_timestamp()-interval '1 day',${authorId}::uuid,${authorId}::uuid)
        `.execute(tx);
        const visible = await packVisibility(tx, tenantId);
        expect(visible.frameworkVersionIds.has(reference.rows[0]!.framework_version_id)).toBe(true);
        expect(visible.globalControlVersionIds.has(globalControlVersionId)).toBe(true);
        const otherFramework = await sql<{ framework_version_id: string }>`
          SELECT r.framework_version_id FROM regulatory.requirement_control_mappings rcm
          JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
          WHERE rcm.control_version_id=${globalControlVersionId}::uuid
            AND r.framework_version_id<>${reference.rows[0]!.framework_version_id}::uuid
          ORDER BY r.framework_version_id LIMIT 1
        `.execute(tx);
        const hiddenFrameworkId = otherFramework.rows[0]!.framework_version_id;
        expect(visible.frameworkVersionIds.has(hiddenFrameworkId)).toBe(false);
        const coveredRequirement = await sql<{ requirement_id: string }>`
          SELECT requirement_id FROM regulatory.requirements
          WHERE framework_version_id=${reference.rows[0]!.framework_version_id}::uuid
          ORDER BY requirement_id LIMIT 1
        `.execute(tx);
        const applicabilityCreate = mutations.get("applicabilityCreate")!;
        const applicabilitySubmit = mutations.get("applicabilitySubmit")!;
        const applicabilityApprove = mutations.get("applicabilityApprove")!;
        const noApplyReason = "La obligación no corresponde al alcance documentado de esta organización.";
        const applicabilityCreated = await executeMutation(tx, actor(applicabilityCreate, tenantId, authorMembershipId, authorId, "COMPLIANCE_MANAGER"), applicabilityCreate, {
          body: { requirement_id: coveredRequirement.rows[0]!.requirement_id, applicability_decision: "not_applicable", rationale: noApplyReason, effective_from: new Date().toISOString() },
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        const applicabilityId = String(applicabilityCreated.response.requirement_applicability_id);
        await executeMutation(tx, actor(applicabilitySubmit, tenantId, authorMembershipId, authorId, "COMPLIANCE_MANAGER"), applicabilitySubmit, {
          body: { expected_version: 1, rationale: noApplyReason }, targetId: applicabilityId,
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        await expect(executeMutation(tx, actor(applicabilityApprove, tenantId, authorMembershipId, authorId, "COMPLIANCE_MANAGER"), applicabilityApprove, {
          body: { expected_version: 2 }, targetId: applicabilityId,
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        const applicabilityApproved = await executeMutation(tx, actor(applicabilityApprove, tenantId, approverMembershipId, approverId, "LEGAL_REVIEWER"), applicabilityApprove, {
          body: { expected_version: 2 }, targetId: applicabilityId,
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(applicabilityApproved.response).toMatchObject({ applicability_decision: "not_applicable", rationale: noApplyReason, lifecycle_state: "approved" });
        const applicableCreated = await executeMutation(tx, actor(applicabilityCreate, tenantId, authorMembershipId, authorId, "COMPLIANCE_MANAGER"), applicabilityCreate, {
          body: { requirement_id: coveredRequirement.rows[0]!.requirement_id, applicability_decision: "applicable", effective_from: new Date().toISOString() },
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(applicableCreated.response).toMatchObject({ applicability_decision: "applicable", rationale: "", lifecycle_state: "draft" });
        const autoResults = await sql<{ assessments: number }>`
          SELECT count(*)::integer AS assessments FROM regulatory.requirement_assessments
          WHERE tenant_id=${tenantId}::uuid AND requirement_applicability_id=${String(applicableCreated.response.requirement_applicability_id)}::uuid
        `.execute(tx);
        expect(autoResults.rows[0]?.assessments).toBe(0);
        const controlReader: CoreActor = {
          ...actor(mutations.get("controlInstantiate")!, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"),
          permissions: new Set([resources.control.permission]),
          permissionScopes: new Map([[resources.control.permission, new Set(["tenant"])]])
        };
        const sharedDetail = await detailResource(tx, controlReader, resources.control, reference.rows[0]!.control_id);
        expect((sharedDetail.normative_relations as Array<{ framework_version_id: string }>).some((relation) => relation.framework_version_id === reference.rows[0]!.framework_version_id)).toBe(true);
        expect((sharedDetail.normative_relations as Array<{ framework_version_id: string }>).some((relation) => relation.framework_version_id === hiddenFrameworkId)).toBe(false);
        const permittedCatalog = await listResource(tx, controlReader, resources.control, {
          "filter[framework_version_id]": reference.rows[0]!.framework_version_id,
          "filter[query]": String(sharedDetail.control_code)
        });
        const sharedSummary = permittedCatalog.items.find((item) => item.control_id === reference.rows[0]!.control_id);
        expect(sharedSummary).toBeDefined();
        expect(permittedCatalog.framework_filters?.some((framework) => framework.framework_version_id === reference.rows[0]!.framework_version_id)).toBe(true);
        expect(permittedCatalog.framework_filters?.some((framework) => framework.framework_version_id === hiddenFrameworkId)).toBe(false);
        expect((sharedSummary!.normative_frameworks as Array<{ framework_version_id: string }>).every((framework) => framework.framework_version_id !== hiddenFrameworkId)).toBe(true);
        expect((await listResource(tx, controlReader, resources.control, { "filter[framework_version_id]": hiddenFrameworkId })).items).toEqual([]);
        expect((await listResource(tx, controlReader, resources.control, { "filter[query]": String(sharedDetail.control_code) })).items.some((item) => item.control_id === reference.rows[0]!.control_id)).toBe(true);
        const hiddenOnlyControl = await sql<{ control_id: string }>`
          SELECT cv.control_id FROM controls.control_versions cv
          JOIN regulatory.requirement_control_mappings rcm ON rcm.control_version_id=cv.control_version_id
          JOIN regulatory.requirements r ON r.requirement_id=rcm.requirement_id
          WHERE cv.tenant_id IS NULL AND r.framework_version_id<>${reference.rows[0]!.framework_version_id}::uuid
            AND NOT EXISTS (
              SELECT 1 FROM regulatory.requirement_control_mappings permitted_mapping
              JOIN regulatory.requirements permitted_requirement ON permitted_requirement.requirement_id=permitted_mapping.requirement_id
              WHERE permitted_mapping.control_version_id=cv.control_version_id
                AND permitted_requirement.framework_version_id=${reference.rows[0]!.framework_version_id}::uuid
            )
          ORDER BY cv.control_id LIMIT 1
        `.execute(tx);
        if (!hiddenOnlyControl.rows[0]) throw new Error("SHARED_CONTROL_NEGATIVE_FIXTURE_REQUIRED");
        await expect(detailResource(tx, controlReader, resources.control, hiddenOnlyControl.rows[0].control_id))
          .rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        await expect(listTenantNormativeContent(tx, controlReader, hiddenFrameworkId, "requirements", {})).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        expect((await listTenantNormativeContent(tx, controlReader, reference.rows[0]!.framework_version_id, "requirements", {})).items.length).toBeGreaterThan(0);
        const instantiate = mutations.get("controlInstantiate")!;
        const controlBody = {
            based_on_control_version_id: globalControlVersionId,
            control_code: `ISOLATED-${tenantId.slice(0, 8)}`,
            name: "Isolated Tenant Control",
            business_owner_subject_id: subjectId,
            objective: "Verify isolated evidence",
            control_type: "preventive",
            nature: "manual",
            frequency_code: "annual",
            execution_method: "inspection",
            verification_method: "review",
            minimum_evidence: "approved evidence"
          };
        await expect(executeMutation(tx, actor(instantiate, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"), instantiate, {
          body: { ...controlBody, business_owner_subject_id: foreignSubjectId }, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        for (const unavailableSubjectId of [futureSubjectId, archivedSubjectId]) {
          await expect(executeMutation(tx, actor(instantiate, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"), instantiate, {
            body: { ...controlBody, business_owner_subject_id: unavailableSubjectId }, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
          })).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        }
        const instantiated = await executeMutation(tx, actor(instantiate, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"), instantiate, {
          body: controlBody, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        const controlId = instantiated.response.control_id as string;
        await expect(detailResource(tx, { ...controlReader, tenantId: newUuidV7() }, resources.control, controlId))
          .rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        const versions = instantiated.response.versions as Array<{ control_version_id: string }>;
        const controlVersionId = versions[0]!.control_version_id;
        const assessmentCreate = mutations.get("controlAssessmentCreate")!;
        const assessmentStart = mutations.get("controlAssessmentStart")!;
        const assessmentSubmit = mutations.get("controlAssessmentSubmit")!;
        const assessment = await executeMutation(tx, actor(assessmentCreate, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"), assessmentCreate, {
          body: { control_id: controlId, control_version_id: controlVersionId, methodology_version_ref: newUuidV7() },
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        const assessmentId = assessment.response.control_assessment_id as string;
        await expect(executeMutation(tx, { ...actor(assessmentStart, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"), permissions: new Set(), permissionScopes: new Map() }, assessmentStart, {
          body: { expected_version: 1 }, targetId: assessmentId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        await expect(assessmentStart.execute({ transaction: tx, actor: actor(assessmentStart, newUuidV7(), authorMembershipId, authorId, "CONTROL_OWNER"), body: { expected_version: 1 }, targetId: assessmentId, correlationId: newUuidV7() })).rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        const startedAssessment = await executeMutation(tx, actor(assessmentStart, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"), assessmentStart, {
          body: { expected_version: 1 }, targetId: assessmentId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(startedAssessment.response).toMatchObject({ lifecycle_state: "in_progress", row_version: 2 });
        const submittedAssessment = await executeMutation(tx, actor(assessmentSubmit, tenantId, authorMembershipId, authorId, "CONTROL_OWNER"), assessmentSubmit, {
          body: { expected_version: 2, result_status: "valid", domain_conclusion: "partially_effective", design_effectiveness: 65, operating_effectiveness: 80, coverage_percent: 90 },
          targetId: assessmentId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(submittedAssessment.response).toMatchObject({ lifecycle_state: "completed", overall_effectiveness: 65 });

        const evidenceCreate = mutations.get("evidenceCreate")!;
        const evidenceSubmit = mutations.get("evidenceSubmit")!;
        const reviewStart = mutations.get("evidenceReviewStart")!;
        const evidenceApprove = mutations.get("evidenceApprove")!;
        const requestCreate = mutations.get("evidenceRequestCreate")!;
        const requestFulfill = mutations.get("evidenceRequestFulfill")!;
        const evidence = await executeMutation(tx, fileOwner(evidenceCreate), evidenceCreate, {
          body: {
            evidence_code: `ISOLATED-${tenantId.slice(0, 8)}`,
            evidence_type: "document",
            retention_policy_id: policyId,
            source_kind: "uploaded",
            file_object_id: fileId,
            provenance_ref: "isolated-upload",
            links: [{ control_id: controlId, claim: "Exact control evidence" }]
          }, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        const evidenceVersionId = (evidence.response.versions as Array<{ evidence_version_id: string }>)[0]!.evidence_version_id;
        await executeMutation(tx, actor(evidenceSubmit, tenantId, authorMembershipId, authorId, "EVIDENCE_OWNER", "owned_object"), evidenceSubmit, {
          body: { expected_version: 1 }, targetId: evidenceVersionId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        await executeMutation(tx, actor(reviewStart, tenantId, approverMembershipId, approverId, "EVIDENCE_REVIEWER"), reviewStart, {
          body: { expected_version: 2 }, targetId: evidenceVersionId, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        await sql`SAVEPOINT phase5_evidence_self_approval`.execute(tx);
        await expect(executeMutation(tx, actor(evidenceApprove, tenantId, authorMembershipId, authorId, "EVIDENCE_OWNER"), evidenceApprove, {
          body: { expected_version: 3, rationale: "Self approval forbidden" }, targetId: evidenceVersionId,
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        await sql`ROLLBACK TO SAVEPOINT phase5_evidence_self_approval`.execute(tx);
        const approvedEvidence = await executeMutation(tx, actor(evidenceApprove, tenantId, approverMembershipId, approverId, "EVIDENCE_REVIEWER"), evidenceApprove, {
          body: { expected_version: 3, rationale: "Independent isolated review" }, targetId: evidenceVersionId,
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(approvedEvidence.response.lifecycle_state).toBe("approved");
        const request = await executeMutation(tx, fileOwner(requestCreate), requestCreate, {
          body: { request_code: `ISOLATED-REQ-${tenantId.slice(0, 8)}`, control_id: controlId, assigned_membership_id: authorMembershipId },
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        const fulfilled = await executeMutation(tx, fileOwner(requestFulfill), requestFulfill, {
          body: { expected_version: 1, evidence_version_id: evidenceVersionId },
          targetId: request.response.evidence_request_id as string, idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        });
        expect(fulfilled.response.lifecycle_state).toBe("fulfilled");
        const closeout = await sql<{ fulfilled: number; fulfill_audit: number; fulfill_event: number; assessment_audit: number; assessment_event: number }>`
          SELECT
            (SELECT count(*)::integer FROM evidence.evidence_request_fulfillments WHERE tenant_id=${tenantId}::uuid) AS fulfilled,
            (SELECT count(*)::integer FROM ops_audit.audit_events WHERE tenant_id=${tenantId}::uuid AND event_code='audit.lifecycle.evidence_request.fulfill.v1') AS fulfill_audit,
            (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE tenant_id=${tenantId}::uuid AND event_type='evidence.request.fulfilled.v1') AS fulfill_event,
            (SELECT count(*)::integer FROM ops_audit.audit_events WHERE tenant_id=${tenantId}::uuid AND event_code='audit.controls.control_assessment.complete.v1') AS assessment_audit,
            (SELECT count(*)::integer FROM ops_audit.outbox_events WHERE tenant_id=${tenantId}::uuid AND event_type='controls.control_assessment.completed.v1') AS assessment_event
        `.execute(tx);
        expect(closeout.rows[0]).toMatchObject({ fulfilled: 1, fulfill_audit: 1, fulfill_event: 1, assessment_audit: 1, assessment_event: 1 });
        await sql`
          UPDATE platform.subscription_regulatory_packs SET lifecycle_state='revoked',effective_to=transaction_timestamp(),
            row_version=row_version+1,updated_at=transaction_timestamp(),updated_by_user_identity_id=${authorId}::uuid
          WHERE subscription_regulatory_pack_id=${assignmentId}::uuid AND tenant_id=${tenantId}::uuid
        `.execute(tx);
        expect((await packVisibility(tx, tenantId)).globalControlVersionIds.size).toBe(0);
        const preservedApplicability = await sql<{ count: number }>`
          SELECT count(*)::integer AS count FROM regulatory.requirement_applicabilities
          WHERE tenant_id=${tenantId}::uuid AND requirement_applicability_id=${applicabilityId}::uuid
            AND lifecycle_state='approved' AND rationale=${noApplyReason}
        `.execute(tx);
        expect(preservedApplicability.rows[0]?.count).toBe(1);
        await expect(detailResource(tx, controlReader, resources.control, reference.rows[0]!.control_id))
          .rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });
        completed = true;
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
      const residue = await sql<{ tenants: number; identities: number }>`
        SELECT
          (SELECT count(*)::integer FROM platform.tenants WHERE tenant_id=${tenantId}::uuid) AS tenants,
          (SELECT count(*)::integer FROM iam.user_identities WHERE user_identity_id IN (${authorId}::uuid,${approverId}::uuid)) AS identities
      `.execute(database);
      expect(residue.rows[0]).toMatchObject({ tenants: 0, identities: 0 });
    } finally {
      await database.destroy();
    }
    expect(completed).toBe(true);
  });
});
