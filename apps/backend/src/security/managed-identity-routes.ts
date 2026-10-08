import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import { FoundationError } from "../errors.js";
import { resolveAuthenticatedIdentity } from "../core-grc/security.js";
import type { IdentityVerifier } from "./authentication.js";
import { resolvePlatformActor } from "./platform-authority.js";
import type { ManagedIdentityService } from "./managed-identity-service.js";

type Dependencies = {
  database: Kysely<FoundationDatabase>;
  identityVerifier: IdentityVerifier;
  service: ManagedIdentityService;
};

type TargetParams = { user_identity_id: string };

function correlation(reply: FastifyReply): string {
  return String(reply.getHeader("x-correlation-id"));
}

function denyTenantHeader(request: FastifyRequest): void {
  if (request.headers["x-tcdx-tenant-id"] !== undefined) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
}

function rejectAuthorityQuery(request: FastifyRequest): void {
  if (Object.keys(request.query as Record<string, unknown> ?? {}).some((field) => field === "tenant_id")) {
    throw new FoundationError("TCDX.VALIDATION.FAILED", "Validation failed", 400);
  }
}

function noStore(reply: FastifyReply): void {
  reply.header("cache-control", "no-store");
  reply.header("pragma", "no-cache");
}

function result(reply: FastifyReply, value: {
  identity: unknown; credential_disclosed?: boolean; temporary_credential?: string; replayed: boolean
}, status = 200) {
  noStore(reply);
  if (value.replayed) reply.header("idempotency-replayed", "true");
  if (value.credential_disclosed !== undefined) {
    return reply.code(status).send({ identity: value.identity, credential_disclosed: value.credential_disclosed,
      ...(value.temporary_credential ? { temporary_credential: value.temporary_credential } : {}) });
  }
  return reply.code(status).send(value.identity);
}

export function registerManagedIdentityRoutes(app: FastifyInstance, dependencies: Dependencies): void {
  const actor = async (request: FastifyRequest) => {
    denyTenantHeader(request);
    rejectAuthorityQuery(request);
    return resolvePlatformActor(dependencies.database,
      await resolveAuthenticatedIdentity(dependencies.identityVerifier, request));
  };
  const idempotencyKey = (request: FastifyRequest) => request.headers["idempotency-key"];

  app.get("/api/v1/platform/managed-identities", async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>) =>
    dependencies.service.list(await actor(request), request.query ?? {}));

  app.get("/api/v1/platform/managed-identities/:user_identity_id", async (request: FastifyRequest<{ Params: TargetParams }>) =>
    dependencies.service.read(await actor(request), request.params.user_identity_id));

  app.post("/api/v1/platform/managed-identities", async (request, reply) =>
    result(reply, await dependencies.service.provision(await actor(request), request.body,
      idempotencyKey(request) as string, correlation(reply)), 201));

  app.post("/api/v1/platform/managed-identities/:user_identity_id(.*)::disable",
    async (request: FastifyRequest<{ Params: TargetParams }>, reply) =>
      result(reply, await dependencies.service.disable(await actor(request), request.params.user_identity_id,
        request.body, idempotencyKey(request) as string, correlation(reply))));

  app.post("/api/v1/platform/managed-identities/:user_identity_id(.*)::enable",
    async (request: FastifyRequest<{ Params: TargetParams }>, reply) =>
      result(reply, await dependencies.service.enable(await actor(request), request.params.user_identity_id,
        request.body, idempotencyKey(request) as string, correlation(reply))));

  app.post("/api/v1/platform/managed-identities/:user_identity_id(.*)::password-reset",
    async (request: FastifyRequest<{ Params: TargetParams }>, reply) =>
      result(reply, await dependencies.service.passwordReset(await actor(request), request.params.user_identity_id,
        request.body, idempotencyKey(request) as string, correlation(reply))));

  app.post("/api/v1/platform/managed-identities/:user_identity_id(.*)::mfa-reset",
    async (request: FastifyRequest<{ Params: TargetParams }>, reply) =>
      result(reply, await dependencies.service.mfaReset(await actor(request), request.params.user_identity_id,
        request.body, idempotencyKey(request) as string, correlation(reply))));

  app.post("/api/v1/platform/managed-identities/:user_identity_id/sessions\:revoke",
    async (request: FastifyRequest<{ Params: TargetParams }>, reply) =>
      result(reply, await dependencies.service.sessionRevoke(await actor(request), request.params.user_identity_id,
        request.body, idempotencyKey(request) as string, correlation(reply))));
}
