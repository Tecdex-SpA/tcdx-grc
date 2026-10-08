import Fastify, { type FastifyInstance } from "fastify";
import type { Readable } from "node:stream";
import { validate as validateUuid } from "uuid";
import { newUuidV7 } from "./uuid.js";
import { FoundationError, problemFromError } from "./errors.js";
import type { CoreGrcDependencies } from "./core-grc/model.js";
import { registerCoreGrcRoutes } from "./core-grc/routes.js";
import { registerOidcBrowserRoutes, type OidcBrowserClient } from "./security/oidc-browser.js";
import { registerManagedIdentityRoutes } from "./security/managed-identity-routes.js";
import type { ManagedIdentityService } from "./security/managed-identity-service.js";
import { registerFrontendProjectionRoutes } from "./security/frontend-projections.js";
import { registerPlatformRoleRoutes } from "./security/platform-role-routes.js";
import { registerTenantOnboardingRoutes } from "./security/tenant-onboarding-routes.js";

export type ReadinessProbe = () => Promise<boolean>;

export function buildApp(
  readinessProbe: ReadinessProbe,
  coreGrc?: CoreGrcDependencies,
  oidcBrowser?: OidcBrowserClient,
  frontendOrigin?: string,
  managedIdentityBrowser?: OidcBrowserClient,
  managedIdentityService?: ManagedIdentityService,
  providerConfiguration: { zohoConfigured: boolean; managedConfigured: boolean } = { zohoConfigured: false, managedConfigured: false }
): FastifyInstance {
  const app = Fastify({ logger: false });
  app.addContentTypeParser("application/octet-stream", (_request, payload, done) => done(null, payload as Readable));

  app.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/api/v1/auth/providers") || request.url.startsWith("/api/v1/auth/me/authorization")
      || request.url.startsWith("/api/v1/platform/user-identities/")
      || request.url.startsWith("/api/v1/user-identities")
      || request.url.startsWith("/api/v1/platform/tenants:initial-onboarding")
      || /^\/api\/v1\/platform\/tenants\/[^/]+\/users:onboard(?:\?|$)/.test(request.url)
      || (request.method === "GET" && request.url.startsWith("/api/v1/roles?")
        && Object.hasOwn(request.query as object, "assignable_family"))
      || (request.method === "POST" && request.url.startsWith("/api/v1/platform/managed-identities"))) {
      reply.header("cache-control", "no-store").header("pragma", "no-cache");
    }
    const authorizationProjection = request.url.startsWith("/api/v1/auth/me/authorization");
    if (authorizationProjection) reply.header("vary", "Authorization, X-TCDX-Tenant-Id");
    const requestedCorrelation = request.headers["x-correlation-id"];
    const correlationId = typeof requestedCorrelation === "string" && validateUuid(requestedCorrelation)
      ? requestedCorrelation
      : newUuidV7();
    reply.header("x-correlation-id", correlationId);
    reply.header("x-request-id", newUuidV7());
    const origin = request.headers.origin;
    if (origin && frontendOrigin && origin !== frontendOrigin) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    if (origin && frontendOrigin === origin) {
      reply.header("vary", authorizationProjection ? "Authorization, X-TCDX-Tenant-Id" : "Origin")
        .header("access-control-allow-origin", frontendOrigin)
        .header("access-control-allow-methods", "GET, POST, PUT, OPTIONS")
        .header("access-control-allow-headers", "Authorization, Content-Type, Idempotency-Key, If-Match, X-Correlation-Id, X-TCDX-Tenant-Id")
        .header("access-control-expose-headers", "ETag, Idempotency-Replayed, X-Correlation-Id, X-Request-Id");
      if (request.method === "OPTIONS") return reply.code(204).send();
    }
  });

  app.setErrorHandler((error, request, reply) => {
    const correlation = String(reply.getHeader("x-correlation-id") ?? request.id);
    const problem = problemFromError(error, correlation);
    void reply.code(problem.statusCode).type("application/problem+json").send(problem.body);
  });

  app.get("/health/live", async () => ({ state: "up" as const }));
  app.get("/health/ready", async (_request, reply) => {
    const database = await readinessProbe();
    if (!database) return reply.code(503).send({ state: "down", dependencies: { database: "down" } });
    return { state: "up" as const, dependencies: { database: "up" as const } };
  });

  registerOidcBrowserRoutes(app, oidcBrowser, managedIdentityBrowser);

  registerFrontendProjectionRoutes(app, { database: coreGrc?.database, identityVerifier: coreGrc?.identityVerifier,
    providers: { zohoConfigured: providerConfiguration.zohoConfigured, zohoRegistered: Boolean(oidcBrowser),
      managedConfigured: providerConfiguration.managedConfigured, managedRegistered: Boolean(managedIdentityBrowser) } });

  if (coreGrc) registerCoreGrcRoutes(app, coreGrc);

  if (coreGrc) registerPlatformRoleRoutes(app, coreGrc);

  if (coreGrc) registerTenantOnboardingRoutes(app, coreGrc, managedIdentityService);

  if (coreGrc && managedIdentityService) registerManagedIdentityRoutes(app, {
    database: coreGrc.database, identityVerifier: coreGrc.identityVerifier, service: managedIdentityService
  });

  return app;
}
