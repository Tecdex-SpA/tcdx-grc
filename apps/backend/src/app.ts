import Fastify, { type FastifyInstance } from "fastify";
import { validate as validateUuid } from "uuid";
import { newUuidV7 } from "./uuid.js";
import { problemFromError } from "./errors.js";
import type { CoreGrcDependencies } from "./core-grc/model.js";
import { registerCoreGrcRoutes } from "./core-grc/routes.js";

export type ReadinessProbe = () => Promise<boolean>;

export function buildApp(readinessProbe: ReadinessProbe, coreGrc?: CoreGrcDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  app.addHook("onRequest", async (request, reply) => {
    const requestedCorrelation = request.headers["x-correlation-id"];
    const correlationId = typeof requestedCorrelation === "string" && validateUuid(requestedCorrelation)
      ? requestedCorrelation
      : newUuidV7();
    reply.header("x-correlation-id", correlationId);
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

  if (coreGrc) registerCoreGrcRoutes(app, coreGrc);

  return app;
}
