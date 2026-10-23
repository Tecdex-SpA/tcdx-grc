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
import {readVocabularyProvenance} from "./vocabulary-provenance.js";
import {VOCABULARY_MANIFEST_SHA256} from "@tcdx-grc/contracts";
import { buildApp } from "../app.js";
import type { Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { readFileSync } from "node:fs";

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
    const isolated = (process.env.DATABASE_PORT === "55432" && process.env.TCDX_ISOLATED_REBUILD === "true")
      || (process.env.DATABASE_PORT !== undefined && process.env.DATABASE_PORT !== "5432"
        && process.env.TCDX_C04W_ISOLATED_REBUILD === "true");
    if (process.env.DATABASE_HOST !== "127.0.0.1" || !isolated) {
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

        const retentionApplicabilityId = newUuidV7();
        await sql`INSERT INTO privacy.retention_policy_applicabilities
          (retention_policy_applicability_id,tenant_id,retention_policy_id,version_number,
           classification,purpose,lifecycle_state,created_by_user_identity_id)
          VALUES (${retentionApplicabilityId}::uuid,${tenantId}::uuid,${policyId}::uuid,1,
                  'confidential','evidence_document','draft',${authorId}::uuid)`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='under_review',row_version=2
          WHERE retention_policy_applicability_id=${retentionApplicabilityId}::uuid`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='approved',row_version=3
          WHERE retention_policy_applicability_id=${retentionApplicabilityId}::uuid`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities
          SET lifecycle_state='published',row_version=4,effective_from=transaction_timestamp(),
              published_at=transaction_timestamp()
          WHERE retention_policy_applicability_id=${retentionApplicabilityId}::uuid`.execute(tx);

        const holdPolicyId = newUuidV7();
        const holdApplicabilityId = newUuidV7();
        const reviewerRoleId = newUuidV7();
        const releasePermissionId = newUuidV7();
        await sql`INSERT INTO privacy.retention_policies
          (retention_policy_id,ownership_class,tenant_id,policy_code,version_number,
           policy_kind,retention_seconds,trigger_event_code,precedence_rank,is_mandatory,
           lifecycle_state,effective_from,created_by_user_identity_id)
          VALUES (${holdPolicyId}::uuid,'TENANT_OWNED',${tenantId}::uuid,
                  ${`ISOLATED-HOLD-${holdPolicyId.slice(0, 8)}`},1,'legal_hold',NULL,
                  'expiry_or_closure',500,true,'published',transaction_timestamp(),${authorId}::uuid)`.execute(tx);
        await sql`INSERT INTO privacy.retention_policy_applicabilities
          (retention_policy_applicability_id,tenant_id,retention_policy_id,version_number,
           classification,purpose,lifecycle_state,created_by_user_identity_id)
          VALUES (${holdApplicabilityId}::uuid,${tenantId}::uuid,${holdPolicyId}::uuid,1,
                  'confidential','evidence_document','draft',${authorId}::uuid)`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='under_review',row_version=2
          WHERE retention_policy_applicability_id=${holdApplicabilityId}::uuid`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='approved',row_version=3
          WHERE retention_policy_applicability_id=${holdApplicabilityId}::uuid`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities
          SET lifecycle_state='published',row_version=4,effective_from=transaction_timestamp(),
              published_at=transaction_timestamp()
          WHERE retention_policy_applicability_id=${holdApplicabilityId}::uuid`.execute(tx);
        await sql`INSERT INTO iam.roles
          (role_id,ownership_class,tenant_id,role_code,name,lifecycle_state)
          VALUES (${reviewerRoleId}::uuid,'TENANT_OWNED',${tenantId}::uuid,
                  'LEGAL_REVIEWER','Isolated Legal Reviewer','published')`.execute(tx);
        await sql`INSERT INTO iam.permissions
          (permission_id,permission_code,domain_code,resource_code,action_code,lifecycle_state)
          VALUES (${releasePermissionId}::uuid,'privacy.retention_policy.legal_hold.release',
                  'privacy','retention_policy','release','published')`.execute(tx);
        await sql`INSERT INTO iam.role_permissions
          (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
          VALUES (${newUuidV7()}::uuid,'TENANT_OWNED',${tenantId}::uuid,
                  ${reviewerRoleId}::uuid,${releasePermissionId}::uuid)`.execute(tx);
        await sql`INSERT INTO iam.membership_roles
          (membership_role_id,tenant_id,tenant_membership_id,role_id,scope_kind,valid_from)
          VALUES (${newUuidV7()}::uuid,${tenantId}::uuid,${approverMembershipId}::uuid,
                  ${reviewerRoleId}::uuid,'tenant',transaction_timestamp())`.execute(tx);
        const releaseDefinition = mutations.get("legalHoldRelease")!;
        await expect(executeMutation(tx, actor(releaseDefinition, tenantId, authorMembershipId, authorId, "TENANT_ADMIN"), releaseDefinition, {
          body: { expected_version: 4, reason: "Unauthorized" }, targetId: holdApplicabilityId,
          idempotencyKey: newUuidV7(), correlationId: newUuidV7()
        })).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        const releaseInput = { body: { expected_version: 4, reason: "Reviewed isolated hold" },
          targetId: holdApplicabilityId, idempotencyKey: newUuidV7(), correlationId: newUuidV7() };
        const released = await executeMutation(tx,
          actor(releaseDefinition, tenantId, approverMembershipId, approverId, "LEGAL_REVIEWER"),
          releaseDefinition, releaseInput);
        expect(released.response).toMatchObject({
          retention_policy_applicability_id: holdApplicabilityId, lifecycle_state: "released"
        });
        const replayedRelease = await executeMutation(tx,
          actor(releaseDefinition, tenantId, approverMembershipId, approverId, "LEGAL_REVIEWER"),
          releaseDefinition, { ...releaseInput, correlationId: newUuidV7() });
        expect(replayedRelease.replayed).toBe(true);
        const releaseEvidence = await sql<{ release_count: number; audit_count: number }>`
          SELECT (SELECT count(*)::integer FROM privacy.retention_policy_hold_releases
                   WHERE tenant_id=${tenantId}::uuid AND retention_policy_applicability_id=${holdApplicabilityId}::uuid) AS release_count,
                 (SELECT count(*)::integer FROM ops_audit.audit_events
                   WHERE tenant_id=${tenantId}::uuid AND aggregate_id=${holdApplicabilityId}::uuid
                     AND event_code='audit.privacy.retention_policy.legal_hold.release.v1') AS audit_count
        `.execute(tx);
        expect(releaseEvidence.rows[0]).toEqual({ release_count: 1, audit_count: 1 });
        await expect(executeMutation(tx,
          actor(releaseDefinition, tenantId, approverMembershipId, approverId, "LEGAL_REVIEWER"),
          releaseDefinition, { ...releaseInput, idempotencyKey: newUuidV7() }))
          .rejects.toMatchObject({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED" });
        await expect(releaseDefinition.execute({ transaction: tx,
          actor: actor(releaseDefinition, newUuidV7(), approverMembershipId, approverId, "LEGAL_REVIEWER"),
          ...releaseInput, auditEventId: newUuidV7() }))
          .rejects.toMatchObject({ code: "TCDX.RESOURCE.NOT_FOUND" });

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
          retention_policy_applicability_id: retentionApplicabilityId,
          source_provenance: "isolated-test-upload"
        };
        // Technical fixtures only, never a source of legal or QA acceptance evidence.
        for (const body of [
          { ...uploadBody, classification: "public" },
          { ...uploadBody, retention_policy_id: holdPolicyId },
          { ...uploadBody, retention_policy_applicability_id: holdApplicabilityId }
        ]) {
          await expect(executeMutation(tx, fileOwner(uploadCreate), uploadCreate, {
            body, idempotencyKey: newUuidV7(), correlationId: newUuidV7(), fileStorage: storage
          })).rejects.toMatchObject({ code: "TCDX.INVARIANT.VIOLATION" });
        }
        await expect(uploadCreate.execute({ transaction: tx,
          actor: { ...fileOwner(uploadCreate), tenantId: newUuidV7() }, body: uploadBody,
          correlationId: newUuidV7(), fileStorage: storage }))
          .rejects.toMatchObject({ code: "TCDX.INVARIANT.VIOLATION" });
        for (const deniedActor of [
          { ...fileOwner(uploadCreate), permissions: new Set<string>() },
          { ...fileOwner(uploadCreate), capabilityGroups: new Set<string>() }
        ]) {
          await expect(executeMutation(tx, deniedActor, uploadCreate, {
            body: uploadBody, idempotencyKey: newUuidV7(), correlationId: newUuidV7(), fileStorage: storage
          })).rejects.toBeInstanceOf(FoundationError);
        }
        const deniedUploads = await sql<{ count: number }>`SELECT count(*)::integer AS count
          FROM evidence.file_upload_intents WHERE tenant_id=${tenantId}::uuid`.execute(tx);
        expect(deniedUploads.rows[0]?.count).toBe(0);
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
        const laterHoldPolicy = newUuidV7();
        const laterHold = newUuidV7();
        // A technical hold is inserted after upload in command order. No legal document is fabricated.
        await sql`INSERT INTO privacy.retention_policies
          (retention_policy_id,ownership_class,tenant_id,policy_code,version_number,policy_kind,retention_seconds,
           trigger_event_code,precedence_rank,is_mandatory,lifecycle_state,effective_from,created_by_user_identity_id)
          VALUES (${laterHoldPolicy}::uuid,'TENANT_OWNED',${tenantId}::uuid,${`ISOLATED-LATER-HOLD-${laterHoldPolicy}`},
            1,'legal_hold',NULL,'expiry_or_closure',500,true,'published',transaction_timestamp(),${authorId}::uuid)`.execute(tx);
        await sql`INSERT INTO privacy.retention_policy_applicabilities
          (retention_policy_applicability_id,tenant_id,retention_policy_id,version_number,classification,purpose,lifecycle_state,created_by_user_identity_id)
          VALUES (${laterHold}::uuid,${tenantId}::uuid,${laterHoldPolicy}::uuid,1,'confidential','evidence_document','draft',${authorId}::uuid)`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='under_review',row_version=2
          WHERE retention_policy_applicability_id=${laterHold}::uuid`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities SET lifecycle_state='approved',row_version=3
          WHERE retention_policy_applicability_id=${laterHold}::uuid`.execute(tx);
        await sql`UPDATE privacy.retention_policy_applicabilities
          SET lifecycle_state='published',row_version=4,effective_from=transaction_timestamp(),published_at=transaction_timestamp()
          WHERE retention_policy_applicability_id=${laterHold}::uuid`.execute(tx);
        await executeMutation(tx, actor(releaseDefinition, tenantId, approverMembershipId, approverId, "LEGAL_REVIEWER"),
          releaseDefinition, { body: { expected_version: 4, reason: "Technical isolated release after upload" },
            targetId: laterHold, idempotencyKey: newUuidV7(), correlationId: newUuidV7() });
        const afterHoldRelease = await sql<{ applicability: string; count: number }>`
          SELECT retention_policy_applicability_id::text AS applicability,
                 (SELECT count(*)::integer FROM evidence.file_objects WHERE tenant_id=${tenantId}::uuid) AS count
            FROM evidence.file_objects WHERE tenant_id=${tenantId}::uuid AND file_object_id=${fileId}::uuid`.execute(tx);
        expect(afterHoldRelease.rows[0]).toEqual({ applicability: retentionApplicabilityId, count: 1 });
        const profiles=await readVocabularyProvenance(tx,tenantId,'FileObject',fileId);
        expect(profiles).toHaveLength(1);expect(profiles[0]).toMatchObject({profile_version:1,manifest_sha256:VOCABULARY_MANIFEST_SHA256,root:{entity_type:'FileObject',entity_id:fileId,entity_version:{kind:'row_version',value:'1'}},occurrences:[{family_id:'CV-01',code:'confidential',input_path:'classification',entity_id:fileId,entity_version:{kind:'row_version',value:'1'}}]});
        expect(await readVocabularyProvenance(tx,newUuidV7(),'FileObject',fileId)).toEqual([]);
        expect(await readVocabularyProvenance(tx,tenantId,'FileObject',newUuidV7())).toEqual([]);
        const originalProvenance=JSON.stringify(profiles);const finalizeReplayKey=newUuidV7();
        // A separate upload exercises idempotent replay without manufacturing a second audit profile.
        const replayUpload=await executeMutation(tx,fileOwner(uploadCreate),uploadCreate,{body:{...uploadBody,original_filename:'provenance-replay.pdf'},idempotencyKey:newUuidV7(),correlationId:newUuidV7(),fileStorage:storage});
        const replayFinalizeInput={body:{expected_version:1},targetId:replayUpload.response.upload_intent_id as string,idempotencyKey:finalizeReplayKey,correlationId:newUuidV7(),fileStorage:storage};
        const replayFinalized=await executeMutation(tx,fileOwner(uploadFinalize),uploadFinalize,replayFinalizeInput);
        const replayFinalize=await executeMutation(tx,fileOwner(uploadFinalize),uploadFinalize,{...replayFinalizeInput,correlationId:newUuidV7()});
        expect(replayFinalize.replayed).toBe(true);expect(await readVocabularyProvenance(tx,tenantId,'FileObject',replayFinalized.response.file_object_id as string)).toHaveLength(1);
        expect(JSON.stringify(await readVocabularyProvenance(tx,tenantId,'FileObject',fileId))).toBe(originalProvenance);
        const stored = await sql<{ intent_state: string; objects: number; leaked_url: number }>`
          SELECT
            (SELECT lifecycle_state FROM evidence.file_upload_intents WHERE tenant_id=${tenantId}::uuid AND file_upload_intent_id=${uploadId}::uuid) AS intent_state,
            (SELECT count(*)::integer FROM evidence.file_objects WHERE tenant_id=${tenantId}::uuid) AS objects,
            (SELECT count(*)::integer FROM ops_audit.audit_events WHERE tenant_id=${tenantId}::uuid
               AND after_payload::text LIKE '%one-time-upload%') AS leaked_url
        `.execute(tx);
        expect(stored.rows[0]).toMatchObject({ intent_state: "promoted", objects: 2, leaked_url: 0 });
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
        expect(rejectState.rows[0]).toMatchObject({ lifecycle_state: "rejected", objects: 2 });
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
        const reference = await sql<{ control_id: string; control_version_id: string; regulatory_pack_id: string; regulatory_pack_version_id: string; framework_version_id: string }>`
          SELECT cv.control_id,cv.control_version_id,pv.regulatory_pack_id,pfv.regulatory_pack_version_id,r.framework_version_id
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
          SELECT pv.plan_version_id FROM platform.plan_versions pv WHERE pv.lifecycle_state='published'
           AND EXISTS (SELECT 1 FROM platform.entitlements e JOIN platform.capabilities c USING(capability_id)
             WHERE e.plan_version_id=pv.plan_version_id AND e.is_enabled AND c.capability_group='PRIVACY')
           ORDER BY pv.plan_version_id LIMIT 1
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
            (subscription_regulatory_pack_id,tenant_id,subscription_id,regulatory_pack_id,regulatory_pack_version_id,lifecycle_state,effective_from,created_by_user_identity_id,updated_by_user_identity_id)
          VALUES (${assignmentId}::uuid,${tenantId}::uuid,${subscriptionId}::uuid,${reference.rows[0]!.regulatory_pack_id}::uuid,${packVersionId}::uuid,'active',transaction_timestamp()-interval '1 day',${authorId}::uuid,${authorId}::uuid)
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
          body: { control_id: controlId, control_version_id: controlVersionId, methodology_version_ref: (await sql<{ id: string }>`SELECT control_effectiveness_methodology_id AS id FROM controls.control_effectiveness_methodologies WHERE lifecycle_state='published' ORDER BY version_number DESC LIMIT 1`.execute(tx)).rows[0]!.id },
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
        const fixtureTime = (await sql<{ now: Date }>`SELECT transaction_timestamp() AS now`.execute(tx)).rows[0]!.now.toISOString();
        const evidence = await executeMutation(tx, fileOwner(evidenceCreate), evidenceCreate, {
          body: {
            evidence_code: `ISOLATED-${tenantId.slice(0, 8)}`,
            evidence_type: "document",
            retention_policy_id: policyId,
            source_kind: "uploaded",
            file_object_id: fileId,
            provenance_ref: "isolated-upload",
            effective_from: fixtureTime,
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
        const chain = await sql<{ intent: string; file: string; version: string; policy: string }>`
          SELECT i.retention_policy_applicability_id::text AS intent,f.retention_policy_applicability_id::text AS file,
                 ev.retention_policy_applicability_id::text AS version,e.retention_policy_id::text AS policy
            FROM evidence.evidence_versions ev JOIN evidence.evidences e USING(tenant_id,evidence_id)
            JOIN evidence.file_objects f ON f.tenant_id=ev.tenant_id AND f.file_object_id=ev.file_object_id
            JOIN evidence.file_upload_intents i ON i.tenant_id=f.tenant_id AND i.file_object_id=f.file_object_id
           WHERE ev.tenant_id=${tenantId}::uuid AND ev.evidence_version_id=${evidenceVersionId}::uuid
        `.execute(tx);
        expect(chain.rows[0]).toEqual({ intent: retentionApplicabilityId, file: retentionApplicabilityId,
          version: retentionApplicabilityId, policy: policyId });

        // First prove DENY with the unpublished registry; then install the exact DRAFT mapping only
        // as a technical rollback fixture. This never claims competent publication or QA acceptance.
        const bindingCreate = mutations.get("retentionApplicabilityCreate")!;
        const bindingSubmit = mutations.get("retentionApplicabilitySubmitForReview")!;
        const bindingApprove = mutations.get("retentionApplicabilityApprove")!;
        const bindingPublish = mutations.get("retentionApplicabilityPublish")!;
        const successor = await executeMutation(tx,
          actor(bindingCreate, tenantId, authorMembershipId, authorId, "TENANT_ADMIN"), bindingCreate, {
            body: { retention_policy_id: policyId, version_number: 2, classification: "confidential",
              supersedes_applicability_id: retentionApplicabilityId, source_evidence_version_id: evidenceVersionId,
              source_clause_ref: "TECHNICAL-FIXTURE-NOT-LEGAL-EVIDENCE",
              effective_from: new Date(Date.parse(fixtureTime) + 1).toISOString() },
            idempotencyKey: newUuidV7(), correlationId: newUuidV7()
          });
        const successorId = String(successor.response.retention_policy_applicability_id);
        const bindingRun = (definition: MutationDefinition, version: number, identity = authorId) => executeMutation(tx,
          actor(definition, tenantId, identity === authorId ? authorMembershipId : approverMembershipId,
            identity, identity === authorId ? "TENANT_ADMIN" : "LEGAL_REVIEWER"), definition, {
            body: { expected_version: version }, targetId: successorId,
            idempotencyKey: newUuidV7(), correlationId: newUuidV7()
          });
        await expect(bindingRun(bindingSubmit, 1)).rejects.toMatchObject({ code: "TCDX.LIFECYCLE.TRANSITION_DENIED" });
        const candidateBindings = JSON.parse(readFileSync(new URL("../../../../docs/executable-contracts/candidates/STEP_6A3_C04W_CFGD_v1.10/LIFECYCLE_BINDINGS.json", import.meta.url), "utf8"));
        expect(candidateBindings.status).toBe("DRAFT_NOT_EFFECTIVE");
        for (const b of candidateBindings.bindings) {
          const transitionId = newUuidV7();
          await sql`INSERT INTO ops_audit.lifecycle_transition_definitions
            (lifecycle_transition_definition_id,entity_type,version_number,from_state,command_code,to_state,
             precondition_policy_ref,permission_id,sod_policy_ref,audit_event_code,notification_policy_ref,
             recalculation_policy_ref,idempotency_semantics,concurrency_semantics,system_actor_allowed,lifecycle_state,published_at)
            SELECT ${transitionId}::uuid,${b.entity_type},1,${b.from_state},${b.command_code},${b.to_state},
              ${b.precondition_policy_ref},permission_id,${b.sod_policy_ref},${b.audit_event_code},${b.notification_policy},
              ${b.recalculation_policy},${b.idempotency_semantics},${b.concurrency_semantics},${b.system_actor_allowed},'published',transaction_timestamp()
              FROM iam.permissions WHERE permission_code=${b.permission_code} AND lifecycle_state='published'`.execute(tx);
          for (const scope of b.allowed_scopes) {
            await sql`INSERT INTO ops_audit.lifecycle_transition_scopes
              (lifecycle_transition_scope_id,lifecycle_transition_definition_id,scope_kind)
              VALUES (${newUuidV7()}::uuid,${transitionId}::uuid,${scope})`.execute(tx);
          }
          expect(b.side_effect_event_codes).toEqual([]);
        }
        await bindingRun(bindingSubmit, 1);
        await expect(bindingRun(bindingApprove, 2)).rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
        await bindingRun(bindingApprove, 2, approverId);
        await sql`SAVEPOINT c04w_source_scan_negative`.execute(tx);
        await sql`UPDATE evidence.file_objects SET scan_status='rejected' WHERE file_object_id=${fileId}::uuid`.execute(tx);
        // The active initial-source contract rejects the failed scan in the
        // application guard before the older C04W database trigger is reached.
        await expect(bindingRun(bindingPublish, 3)).rejects.toMatchObject({
          code:"TCDX.INVARIANT.VIOLATION",statusCode:422,message:"Initial source retention chain is not eligible"
        });
        expect((await sql`SELECT lifecycle_state,row_version FROM privacy.retention_policy_applicabilities
          WHERE retention_policy_applicability_id=${successorId}::uuid`.execute(tx)).rows[0])
          .toMatchObject({lifecycle_state:'approved',row_version:'3'});
        await sql`ROLLBACK TO SAVEPOINT c04w_source_scan_negative`.execute(tx);
        const publishedBinding = await bindingRun(bindingPublish, 3);
        expect(publishedBinding.response.lifecycle_state).toBe("published");
        await sql`SAVEPOINT c04w_history_negative`.execute(tx);
        await expect(sql`UPDATE privacy.retention_policy_applicabilities SET source_clause_ref='tampered',row_version=row_version+1
          WHERE retention_policy_applicability_id=${successorId}::uuid`.execute(tx)).rejects.toThrow("C04W_PUBLISHED_IMMUTABLE");
        await sql`ROLLBACK TO SAVEPOINT c04w_history_negative`.execute(tx);
        const historical = await sql<{ id: string }>`SELECT retention_policy_applicability_id::text AS id
          FROM evidence.evidence_versions WHERE evidence_version_id=${evidenceVersionId}::uuid`.execute(tx);
        expect(historical.rows[0]?.id).toBe(retentionApplicabilityId);

        // HTTP routing + PostgreSQL authorization. Identity verification is a labelled technical adapter,
        // not real OIDC login. Route transactions use savepoints inside the outer test rollback.
        await sql`INSERT INTO iam.role_permissions (role_permission_id,ownership_class,tenant_id,role_id,permission_id)
          SELECT ${newUuidV7()}::uuid,'TENANT_OWNED',${tenantId}::uuid,${reviewerRoleId}::uuid,permission_id
            FROM iam.permissions WHERE permission_code='privacy.retention_policy.read' AND lifecycle_state='published'`.execute(tx);
        const routeDatabase = new Proxy(tx, { get(target, property) {
          if (property === "transaction") return () => ({ execute: async (callback: (transaction: typeof tx) => Promise<unknown>) => {
            await sql`SAVEPOINT c04w_http_route`.execute(tx);
            try {
              const result = await callback(tx);
              await sql`RELEASE SAVEPOINT c04w_http_route`.execute(tx);
              return result;
            } catch (error) {
              await sql`ROLLBACK TO SAVEPOINT c04w_http_route`.execute(tx);
              await sql`RELEASE SAVEPOINT c04w_http_route`.execute(tx);
              throw error;
            }
          } });
          const value = Reflect.get(target, property, target);
          return typeof value === "function" ? value.bind(target) : value;
        } });
        const http = buildApp(async () => true, {
          database: routeDatabase as unknown as Kysely<FoundationDatabase>, fileStorage: storage,
          identityVerifier: { verifyBearerToken: async () => ({ principalId: approverId,
            principalClass: "HUMAN_INTERACTIVE", tokenId: "isolated-technical-adapter", expiresAt: new Date(Date.now() + 60_000) }) }
        });
        try {
          const headers = { authorization: "Bearer isolated-technical-adapter", "x-tcdx-tenant-id": tenantId };
          expect((await http.inject({ method: "GET", url: `/api/v1/retention-policy-applicabilities/${successorId}`, headers })).statusCode).toBe(200);
          expect((await http.inject({ method: "GET", url: `/api/v1/retention-policy-applicabilities/${successorId}`,
            headers: { ...headers, "x-tcdx-tenant-id": otherTenantId } })).statusCode).toBe(404);
          for (const invalid of [
            { headers: {}, body: { reason: "Technical fixture" } },
            { headers: { "if-match": 'W/"4"' }, body: { reason: "Technical fixture" } },
            { headers: { "if-match": '"4"' }, body: { reason: "Technical fixture", expected_version: 4 } }
          ]) {
            expect((await http.inject({ method: "POST", url: `/api/v1/retention-policy-applicabilities/${laterHold}:release-hold`,
              headers: { ...headers, ...invalid.headers, "idempotency-key": newUuidV7() }, payload: invalid.body })).statusCode).toBe(400);
          }
          expect((await http.inject({ method: "POST", url: `/api/v1/retention-policy-applicabilities/${laterHold}:release-hold`,
            headers: { ...headers, "if-match": '"4"', "idempotency-key": newUuidV7() }, payload: { reason: "Duplicate technical release" } })).statusCode).toBe(409);
          await sql`SAVEPOINT c04w_http_no_entitlement`.execute(tx);
          await sql`UPDATE platform.subscriptions SET starts_at=transaction_timestamp()-interval '1 day',ends_at=transaction_timestamp()
            WHERE subscription_id=${subscriptionId}::uuid`.execute(tx);
          expect((await http.inject({ method: "GET", url: `/api/v1/retention-policy-applicabilities/${successorId}`, headers })).statusCode).toBe(403);
          await sql`ROLLBACK TO SAVEPOINT c04w_http_no_entitlement`.execute(tx);
        } finally { await http.close(); }
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
