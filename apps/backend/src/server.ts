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

const config = loadConfig(process.env);
const database = createDatabase(config);
const applicationTokens = config.applicationJwt.configured
  ? await ApplicationTokenService.create(config.applicationJwt as Required<Omit<typeof config.applicationJwt, "configured">>)
  : undefined;
const identityVerifier = applicationTokens ?? new BlockedIdentityVerifier();
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
      applicationTokens
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
const app = buildApp(() => databaseReady(database), {
  database,
  identityVerifier,
  fileStorage,
  runtimeEnvironment: config.nodeEnv
}, oidcBrowser, config.frontendOrigin, managedIdentityBrowser, managedIdentityService,
{ zohoConfigured: config.oidc.configured, managedConfigured: config.managedIdentityOidc.configured });

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  app.log.info({ signal }, "shutdown requested");

  try {
    await app.close();
  } finally {
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
  await database.destroy();
  throw error;
}
