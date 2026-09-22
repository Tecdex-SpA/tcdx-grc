import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validate as validateUuid } from "uuid";
import { sql } from "kysely";
import { FoundationError } from "../errors.js";
import type { CoreGrcDependencies, ResourceKey } from "./model.js";
import { resources } from "./model.js";
import { detailResource, listResource } from "./repository.js";
import { resolveCoreActor, requireAccess } from "./security.js";
import { executeMutation, mutations } from "./service.js";

type Params = { id?: string; issue_id?: string; file_object_id?: string; idCommand?: string };

function correlation(reply: FastifyReply): string { return String(reply.getHeader("x-correlation-id")); }
function validId(value: string | undefined): string {
  if (!value || !validateUuid(value)) throw new FoundationError("TCDX.VALIDATION.FAILED", "Invalid identifier", 400);
  return value;
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
  ["action", "/api/v1/actions", "/api/v1/actions/:id"]
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
  ["evidenceRequestCreate", "/api/v1/evidence-requests", "none"],
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
  ["actionVerify", "/api/v1/actions/:id\\:verify", "target"]
];

export function registerCoreGrcRoutes(app: FastifyInstance, dependencies: CoreGrcDependencies): void {
  app.get("/api/v1/access/me", async (request) => {
    const actor = await resolveCoreActor(dependencies.database, dependencies.identityVerifier, request);
    const context = await sql<{ tenant_name: string; user_name: string }>`SELECT t.display_name AS tenant_name,u.display_name AS user_name FROM platform.tenants t JOIN iam.user_identities u ON u.user_identity_id=${actor.userIdentityId}::uuid WHERE t.tenant_id=${actor.tenantId}::uuid`.execute(dependencies.database);
    return { tenant_id: actor.tenantId, membership_id: actor.membershipId, tenant_name: context.rows[0]?.tenant_name, user_name: context.rows[0]?.user_name, permissions: [...actor.permissions].sort(), scopes: [...actor.scopes].sort(), capability_groups: [...actor.capabilityGroups].sort(), roles: actor.roles };
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
        body: request.body ?? {}, idempotencyKey: typeof key === "string" ? key : "", correlationId: correlation(reply),
        ...(targetId ? { targetId } : {}), ...(parentId ? { parentId } : {})
      }));
      if (result.replayed) reply.header("idempotency-replayed", "true");
      if (result.response.row_version) reply.header("etag", `\"${result.response.row_version}\"`);
      const resourceId = Object.values(resources).map((resource) => result.response[resource.idColumn]).find((value) => typeof value === "string") ?? null;
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
