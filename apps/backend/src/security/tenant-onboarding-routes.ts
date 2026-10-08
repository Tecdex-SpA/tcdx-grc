import type { FastifyInstance } from "fastify";
import type { CoreGrcDependencies } from "../core-grc/model.js";
import { resolveAuthenticatedIdentity } from "../core-grc/security.js";
import { UserIdentityDiscovery, type IdentityDiscoveryMetadataPort } from "./user-identity-discovery.js";
import { TenantUserOnboarding, onboardingUuid } from "./tenant-user-onboarding.js";
import { userIdentityTenantAccessList } from "./administrative-read.js";
import { TenantInitialOnboarding } from "./tenant-initial-onboarding.js";

export function registerTenantOnboardingRoutes(app: FastifyInstance, dependencies: CoreGrcDependencies, metadata?: IdentityDiscoveryMetadataPort) {
  const tenantUsers = new TenantUserOnboarding(dependencies.database);
  const discovery = new UserIdentityDiscovery(dependencies.database, metadata);
  const onboarding = new TenantInitialOnboarding(dependencies.database, metadata);
  app.post<{ Params: { tenant_id: string } }>("/api/v1/platform/tenants/:tenant_id/users::onboard", async (request, reply) => {
    const value = await tenantUsers.create(await resolveAuthenticatedIdentity(dependencies.identityVerifier,request),
      request.params.tenant_id,request.headers["x-tcdx-tenant-id"],request.body,request.headers["idempotency-key"],
      String(reply.getHeader("x-correlation-id")),request.query as Record<string,unknown>);
    if (value.replayed) reply.header("idempotency-replayed","true");
    return reply.code(201).send(value.result);
  });
  app.get<{ Params: { user_identity_id: string } }>("/api/v1/platform/user-identities/:user_identity_id/tenant-access", async request => {
    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier,request);
    return userIdentityTenantAccessList(dependencies.database,identity,onboardingUuid(request.params.user_identity_id),
      request.headers["x-tcdx-tenant-id"],request.query,request.body);
  });
  // Fastify's application logger is disabled; this sensitive route must never log request.url/query values.
  app.get("/api/v1/user-identities", async (request, reply) => discovery.discover(
    await resolveAuthenticatedIdentity(dependencies.identityVerifier, request), request.headers["x-tcdx-tenant-id"],
    request.query as Record<string, unknown>, String(reply.getHeader("x-correlation-id")), request.body));
  app.post("/api/v1/platform/tenants::initial-onboarding", async (request, reply) => {
    const identity = await resolveAuthenticatedIdentity(dependencies.identityVerifier, request);
    const value = await onboarding.create(identity, request.headers["x-tcdx-tenant-id"], request.body,
      request.headers["idempotency-key"], String(reply.getHeader("x-correlation-id")), request.query as Record<string, unknown>);
    if (value.replayed) reply.header("idempotency-replayed", "true");
    return reply.code(201).send(value.result);
  });
}
