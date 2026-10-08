import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { CoreGrcDependencies } from "../core-grc/model.js";
import { resolveAuthenticatedIdentity } from "../core-grc/security.js";
import { FoundationError } from "../errors.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { platformRoleAssignmentList } from "./platform-role-read.js";
import { PlatformRoleService } from "./platform-role-service.js";

export function registerPlatformRoleRoutes(app: FastifyInstance, dependencies: Pick<CoreGrcDependencies, "database" | "identityVerifier">): void {
  const service = new PlatformRoleService(dependencies.database);
  const actor = async (request: FastifyRequest) => {
    if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    if (Object.keys(request.query as object ?? {}).length) throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
    return resolvePlatformActor(dependencies.database, await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
  };
  const send = (reply: FastifyReply, result: Awaited<ReturnType<PlatformRoleService["assign"]>>, status: number) => {
    if (result.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(status).send(result.assignment);
  };
  app.get("/api/v1/platform/user-identities/:user_identity_id/platform-roles",
    async (request: FastifyRequest<{ Params: { user_identity_id: string } }>) => {
      if (request.headers["x-tcdx-tenant-id"] !== undefined) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
      if (Object.keys(request.query as object ?? {}).length || request.body !== undefined
        || (request.headers["content-length"] !== undefined && request.headers["content-length"] !== "0")
        || request.headers["transfer-encoding"] !== undefined) {
        throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
      }
      return platformRoleAssignmentList(dependencies.database,
        await resolveAuthenticatedIdentity(dependencies.identityVerifier, request), request.params.user_identity_id);
    });
  app.post("/api/v1/platform/user-identities/:user_identity_id/platform-roles",
    async (request: FastifyRequest<{ Params: { user_identity_id: string } }>, reply) => send(reply,
      await service.assign(await actor(request), request.params.user_identity_id, request.body,
        request.headers["idempotency-key"] as string, String(reply.getHeader("x-correlation-id"))), 201));
  app.post("/api/v1/platform/user-identities/:user_identity_id/platform-roles/:platform_role_assignment_id(.*)::revoke",
    async (request: FastifyRequest<{ Params: { user_identity_id: string; platform_role_assignment_id: string } }>, reply) => send(reply,
      await service.revoke(await actor(request), request.params.user_identity_id, request.params.platform_role_assignment_id,
        request.body, request.headers["idempotency-key"] as string, String(reply.getHeader("x-correlation-id"))), 200));
}
