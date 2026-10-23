import { composeNormativeLibraryForBootstrap } from "./normative-library/bootstrap.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase, databaseReady } from "./database.js";
import { BlockedIdentityVerifier } from "./security/authentication.js";
import { ApplicationTokenService } from "./security/application-token.js";
import { OidcBrowserClient, type OidcConfig } from "./security/oidc-browser.js";
import { UnavailableFileStoragePort } from "./ports/file-storage.js";
import { MinioFileStoragePort } from "./ports/minio-file-storage.js";
import { KeycloakManagedUserAdapter } from "./security/keycloak-managed-user-adapter.js";
import { ManagedIdentityService } from "./security/managed-identity-service.js";
import { startCommercialCatalogOperator } from "./security/commercial-catalog-operator.js";
import { configureQaIamPublication } from "./security/iam-publication-runtime.js";

const config = loadConfig(process.env);
const database = createDatabase(config);
const applicationTokens = config.applicationJwt.configured
  ? await ApplicationTokenService.create(config.applicationJwt as Required<Omit<typeof config.applicationJwt, "configured">>)
  : undefined;
if (process.env.TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET &&
    (!applicationTokens || !process.env.TCDX_COMMERCIAL_APPROVED_MANIFEST_SHA256))
  throw new Error("Commercial catalog operator requires application token verification and approved manifest hash");
const identityVerifier = applicationTokens ?? new BlockedIdentityVerifier();
const iamPublication = applicationTokens ? await configureQaIamPublication(database, applicationTokens, config, process.env) : undefined;
const oidcBrowser = config.oidc.configured && applicationTokens
  ? new OidcBrowserClient(
      config.oidc as OidcConfig,
      config.frontendOrigin,
      database,
      applicationTokens
    )
  : undefined;
const managedIdentityBrowser = config.managedIdentityOidc.configured && applicationTokens
  ? new OidcBrowserClient(
      config.managedIdentityOidc as OidcConfig,
      config.frontendOrigin,
      database,
      applicationTokens,
      undefined, undefined, undefined, config.browserSession
    )
  : undefined;
const managedIdentityService = config.managedIdentityAdmin.configured && applicationTokens
  ? new ManagedIdentityService(database,
      new KeycloakManagedUserAdapter(config.managedIdentityAdmin as {
        baseUrl: URL; clientId: string; clientSecret: string; issuer: string
      }), (principalId) => applicationTokens.revokePrincipal(principalId))
  : undefined;
const fileStorage = config.objectStorage.configured
  ? new MinioFileStoragePort(config.objectStorage as Required<Omit<typeof config.objectStorage, "configured">>)
  : new UnavailableFileStoragePort();
const normativeLibrary = await composeNormativeLibraryForBootstrap({
  database, fileStorage, environment: config.nodeEnv, cursor: applicationTokens
});
const app = buildApp(() => databaseReady(database), {
  database,
  identityVerifier,
  fileStorage,
  normativeLibrary,
  ...(applicationTokens ? { referenceCursor: applicationTokens } : {}),
  runtimeEnvironment: config.nodeEnv
}, oidcBrowser, config.frontendOrigin, managedIdentityBrowser, managedIdentityService,
{ zohoConfigured: config.oidc.configured, managedConfigured: config.managedIdentityOidc.configured });
const stopCatalogOperator = process.env.TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET && applicationTokens
  ? await startCommercialCatalogOperator({
      socketPath: process.env.TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET,
      approvedManifestSha256: process.env.TCDX_COMMERCIAL_APPROVED_MANIFEST_SHA256!,
      database,
      identityVerifier: applicationTokens,
      ...(iamPublication ? { iamOperation: (operation: "iam.provision" | "iam.publish" | "iam.revoke" | "iam.c04w.publish" | "iam.initial_source.publish" | "iam.library.publish" | "iam.runtime_bindings.publish", correlationId: string) =>
        operation === "iam.provision" ? iamPublication.provision(correlationId)
          : operation === "iam.revoke" ? iamPublication.revoke(correlationId)
          : operation === "iam.initial_source.publish" ? iamPublication.publishInitialSource(correlationId)
          : operation === "iam.runtime_bindings.publish" ? iamPublication.publishRuntimeBindings(correlationId)
          : operation === "iam.library.publish" ? iamPublication.publishNormativeLibrary(correlationId)
          : operation === "iam.c04w.publish" ? iamPublication.publishC04w(correlationId) : iamPublication.publish(correlationId) } : {})
    })
  : undefined;

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  app.log.info({ signal }, "shutdown requested");

  try {
    await app.close();
  } finally {
    await stopCatalogOperator?.();
    await database.destroy();
  }
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM").finally(() => process.exit(0));
});

process.once("SIGINT", () => {
  void shutdown("SIGINT").finally(() => process.exit(0));
});

try {
  if (fileStorage instanceof MinioFileStoragePort) await fileStorage.verifyReady();
  await app.listen({
    host: "0.0.0.0",
    port: config.port
  });
} catch (error) {
  await stopCatalogOperator?.();
  await database.destroy();
  throw error;
}
