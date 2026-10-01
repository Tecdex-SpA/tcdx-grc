import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validate as validateUuid } from "uuid";
import { sql } from "kysely";
import type { Readable } from "node:stream";
import { FoundationError } from "../errors.js";
import type { CoreGrcDependencies, ResourceKey } from "./model.js";
import { resources } from "./model.js";
import { detailResource, getResource, listResource } from "./repository.js";
import { availablePlatformRoleCodes, availableTenantContexts, grantedScopes, requireAccess, resolveAuthenticatedIdentity, resolveCoreActor } from "./security.js";
import type { AuthorizedFileAccess } from "../ports/file-storage.js";
import { executeMutation, mutations } from "./service.js";
import { membershipCreate, membershipInvitationCreate, membershipInvitationRevoke, membershipRoleAssign, membershipRoleRevoke, subscriptionCreate, tenantCreate } from "../security/platform-iam-service.js";
import { recordPrivilegedUse, requirePlatformAccess, resolvePlatformActor } from "../security/platform-authority.js";
import { administrativeRead } from "../security/administrative-read.js";
import { listTenantNormativeContent } from "../regulatory/tenant-read.js";
import { listValidationAccessCandidates } from "../regulatory/validation-candidates.js";
import { listSelectableSubjects } from "./subject-read.js";
import { subjectCreate } from "./subject-create.js";
import { activatePack, listPackAssignments, packAssignmentDetail, packUuid, revokePack } from "../regulatory/pack-contract.js";
import { effectiveTenantClassification, setTenantClassification } from "../regulatory/tenant-classification.js";
import { listValidationAccesses, validationAccessCreate, validationAccessRevoke, validationProvenanceCreate } from "../regulatory/validation-access.js";

type Params = { id?: string; issue_id?: string; file_object_id?: string; framework_version_id?: string; idCommand?: string };

function correlation(reply: FastifyReply): string { return String(reply.getHeader("x-correlation-id")); }
function validId(value: string | undefined): string {
  if (!value || !validateUuid(value)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid identifier", 400);
  return value;
}

function requiredIfMatch(request: FastifyRequest): number {
  const header = request.headers["if-match"];
  const match = typeof header === "string" ? /^\"([1-9][0-9]*)\"$/.exec(header) : null;
  if (!match) throw new FoundationError("TCDX.VALIDATION.FAILED", "If-Match is required", 400, false, { field: "If-Match" });
  const version = Number(match[1]);
  if (!Number.isSafeInteger(version)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid If-Match", 400, false, { field: "If-Match" });
  return version;
}

function membershipRoleIfMatch(request: FastifyRequest): string {
  const header = request.headers["if-match"];
  const match = typeof header === "string" ? /^"([0-9a-f]{64})"$/.exec(header) : null;
  if (!match) throw new FoundationError("TCDX.VALIDATION.FAILED", "If-Match is required", 400, false, { field: "If-Match" });
  return match[1]!;
}

const retentionPolicyTransitions = new Set(["retentionPolicyUpdate", "retentionPolicyReview", "retentionPolicyApprove", "retentionPolicyPublish"]);

export function retentionIfMatch(operationId: string, request: FastifyRequest<{ Params: Params; Body: Record<string, unknown> }>): Record<string, unknown> {
  const body = request.body ?? {};
  if (!retentionPolicyTransitions.has(operationId)) return body;
  if (Object.hasOwn(body, "expected_version")) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400, false, { field: "expected_version" });
  const header = request.headers["if-match"];
  const match = typeof header === "string" ? /^\"([1-9][0-9]*)\"$/.exec(header) : null;
  if (!match) throw new FoundationError("TCDX.VALIDATION.FAILED", "If-Match is required", 400, false, { field: "If-Match" });
  const expectedVersion = Number(match[1]);
  if (!Number.isSafeInteger(expectedVersion)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid If-Match", 400, false, { field: "If-Match" });
  return { ...body, expected_version: expectedVersion };
}

export const coreGrcReadRoutes: Array<[ResourceKey, string, string]> = [
  ["applicability", "/api/v1/requirement-applicabilities", "/api/v1/requirement-applicabilities/:id"],
  ["requirementAssessment", "/api/v1/requirement-assessments", "/api/v1/requirement-assessments/:id"],
  ["soa", "/api/v1/statements-of-applicability", "/api/v1/statements-of-applicability/:id"],
  ["control", "/api/v1/controls", "/api/v1/controls/:id"],
  ["controlAssessment", "/api/v1/control-assessments", "/api/v1/control-assessments/:id"],
  ["assuranceTest", "/api/v1/assurance-tests", "/api/v1/assurance-tests/:id"],
  ["evidenceRequest", "/api/v1/evidence-requests", "/api/v1/evidence-requests/:id"],
  ["evidence", "/api/v1/evidence", "/api/v1/evidence/:id"],
  ["issue", "/api/v1/issues", "/api/v1/issues/:id"],
  ["action", "/api/v1/actions", "/api/v1/actions/:id"],
  ["retentionPolicy", "/api/v1/retention-policies", "/api/v1/retention-policies/:id"]
];

export const coreGrcCommandRoutes: Array<[string, string, "target" | "parent" | "none"]> = [
  ["applicabilityCreate", "/api/v1/requirement-applicabilities", "none"],
  ["applicabilitySubmit", "/api/v1/requirement-applicabilities/:id\\:submit", "target"],
  ["applicabilityApprove", "/api/v1/requirement-applicabilities/:id\\:approve", "target"],
  ["requirementAssessmentCreate", "/api/v1/requirement-assessments", "none"],
  ["requirementAssessmentStart", "/api/v1/requirement-assessments/:id\\:start", "target"],
  ["requirementAssessmentSubmit", "/api/v1/requirement-assessments/:id\\:submit", "target"],
  ["requirementAssessmentApprove", "/api/v1/requirement-assessments/:id\\:approve", "target"],
  ["soaCreate", "/api/v1/statements-of-applicability", "none"],
  ["soaPublish", "/api/v1/statements-of-applicability/:id\\:publish", "target"],
  ["controlInstantiate", "/api/v1/controls:instantiate", "none"],
  ["controlAssessmentCreate", "/api/v1/control-assessments", "none"],
  ["controlAssessmentStart", "/api/v1/control-assessments/:id\\:start", "target"],
  ["controlAssessmentReview", "/api/v1/control-assessments/:id\\:review", "target"],
  ["controlAssessmentApprove", "/api/v1/control-assessments/:id\\:approve", "target"],
  ["assuranceTestCreate", "/api/v1/assurance-tests", "none"],
  ["assuranceTestStart", "/api/v1/assurance-tests/:id\\:start", "target"],
  ["assuranceTestExecute", "/api/v1/assurance-tests/:id\\:execute", "target"],
  ["assuranceTestReview", "/api/v1/assurance-tests/:id\\:review", "target"],
  ["assuranceTestApprove", "/api/v1/assurance-tests/:id\\:approve", "target"],
  ["uploadIntentCreate", "/api/v1/files:request-upload", "none"],
  ["uploadFinalize", "/api/v1/file-upload-intents/:id\\:finalize", "target"],
  ["retentionPolicyCreate", "/api/v1/retention-policies", "none"],
  ["retentionPolicyUpdate", "/api/v1/retention-policies/:id\\:update", "target"],
  ["retentionPolicyReview", "/api/v1/retention-policies/:id\\:review", "target"],
  ["retentionPolicyApprove", "/api/v1/retention-policies/:id\\:approve", "target"],
  ["retentionPolicyPublish", "/api/v1/retention-policies/:id\\:publish", "target"],
  ["evidenceRequestCreate", "/api/v1/evidence-requests", "none"],
  ["evidenceRequestFulfill", "/api/v1/evidence-requests/:id\\:fulfill", "target"],
  ["evidenceCreate", "/api/v1/evidence", "none"],
  ["evidenceSubmit", "/api/v1/evidence-versions/:id\\:submit", "target"],
  ["evidenceReviewStart", "/api/v1/evidence-versions/:id\\:start-review", "target"],
  ["evidenceApprove", "/api/v1/evidence-versions/:id\\:approve", "target"],
  ["evidenceReject", "/api/v1/evidence-versions/:id\\:reject", "target"],
  ["issueCreate", "/api/v1/issues", "none"],
  ["issueTriage", "/api/v1/issues/:id\\:triage", "target"],
  ["issueStartRemediation", "/api/v1/issues/:id\\:start-remediation", "target"],
  ["issueRequestVerification", "/api/v1/issues/:id\\:request-verification", "target"],
  ["issueVerifyClose", "/api/v1/issues/:id\\:verify-close", "target"],
  ["actionCreate", "/api/v1/issues/:issue_id/actions", "parent"],
  ["actionStart", "/api/v1/actions/:id\\:start", "target"],
  ["actionSubmitForReview", "/api/v1/actions/:id\\:submit-for-review", "target"],
  ["actionComplete", "/api/v1/actions/:id\\:complete", "target"],
  ["actionVerify", "/api/v1/actions/:id\\:verify", "target"],
  ["controlAssessmentSubmit", "/api/v1/control-assessments/:id\\:complete", "target"]
];

export function registerCoreGrcRoutes(app: FastifyInstance, dependencies: CoreGrcDependencies): void {
  app.get("/api/v1/platform/tenants/:id/account-classification", async (request: FastifyRequest<{ Params: Params }>) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
    requirePlatformAccess(actor,"platform.tenant_account_classification.update",actor.roles.includes("PLATFORM_ADMIN"));
    return effectiveTenantClassification(dependencies.database,validId(request.params.id));
  });
  app.post("/api/v1/platform/tenants/:id/account-classification", async (request: FastifyRequest<{ Params: Params; Body: Record<string, unknown> }>, reply) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
    const result = await dependencies.database.transaction().execute((tx) => setTenantClassification(tx,actor,{
      tenantId:validId(request.params.id),body:request.body,key:String(request.headers["idempotency-key"] ?? ""),correlationId:correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed","true");
    return reply.code(202).send({ operation_id:"tenantAccountClassificationSet",status:"completed",correlation_id:correlation(reply),result:result.result });
  });
  app.post("/api/v1/platform/regulatory-pack-validation-provenances", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier,request));
    const result = await dependencies.database.transaction().execute((tx) => validationProvenanceCreate(tx,actor,{
      body:request.body,key:String(request.headers["idempotency-key"] ?? ""),correlationId:correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed","true");
    return reply.code(201).send({operation_id:"validationProvenanceCreate",status:"completed",correlation_id:correlation(reply),result:result.result});
  });
  app.get("/api/v1/platform/tenants/:id/regulatory-pack-validation-accesses", async (request: FastifyRequest<{ Params: Params; Querystring: Record<string, unknown> }>) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier,request));
    requirePlatformAccess(actor,"platform.regulatory_pack_validation_access.read",actor.roles.includes("PLATFORM_ADMIN"));
    return listValidationAccesses(dependencies.database,validId(request.params.id),request.query);
  });
  app.get("/api/v1/platform/regulatory-pack-validation-candidates", async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier,request));
    requirePlatformAccess(actor,"platform.regulatory_pack_validation_access.read",actor.roles.includes("PLATFORM_ADMIN"));
    return listValidationAccessCandidates(dependencies.database,request.query,dependencies.runtimeEnvironment ?? "production");
  });
  app.get("/api/v1/regulatory-pack-validation-accesses/current", async (request) => {
    const actor = await resolveCoreActor(dependencies.database,dependencies.identityVerifier,request);
    requireAccess(actor,"platform.regulatory_pack_validation_access.read","CORE_PLATFORM",["tenant"]);
    if (!actor.roles.includes("TENANT_ADMIN")) throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Access denied",403);
    return listValidationAccesses(dependencies.database,actor.tenantId,request.query as Record<string, unknown>);
  });
  app.post("/api/v1/platform/regulatory-pack-validation-accesses", async (request: FastifyRequest<{ Body: Record<string, unknown> }>,reply) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Access denied",403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier,request));
    const result = await dependencies.database.transaction().execute((tx) => validationAccessCreate(tx,actor,{
      body:request.body,key:String(request.headers["idempotency-key"] ?? ""),correlationId:correlation(reply),
      runtimeEnvironment:dependencies.runtimeEnvironment ?? "production"
    }));
    if (result.replayed) reply.header("idempotency-replayed","true");
    reply.header("etag",`"${result.result.row_version}"`);
    return reply.code(201).send({operation_id:"validationAccessCreate",status:"completed",correlation_id:correlation(reply),
      resource_id:result.result.regulatory_pack_validation_access_id,result:result.result});
  });
  app.post("/api/v1/platform/regulatory-pack-validation-accesses/:id(.*)::revoke", async (request: FastifyRequest<{ Params: Params; Body: Record<string, unknown> }>,reply) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED","Access denied",403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier,request));
    const result = await dependencies.database.transaction().execute((tx) => validationAccessRevoke(tx,actor,{
      id:validId(request.params.id),body:request.body,expectedVersion:requiredIfMatch(request),
      key:String(request.headers["idempotency-key"] ?? ""),correlationId:correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed","true");
    reply.header("etag",`"${result.result.row_version}"`);
    return reply.code(202).send({operation_id:"validationAccessRevoke",status:"completed",correlation_id:correlation(reply),
      resource_id:result.result.regulatory_pack_validation_access_id,result:result.result});
  });
  app.get("/api/v1/platform/regulatory-pack-versions", async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    if (Object.keys(request.query ?? {}).length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query field", 400);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
    requirePlatformAccess(actor, "platform.subscription_regulatory_pack.create", actor.roles.includes("PLATFORM_ADMIN"));
    const versions = await sql<{ regulatory_pack_version_id: string; pack_code: string; name: string; edition: string; license_classification: string }>`
      SELECT pv.regulatory_pack_version_id,p.pack_code,p.name,pv.edition,pv.license_classification
        FROM regulatory.regulatory_pack_versions pv
        JOIN regulatory.regulatory_packs p ON p.regulatory_pack_id=pv.regulatory_pack_id
       WHERE pv.lifecycle_state='published' AND p.lifecycle_state='published'
         AND (pv.effective_from IS NULL OR pv.effective_from<=transaction_timestamp())
         AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
       ORDER BY p.name,pv.edition,pv.regulatory_pack_version_id
    `.execute(dependencies.database);
    return { items: versions.rows, page: { has_more: false, next_cursor: null } };
  });
  const packReadAuthority = async (request: FastifyRequest) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) {
      const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
      if (!actor.roles.includes("TENANT_ADMIN") || !actor.permissions.has("platform.subscription_regulatory_pack.read") ||
          !grantedScopes(actor, "platform.subscription_regulatory_pack.read").has("tenant"))
        throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
      return actor.tenantId;
    }
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
    requirePlatformAccess(actor, "platform.subscription_regulatory_pack.read", actor.roles.includes("PLATFORM_ADMIN"));
    return undefined;
  };
  app.get("/api/v1/subscriptions/current/regulatory-packs", async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>) => {
    if (request.headers["x-tcdx-tenant-id"] === undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const tenantId = await packReadAuthority(request);
    const current = await sql<{ subscription_id: string }>`
      SELECT subscription_id FROM platform.subscriptions WHERE tenant_id=${tenantId}::uuid
        AND lifecycle_state='active' AND starts_at<=transaction_timestamp()
        AND (ends_at IS NULL OR ends_at>transaction_timestamp()) AND cancelled_at IS NULL
      ORDER BY starts_at DESC LIMIT 1
    `.execute(dependencies.database);
    return current.rows[0] ? listPackAssignments(dependencies.database, current.rows[0].subscription_id, tenantId, request.query ?? {})
      : { items: [], page: { has_more: false, next_cursor: null } };
  });
  app.get("/api/v1/subscriptions/:id/regulatory-packs", async (request: FastifyRequest<{ Params: Params; Querystring: Record<string, unknown> }>) => {
    const tenantId = await packReadAuthority(request);
    return listPackAssignments(dependencies.database, validId(request.params.id), tenantId, request.query ?? {});
  });
  app.get("/api/v1/subscription-regulatory-packs/:id", async (request: FastifyRequest<{ Params: Params; Querystring: Record<string, unknown> }>, reply) => {
    if (Object.keys(request.query ?? {}).length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query field", 400);
    const tenantId = await packReadAuthority(request);
    const result = await packAssignmentDetail(dependencies.database, validId(request.params.id), tenantId);
    reply.header("etag", `"${result.row_version}"`);
    return result;
  });
  app.post("/api/v1/subscriptions/:id/regulatory-packs", async (request: FastifyRequest<{ Params: Params; Body: Record<string, unknown> }>, reply) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
    const result = await dependencies.database.transaction().execute((tx) => activatePack(tx, actor, {
      subscriptionId: validId(request.params.id), body: request.body, key: String(request.headers["idempotency-key"] ?? ""), correlationId: correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed", "true");
    reply.header("etag", `"${result.result.row_version}"`);
    return reply.code(202).send({ operation_id: "subscriptionRegulatoryPackActivate", status: "completed", correlation_id: correlation(reply),
      resource_id: result.result.subscription_regulatory_pack_id, result: result.result });
  });
  app.post("/api/v1/subscription-regulatory-packs/:id(.*)::revoke", async (request: FastifyRequest<{ Params: Params; Body: Record<string, unknown> }>, reply) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    const actor = await resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
    const result = await dependencies.database.transaction().execute((tx) => revokePack(tx, actor, {
      assignmentId: packUuid(request.params.id, "subscription_regulatory_pack_id"), body: request.body,
      expectedVersion: requiredIfMatch(request), key: String(request.headers["idempotency-key"] ?? ""), correlationId: correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed", "true");
    reply.header("etag", `"${result.result.row_version}"`);
    return reply.code(202).send({ operation_id: "subscriptionRegulatoryPackRevoke", status: "completed", correlation_id: correlation(reply),
      resource_id: result.result.subscription_regulatory_pack_id, result: result.result });
  });
  app.get("/api/v1/subjects", async (request) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    requireAccess(actor, "organization.subject.read", "CORE_PLATFORM", ["tenant"]);
    return listSelectableSubjects(dependencies.database, actor, request.query as Record<string, unknown>);
  });
  app.post("/api/v1/subjects", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    const result = await dependencies.database.transaction().execute((tx) => subjectCreate(tx, actor, {
      body: request.body, key: String(request.headers["idempotency-key"] ?? ""), correlationId: correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(201).send({ operation_id: "subjectCreate", status: "completed",
      correlation_id: correlation(reply), resource_id: result.result.subject_id, result: result.result });
  });
  app.put("/api/v1/file-upload-intents/:id/content", async (request: FastifyRequest<{ Params: Params; Body: Readable }>, reply) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    requireAccess(actor, "evidence.document.update", "EVIDENCE_DOCUMENTS", ["tenant", "owned_object"]);
    if (request.headers["content-type"] !== "application/octet-stream") throw new FoundationError("TCDX.VALIDATION.FAILED", "Binary content type is required", 415);
    const id = validId(request.params.id);
    const length = Number(request.headers["content-length"]);
    if (!Number.isSafeInteger(length) || length < 1) throw new FoundationError("TCDX.VALIDATION.FAILED", "Content-Length is required", 400);
    await dependencies.database.transaction().execute(async (tx) => {
      const intent = await getResource(tx, actor, resources.fileUploadIntent, id, true, "evidence.document.update");
      if (intent.lifecycle_state !== "pending_upload" || Date.parse(String(intent.expires_at)) <= Date.now()) {
        throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Upload intent is not uploadable", 409);
      }
      if (length !== Number(intent.expected_size_bytes)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Upload size mismatch", 413);
      const scope = grantedScopes(actor, "evidence.document.update").has("tenant") ? "tenant" : "owned_object";
      const access: AuthorizedFileAccess = { tenantId: actor.tenantId, correlationId: correlation(reply), capabilityEnabled: true, permissionGranted: true, scope, objectPolicyAllowed: true };
      await dependencies.fileStorage.uploadQuarantineContent({ ...access, uploadIntentId: id, quarantineObjectKey: String(intent.quarantine_object_key), sizeBytes: length, content: request.body });
    });
    return reply.code(204).send();
  });

  app.get("/api/v1/file-objects/:id/content", async (request: FastifyRequest<{ Params: Params }>, reply) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    const definition = resources.fileObject;
    requireAccess(actor, definition.permission, definition.capability, ["tenant", "owned_object"]);
    const id = validId(request.params.id);
    await getResource(dependencies.database, actor, definition, id);
    const result = await sql<{ object_key: string; original_filename: string; detected_mime: string; size_bytes: string; sha256: string; scan_status: string; classification: string }>`
      SELECT object_key,original_filename,detected_mime,size_bytes,sha256,scan_status,classification
        FROM evidence.file_objects WHERE tenant_id=${actor.tenantId}::uuid AND file_object_id=${id}::uuid
    `.execute(dependencies.database);
    const file = result.rows[0];
    if (!file || file.scan_status !== "passed") throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
    const scopes = grantedScopes(actor, definition.permission);
    const scope = scopes.has("tenant") ? "tenant" : "owned_object";
    const access: AuthorizedFileAccess = { tenantId: actor.tenantId, correlationId: correlation(reply), capabilityEnabled: true, permissionGranted: true, scope, objectPolicyAllowed: true };
    const stream = await dependencies.fileStorage.openDownload({ ...access, fileObjectId: id, objectKey: file.object_key, sha256: file.sha256, sizeBytes: Number(file.size_bytes), scanState: "passed", classification: file.classification });
    const filename = file.original_filename.replace(/[\x00-\x1f\x7f"\\/]/g, "_").slice(0, 180) || "download";
    const mime = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "application/zip", "application/json", "application/xml", "text/plain"]).has(file.detected_mime) ? file.detected_mime : "application/octet-stream";
    return reply.header("cache-control", "no-store").header("x-content-type-options", "nosniff")
      .header("content-disposition", `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(filename)}`)
      .type(mime).send(stream);
  });

  app.get("/api/v1/access/me", async (request) => {
    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier, request);
    const [availableTenantContextsResult, effectivePlatformRoleCodes] = await Promise.all([
      availableTenantContexts(dependencies.database, identity),
      availablePlatformRoleCodes(dependencies.database, identity)
    ]);
    return {
      available_tenant_contexts: availableTenantContextsResult,
      effective_platform_role_codes: effectivePlatformRoleCodes
    };
  });

  const administrativeRoutes = [
    ["tenantList", "/api/v1/platform/tenants"],
    ["tenantGet", "/api/v1/platform/tenants/:id"],
    ["membershipList", "/api/v1/memberships"],
    ["membershipGet", "/api/v1/memberships/:id"],
    ["membershipRoleList", "/api/v1/memberships/:id/role-assignments"],
    ["membershipInvitationList", "/api/v1/platform/membership-invitations"],
    ["membershipInvitationGet", "/api/v1/platform/membership-invitations/:id"],
    ["roleList", "/api/v1/roles"],
    ["roleGet", "/api/v1/roles/:id"]
  ] as const;
  for (const [operation, path] of administrativeRoutes) {
    app.get(path, async (request) => administrativeRead(
      dependencies.database, dependencies.identityVerifier, request, operation,
      (request.params as { id?: string }).id
    ));
  }

  app.post("/api/v1/platform/tenants", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier, request);
    const actor = await resolvePlatformActor(dependencies.database, identity);
    const key = request.headers["idempotency-key"];
    let result: Awaited<ReturnType<typeof tenantCreate>>;
    try {
      result = await dependencies.database.transaction().execute((transaction) => tenantCreate(transaction, actor, {
        body: request.body ?? {}, ...(typeof key === "string" ? { key } : {}), correlationId: correlation(reply)
      }));
    } catch (error) {
      if (error instanceof FoundationError && error.code === "TCDX.AUTHORIZATION.DENIED") {
        await dependencies.database.transaction().execute((transaction) => recordPrivilegedUse(transaction, {
          actor, correlationId: correlation(reply), aggregateType: "UserIdentity", aggregateId: actor.identity.principalId,
          commandCode: "tenantCreate", outcome: "denied"
        }));
      }
      throw error;
    }
    if (result.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(202).send({ operation_id: "tenantCreate", status: "completed", correlation_id: correlation(reply), resource_id: result.result.tenant_id, result: result.result });
  });

  app.post("/api/v1/platform/subscriptions", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier, request);
    const actor = await resolvePlatformActor(dependencies.database, identity);
    const key = request.headers["idempotency-key"];
    let result: Awaited<ReturnType<typeof subscriptionCreate>>;
    try {
      result = await dependencies.database.transaction().execute((transaction) => subscriptionCreate(transaction, actor, {
        body: request.body ?? {}, ...(typeof key === "string" ? { key } : {}), correlationId: correlation(reply)
      }));
    } catch (error) {
      if (error instanceof FoundationError && error.code === "TCDX.AUTHORIZATION.DENIED") {
        await dependencies.database.transaction().execute((transaction) => recordPrivilegedUse(transaction, {
          actor, correlationId: correlation(reply), aggregateType: "UserIdentity", aggregateId: actor.identity.principalId,
          commandCode: "subscriptionCreate", outcome: "denied"
        }));
      }
      throw error;
    }
    if (result.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(202).send({ operation_id: "subscriptionCreate", status: "completed", correlation_id: correlation(reply), resource_id: result.result.subscription_id, result: result.result });
  });

  app.post("/api/v1/memberships", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    const key = request.headers["idempotency-key"];
    const result = await dependencies.database.transaction().execute((transaction) => membershipCreate(transaction, actor, {
      body: request.body ?? {}, ...(typeof key === "string" ? { key } : {}), correlationId: correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(202).send({ operation_id: "membershipCreate", status: "completed", correlation_id: correlation(reply), resource_id: result.result.tenant_membership_id, result: result.result });
  });

  app.post("/api/v1/platform/membership-invitations", async (request: FastifyRequest<{ Body: Record<string, unknown> }>, reply) => {
    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier, request);
    const actor = await resolvePlatformActor(dependencies.database, identity);
    const key = request.headers["idempotency-key"];
    let result: Awaited<ReturnType<typeof membershipInvitationCreate>>;
    try {
      result = await dependencies.database.transaction().execute((transaction) => membershipInvitationCreate(transaction, actor, {
        body: request.body ?? {}, ...(typeof key === "string" ? { key } : {}), correlationId: correlation(reply)
      }));
    } catch (error) {
      if (error instanceof FoundationError && error.code === "TCDX.AUTHORIZATION.DENIED") {
        await dependencies.database.transaction().execute((transaction) => recordPrivilegedUse(transaction, {
          actor, correlationId: correlation(reply), aggregateType: "UserIdentity", aggregateId: actor.identity.principalId,
          commandCode: "membershipInvitationCreate", outcome: "denied"
        }));
      }
      throw error;
    }
    if (result.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(202).send({
      operation_id: "membershipInvitationCreate", status: "completed", correlation_id: correlation(reply),
      resource_id: result.result.tenant_membership_invitation_id,
      result: { ...result.result, invitation_token: result.invitationToken }
    });
  });

  app.post("/api/v1/platform/membership-invitations/:id/revoke", async (request: FastifyRequest<{ Params: { id?: string }; Body: Record<string, unknown> }>, reply) => {
    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier, request);
    const actor = await resolvePlatformActor(dependencies.database, identity);
    const key = request.headers["idempotency-key"];
    let result: Awaited<ReturnType<typeof membershipInvitationRevoke>>;
    try {
      result = await dependencies.database.transaction().execute((transaction) => membershipInvitationRevoke(transaction, actor, {
        invitationId: validId(request.params.id), body: request.body ?? {}, expectedVersion: requiredIfMatch(request),
        ...(typeof key === "string" ? { key } : {}), correlationId: correlation(reply)
      }));
    } catch (error) {
      if (error instanceof FoundationError && error.code === "TCDX.AUTHORIZATION.DENIED") {
        await dependencies.database.transaction().execute((transaction) => recordPrivilegedUse(transaction, {
          actor, correlationId: correlation(reply), aggregateType: "UserIdentity", aggregateId: actor.identity.principalId,
          commandCode: "membershipInvitationRevoke", outcome: "denied"
        }));
      }
      throw error;
    }
    if (result.replayed) reply.header("idempotency-replayed", "true");
    reply.header("etag", `\"${result.result.row_version}\"`);
    return reply.code(202).send({
      operation_id: "membershipInvitationRevoke", status: "completed", correlation_id: correlation(reply),
      resource_id: result.result.tenant_membership_invitation_id, result: result.result
    });
  });

  app.post("/api/v1/memberships/:id/role-assignments", async (request: FastifyRequest<{ Params: { id?: string }; Body: Record<string, unknown> }>, reply) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    const key = request.headers["idempotency-key"];
    const result = await dependencies.database.transaction().execute((transaction) => membershipRoleAssign(transaction, actor, {
      membershipId: validId(request.params.id), body: request.body ?? {}, ...(typeof key === "string" ? { key } : {}), correlationId: correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(202).send({ operation_id: "membershipRoleAssign", status: "completed", correlation_id: correlation(reply), resource_id: result.result.membership_role_id, result: result.result });
  });

  app.post("/api/v1/role-assignments/:id(.*)::revoke", async (request: FastifyRequest<{
    Params: { id?: string }; Querystring: Record<string, unknown>; Body: Record<string, unknown>;
  }>, reply) => {
    const tenantHeader = request.headers["x-tcdx-tenant-id"];
    const actor = tenantHeader === undefined
      ? await resolvePlatformActor(dependencies.database,
        await resolveAuthenticatedIdentity(dependencies.identityVerifier, request))
      : await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    const query = request.query ?? {};
    if (Object.keys(query).some((field) => field !== "tenant_id")) {
      throw new FoundationError("TCDX.VALIDATION.FAILED", "Unsupported query field", 400);
    }
    if (tenantHeader !== undefined && query.tenant_id !== undefined) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    const authority = tenantHeader === undefined ? (() => {
      if (typeof query.tenant_id !== "string" || !validateUuid(query.tenant_id)) {
        throw new FoundationError("TCDX.VALIDATION.FAILED", "tenant_id is required", 400, false, { field: "tenant_id" });
      }
      return query.tenant_id;
    })() : null;
    const selectedAuthority = authority === null
      ? { kind: "tenant" as const, actor: actor as Awaited<ReturnType<typeof resolveCoreActor>> }
      : { kind: "platform" as const, actor: actor as Awaited<ReturnType<typeof resolvePlatformActor>>, tenantId: authority };
    const key = request.headers["idempotency-key"];
    const result = await dependencies.database.transaction().execute((transaction) => membershipRoleRevoke(transaction, selectedAuthority, {
      assignmentId: validId(request.params.id), body: request.body ?? {}, expectedEtag: membershipRoleIfMatch(request),
      ...(typeof key === "string" ? { key } : {}), correlationId: correlation(reply)
    }));
    if (result.replayed) reply.header("idempotency-replayed", "true");
    reply.header("etag", `"${result.result.etag}"`);
    return reply.code(202).send({ operation_id: "membershipRoleRevoke", status: "completed",
      correlation_id: correlation(reply), resource_id: result.result.membership_role_id, result: result.result });
  });

  for (const [key, listPath, detailPath] of coreGrcReadRoutes) {
    const definition = resources[key];
    app.get(listPath, async (request) => {
      const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
      requireAccess(actor, definition.permission, definition.capability, definition.scopes);
      return listResource(dependencies.database, actor, definition, request.query as Record<string, unknown>);
    });
    app.get(detailPath, async (request, reply) => {
      const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
      requireAccess(actor, definition.permission, definition.capability, definition.scopes);
      const response = await detailResource(dependencies.database, actor, definition, validId((request.params as Params).id));
      if (response.row_version) reply.header("etag", `\"${response.row_version}\"`);
      return response;
    });
  }

  for (const [kind, permission] of [["normative-units", "compliance.normative_unit.read"], ["requirements", "compliance.requirement.read"]] as const) {
    app.get(`/api/v1/framework-versions/:framework_version_id/${kind}`, async (request) => {
      const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
      requireAccess(actor, permission, "ISO_COMPLIANCE", ["tenant"]);
      return listTenantNormativeContent(
        dependencies.database, actor,
        validId((request.params as Params).framework_version_id), kind,
        request.query as Record<string, unknown>
      );
    });
  }

  app.get("/api/v1/evidence-versions/:id", async (request, reply) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    requireAccess(actor, resources.evidenceVersion.permission, resources.evidenceVersion.capability, resources.evidenceVersion.scopes);
    const response = await detailResource(dependencies.database, actor, resources.evidenceVersion, validId((request.params as Params).id));
    reply.header("etag", `\"${response.row_version}\"`);
    return response;
  });

  const targetGroups = new Map<string, Map<string, string>>();
  for (const [operationId, path, targetKind] of coreGrcCommandRoutes) {
    if (targetKind !== "target") continue;
    const [base, suffix] = path.split("/:id\\:");
    if (!base || !suffix) throw new Error(`Invalid command path: ${path}`);
    const group = targetGroups.get(base) ?? new Map<string, string>();
    group.set(suffix, operationId);
    targetGroups.set(base, group);
  }

  const handleMutation = (operationId: string, targetKind: "target" | "parent" | "none") => async (request: FastifyRequest<{ Params: Params; Body: Record<string, unknown> }>, reply: FastifyReply) => {
      const definition = mutations.get(operationId);
      if (!definition) throw new Error(`Missing Core GRC mutation implementation: ${operationId}`);
      const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
      const key = request.headers["idempotency-key"];
      const targetId = targetKind === "target" ? validId(request.params.id) : undefined;
      const parentId = targetKind === "parent" ? validId(request.params.issue_id) : undefined;
      const result = await dependencies.database.transaction().execute((transaction) => executeMutation(transaction, actor, definition, {
        body: retentionIfMatch(operationId, request), idempotencyKey: typeof key === "string" ? key : "", correlationId: correlation(reply), fileStorage: dependencies.fileStorage,
        ...(targetId ? { targetId } : {}), ...(parentId ? { parentId } : {})
      }));
      if (result.afterCommit) await result.afterCommit();
      if (result.deferredError) throw result.deferredError;
      if (result.replayed) reply.header("idempotency-replayed", "true");
      if (result.response.row_version) reply.header("etag", `\"${result.response.row_version}\"`);
      const resourceId = result.response.upload_intent_id
        ?? Object.values(resources).map((resource) => result.response[resource.idColumn]).find((value) => typeof value === "string")
        ?? null;
      return reply.code(202).send({
        operation_id: operationId,
        status: "completed",
        correlation_id: correlation(reply),
        resource_id: resourceId,
        result: result.response
      });
  };

  for (const [operationId, path, targetKind] of coreGrcCommandRoutes.filter((command) => command[2] !== "target")) {
    app.post(path, handleMutation(operationId, targetKind));
  }

  for (const [base, operations] of targetGroups) {
    app.post(`${base}/:idCommand`, async (request: FastifyRequest<{ Params: Params; Body: Record<string, unknown> }>, reply) => {
      const combined = request.params.idCommand ?? "";
      const separator = combined.lastIndexOf(":");
      const id = combined.slice(0, separator);
      const suffix = combined.slice(separator + 1);
      const operationId = operations.get(suffix);
      if (!operationId || separator < 1) throw new FoundationError("TCDX.RESOURCE.NOT_FOUND", "Resource not found", 404);
      request.params.id = id;
      return handleMutation(operationId, "target")(request, reply);
    });
  }
}
