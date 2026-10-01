import Fastify, { type FastifyInstance } from "fastify";
import type { Readable } from "node:stream";
import { validate as validateUuid } from "uuid";
import { newUuidV7 } from "./uuid.js";
import { FoundationError, problemFromError } from "./errors.js";
import type { CoreGrcDependencies } from "./core-grc/model.js";
import { registerCoreGrcRoutes } from "./core-grc/routes.js";
import { registerOidcBrowserRoutes, type OidcBrowserClient } from "./security/oidc-browser.js";

export type ReadinessProbe = () => Promise<boolean>;

export function buildApp(
  readinessProbe: ReadinessProbe,
  coreGrc?: CoreGrcDependencies,
  oidcBrowser?: OidcBrowserClient,
  frontendOrigin?: string
): FastifyInstance {
  const app = Fastify({ logger: false });
  app.addContentTypeParser("application/octet-stream", (_request, payload, done) => done(null, payload as Readable));

  app.addHook("onRequest", async (request, reply) => {
    const requestedCorrelation = request.headers["x-correlation-id"];
    const correlationId = typeof requestedCorrelation === "string" && validateUuid(requestedCorrelation)
      ? requestedCorrelation
      : newUuidV7();
    reply.header("x-correlation-id", correlationId);
    const origin = request.headers.origin;
    if (origin && frontendOrigin && origin !== frontendOrigin) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    if (origin && frontendOrigin === origin) {
      reply.header("vary", "Origin")
        .header("access-control-allow-origin", frontendOrigin)
        .header("access-control-allow-methods", "GET, POST, PUT, OPTIONS")
        .header("access-control-allow-headers", "Authorization, Content-Type, Idempotency-Key, If-Match, X-Correlation-Id, X-TCDX-Tenant-Id")
        .header("access-control-expose-headers", "ETag, Idempotency-Replayed, X-Correlation-Id");
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

  registerOidcBrowserRoutes(app, oidcBrowser);

  if (coreGrc) registerCoreGrcRoutes(app, coreGrc);

  return app;
}
