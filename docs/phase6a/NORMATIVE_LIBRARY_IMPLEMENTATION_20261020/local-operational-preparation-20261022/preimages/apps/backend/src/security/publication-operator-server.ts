import { loadConfig } from "../config.js";
import { createDatabase } from "../database.js";
import { ApplicationTokenService, type ApplicationJwtConfig, type ApplicationSessionStore } from "./application-token.js";
import { configureQaIamPublication } from "./iam-publication-runtime.js";
import { startCommercialCatalogOperator } from "./commercial-catalog-operator.js";
import { FoundationError } from "../errors.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function existingQaHumanSessionVerifier(jwt: ApplicationJwtConfig, origin: string, fetcher: typeof fetch = fetch) {
  const endpoint = new URL(origin);
  if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" || endpoint.pathname !== "/"
    || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw Error("EXISTING_QA_SESSION_LOOPBACK_REQUIRED");
  const unavailable = async (): Promise<never> => { throw new FoundationError("TCDX.AUTHENTICATION.INVALID", "Authentication failed", 401); };
  return { verifyBearerToken: async (token: string) => {
    const sessions: ApplicationSessionStore = { register: unavailable, revoke: unavailable, revokePrincipal: unavailable, isUnrevoked: async () => false,
      isActive: async () => {
        try {
          const response = await fetcher(`${endpoint.origin}/api/v2/auth/me/authorization`, {
            headers: { authorization: `Bearer ${token}`, accept: "application/json" },
            redirect: "error", signal: AbortSignal.timeout(8_000)
          });
          if (!response.ok) return false;
          const data = await response.json() as { platform_permissions?: unknown; tenant_permissions?: unknown };
          return Array.isArray(data.platform_permissions) && data.tenant_permissions === null;
        } catch { return false; }
      } };
    return (await ApplicationTokenService.create(jwt, sessions)).verifyBearerToken(token);
  } };
}

/** Operational entry point for the existing private operator, before release promotion. No HTTP listener. */
async function main() {
  const config = loadConfig(process.env);
  if (config.nodeEnv !== "qa" || !config.applicationJwt.configured) throw Error("QA_APPLICATION_AUTHENTICATION_REQUIRED");
  const socketPath = process.env.TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET;
  const approvedManifestSha256 = process.env.TCDX_COMMERCIAL_APPROVED_MANIFEST_SHA256;
  if (!socketPath || !approvedManifestSha256) throw Error("EXACT_OPERATOR_CONFIGURATION_REQUIRED");
  const origin = process.env.TCDX_QA_EXISTING_SESSION_ORIGIN;
  if (!origin) throw Error("EXISTING_QA_SESSION_LOOPBACK_REQUIRED");
  const jwt = config.applicationJwt as ApplicationJwtConfig;
  const db = createDatabase(config);
  const tokens = await ApplicationTokenService.create(jwt);
  const iam = await configureQaIamPublication(db, tokens, config, process.env);
  if (!iam) throw Error("IAM_PUBLICATION_CONFIGURATION_REQUIRED");
  const stop = await startCommercialCatalogOperator({ socketPath, approvedManifestSha256, database: db,
    iamOperation: (operation, correlationId) => operation === "iam.provision" ? iam.provision(correlationId)
      : operation === "iam.revoke" ? iam.revoke(correlationId)
      : operation === "iam.initial_source.publish" ? iam.publishInitialSource(correlationId)
      : operation === "iam.c04w.publish" ? iam.publishC04w(correlationId) : iam.publish(correlationId),
    identityVerifier: existingQaHumanSessionVerifier(jwt, origin)
  });
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await stop(); await db.destroy();
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => { void close().finally(() => process.exit(0)); });
  process.stdout.write("QA_PRIVATE_PUBLICATION_OPERATOR_READY\n");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main().catch(() => { process.stderr.write("QA_PUBLICATION_OPERATOR_STARTUP_FAILED\n"); process.exit(1); });
