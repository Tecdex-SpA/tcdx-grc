import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

export type RuntimeEnvironment = Record<string, string | undefined>;

const MANAGED_IDENTITY_ISSUER = "https://iam.grc.tecdex.net/realms/tcdx-managed-identity";
const MANAGED_IDENTITY_CALLBACK = "https://grc.tecdex.net/auth/callback";

type OidcProviderConfig = {
  configured: boolean;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  allowedAlgorithms?: string[];
  tokenEndpointAuthMethod?: "client_secret_basic" | "client_secret_post";
  requiredAmr?: readonly string[];
  identityResolution?: "resolve_or_create" | "existing_only";
};

export type BackendConfig = {
  nodeEnv: "development" | "test" | "qa" | "production";
  port: number;
  database: {
    host: string;
    port: number;
    name: "tcdx-grc";
    user: string;
    password?: string;
    sslMode: "disable" | "require" | "no-verify";
  };
  oidc: OidcProviderConfig;
  managedIdentityOidc: OidcProviderConfig;
  managedIdentityAdmin: {
    configured: boolean;
    baseUrl?: URL;
    clientId?: string;
    clientSecret?: string;
    issuer: string;
  };
  applicationJwt: {
    configured: boolean;
    issuer?: string;
    audience?: string;
    privateKey?: string;
    publicKey?: string;
    keyId?: string;
    algorithm?: "RS256" | "RS384" | "RS512";
    maxLifetimeSeconds?: number;
    clockToleranceSeconds?: number;
  };
  objectStorage: {
    configured: boolean;
    endpoint?: URL;
    bucket?: string;
    region?: string;
    accessKey?: string;
    secretKey?: string;
    signedUrlTtlSeconds?: number;
    maxUploadBytes?: number;
    encryptionKeyRef?: string;
    clamavHost?: string;
    clamavPort?: number;
    clamavTimeoutMs?: number;
  };
  frontendOrigin: string;
  aiServiceOrigin: "https://ia2.tcdx.int";
};

function required(environment: RuntimeEnvironment, key: string): string {
  const value = environment[key];
  if (!value || value.startsWith("<")) throw new Error(`Missing required secret-backed configuration: ${key}`);
  return value;
}

function optionalRuntimeValue(environment: RuntimeEnvironment, key: string): string | undefined {
  const value = environment[key];
  return value && !value.startsWith("<") ? value : undefined;
}

function secretValue(environment: RuntimeEnvironment, key: string): string | undefined {
  const inline = optionalRuntimeValue(environment, key);
  const file = optionalRuntimeValue(environment, `${key}_FILE`);
  if (inline && file) throw new Error(`${key} and ${key}_FILE are mutually exclusive`);
  if (!file) return inline;
  try {
    const value = readFileSync(file, "utf8").trim();
    if (!value) throw new Error("empty");
    return value;
  } catch {
    throw new Error(`Unable to read secret-backed configuration: ${key}_FILE`);
  }
}

function protectedSecretFile(environment: RuntimeEnvironment, key: string): string | undefined {
  if (optionalRuntimeValue(environment, key)) throw new Error(`${key} must use ${key}_FILE`);
  const path = optionalRuntimeValue(environment, `${key}_FILE`);
  if (!path) return undefined;
  try {
    const stat = statSync(path);
    if (!stat.isFile() || (stat.mode & 0o077) !== 0) throw new Error("unprotected");
    const value = readFileSync(path, "utf8").trim();
    if (!value) throw new Error("empty");
    return value;
  } catch {
    throw new Error(`Unable to read protected secret-backed configuration: ${key}_FILE`);
  }
}

function completeGroup(environment: RuntimeEnvironment, keys: readonly string[], label: string): Record<string, string> | null {
  const values = Object.fromEntries(keys.map((key) => [key, optionalRuntimeValue(environment, key)]));
  const present = keys.filter((key) => values[key] !== undefined);
  if (present.length === 0) return null;
  if (present.length !== keys.length) {
    const missing = keys.filter((key) => values[key] === undefined);
    throw new Error(`Incomplete ${label} configuration: ${missing.join(", ")}`);
  }
  return values as Record<string, string>;
}

function httpsUrl(value: string, key: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error(`${key} must use HTTPS`);
  return value;
}

function positiveInteger(value: string, key: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${key} must be a positive integer`);
  return parsed;
}

function boundedInteger(value: string, key: string, maximum: number): number {
  const parsed = positiveInteger(value, key);
  if (parsed > maximum) throw new Error(`${key} exceeds maximum ${maximum}`);
  return parsed;
}

export function loadConfig(environment: RuntimeEnvironment): BackendConfig {
  const nodeEnv = environment.NODE_ENV ?? "development";
  if (!["development", "test", "qa", "production"].includes(nodeEnv)) throw new Error("Invalid NODE_ENV");
  const port = Number(environment.PORT ?? "4000");
  const databasePort = Number(environment.DATABASE_PORT ?? "5432");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  if (!Number.isSafeInteger(databasePort) || databasePort < 1 || databasePort > 65535) throw new Error("Invalid DATABASE_PORT");
  const databaseName = environment.DATABASE_NAME ?? "tcdx-grc";
  if (databaseName !== "tcdx-grc") throw new Error("Database identity must be tcdx-grc");
  const sslMode = environment.DATABASE_SSL_MODE ?? "require";
  if (!["disable", "require", "no-verify"].includes(sslMode)) throw new Error("Invalid DATABASE_SSL_MODE");
  const oidcValues = completeGroup(environment, ["OIDC_ISSUER", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "OIDC_REDIRECT_URI"], "OIDC");
  const managedKeys = ["MANAGED_IDENTITY_OIDC_ISSUER", "MANAGED_IDENTITY_OIDC_CLIENT_ID", "MANAGED_IDENTITY_OIDC_REDIRECT_URI", "MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE"] as const;
  const managedPresent = managedKeys.some((key) => optionalRuntimeValue(environment, key) !== undefined);
  if (optionalRuntimeValue(environment, "MANAGED_IDENTITY_OIDC_CLIENT_SECRET")) {
    throw new Error("Managed Identity client secret must use MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE");
  }
  const managedValues = managedPresent
    ? completeGroup(environment, managedKeys, "Managed Identity OIDC")
    : null;
  if (managedPresent && !managedValues) throw new Error("Incomplete Managed Identity OIDC configuration");
  if (managedValues && (managedValues.MANAGED_IDENTITY_OIDC_ISSUER !== MANAGED_IDENTITY_ISSUER
    || managedValues.MANAGED_IDENTITY_OIDC_CLIENT_ID !== "tcdx-grc"
    || managedValues.MANAGED_IDENTITY_OIDC_REDIRECT_URI !== MANAGED_IDENTITY_CALLBACK)) {
    throw new Error("Managed Identity OIDC configuration must match the canonical issuer, client and callback");
  }
  const managedClientSecret = managedValues ? protectedSecretFile(environment, "MANAGED_IDENTITY_OIDC_CLIENT_SECRET") : undefined;
  const adminKeys = ["MANAGED_IDENTITY_ADMIN_BASE_URL", "MANAGED_IDENTITY_ADMIN_CLIENT_ID", "MANAGED_IDENTITY_ADMIN_CLIENT_SECRET_FILE"] as const;
  const adminPresent = adminKeys.some((key) => optionalRuntimeValue(environment, key) !== undefined);
  const adminValues = adminPresent ? completeGroup(environment, adminKeys, "Managed Identity Admin") : null;
  if (adminPresent && !adminValues) throw new Error("Incomplete Managed Identity Admin configuration");
  const adminSecret = adminValues ? protectedSecretFile(environment, "MANAGED_IDENTITY_ADMIN_CLIENT_SECRET") : undefined;
  let adminBaseUrl: URL | undefined;
  if (adminValues) {
    adminBaseUrl = new URL(adminValues.MANAGED_IDENTITY_ADMIN_BASE_URL!);
    if (adminValues.MANAGED_IDENTITY_ADMIN_CLIENT_ID !== "tcdx-grc-managed-identity-provisioner"
      || adminBaseUrl.protocol !== "http:"
      || adminBaseUrl.hostname !== "192.168.2.46" || adminBaseUrl.port !== "8180"
      || adminBaseUrl.pathname !== "/" || adminBaseUrl.search || adminBaseUrl.hash
      || adminBaseUrl.username || adminBaseUrl.password) {
      throw new Error("Managed Identity Admin endpoint/client must be the approved internal service");
    }
  }
  const privateKey = secretValue(environment, "APP_JWT_PRIVATE_KEY");
  const publicKey = secretValue(environment, "APP_JWT_PUBLIC_KEY");
  if (Boolean(privateKey) !== Boolean(publicKey)) throw new Error("Incomplete application JWT keypair configuration");
  if ((oidcValues || managedValues) && !privateKey) throw new Error("OIDC requires a complete TCDX application JWT configuration");
  const databasePassword = optionalRuntimeValue(environment, "DATABASE_PASSWORD");
  const oidcAlgorithms = (optionalRuntimeValue(environment, "OIDC_ALLOWED_ALGORITHMS") ?? "RS256").split(",").map((value) => value.trim()).filter(Boolean);
  const oidcScopes = (optionalRuntimeValue(environment, "OIDC_SCOPES") ?? "openid profile email").split(/\s+/).filter(Boolean);
  if (oidcValues && (!oidcAlgorithms?.length || oidcAlgorithms.some((algorithm) => !["RS256", "RS384", "RS512"].includes(algorithm)))) {
    throw new Error("OIDC_ALLOWED_ALGORITHMS contains an unauthorized algorithm");
  }
  if (oidcValues && !oidcScopes?.includes("openid")) throw new Error("OIDC_SCOPES must include openid");
  const oidcTokenEndpointAuthMethod = optionalRuntimeValue(environment, "OIDC_TOKEN_ENDPOINT_AUTH_METHOD") ?? "client_secret_post";
  if (oidcTokenEndpointAuthMethod && !["client_secret_basic", "client_secret_post"].includes(oidcTokenEndpointAuthMethod)) {
    throw new Error("OIDC_TOKEN_ENDPOINT_AUTH_METHOD is unauthorized");
  }
  const jwtAlgorithm = optionalRuntimeValue(environment, "APP_JWT_ALGORITHM") ?? "RS256";
  if (jwtAlgorithm && !["RS256", "RS384", "RS512"].includes(jwtAlgorithm)) throw new Error("APP_JWT_ALGORITHM is unauthorized");
  const frontendOrigin = new URL(environment.FRONTEND_ORIGIN ?? "https://grc-www.tcdx.int").origin;
  if (!frontendOrigin.startsWith("https://")) throw new Error("FRONTEND_ORIGIN must use HTTPS");
  const storageEndpointValue = optionalRuntimeValue(environment, "OBJECT_STORAGE_ENDPOINT");
  const storageBucket = optionalRuntimeValue(environment, "OBJECT_STORAGE_BUCKET");
  const storageAccessKey = secretValue(environment, "OBJECT_STORAGE_ACCESS_KEY");
  const storageSecretKey = secretValue(environment, "OBJECT_STORAGE_SECRET_KEY");
  const storageEncryptionKeyRef = optionalRuntimeValue(environment, "OBJECT_STORAGE_ENCRYPTION_KEY_REF");
  const clamavHost = optionalRuntimeValue(environment, "CLAMAV_HOST");
  const storageParts = [storageEndpointValue, storageBucket, storageAccessKey, storageSecretKey, storageEncryptionKeyRef, clamavHost];
  const storagePresent = storageParts.filter(Boolean).length;
  if (storagePresent !== 0 && storagePresent !== storageParts.length) throw new Error("Incomplete object storage configuration");
  let storageEndpoint: URL | undefined;
  if (storageEndpointValue) {
    storageEndpoint = new URL(storageEndpointValue);
    if (!(["https:", "http:"].includes(storageEndpoint.protocol))) throw new Error("OBJECT_STORAGE_ENDPOINT must use HTTP(S)");
    if (storageEndpoint.pathname !== "/" || storageEndpoint.search || storageEndpoint.hash || storageEndpoint.username || storageEndpoint.password) throw new Error("OBJECT_STORAGE_ENDPOINT must contain only scheme, host and optional port");
    const allowInsecure = environment.OBJECT_STORAGE_ALLOW_INSECURE_HTTP === "true";
    if (storageEndpoint.protocol !== "https:" && (!allowInsecure || nodeEnv === "production")) throw new Error("Insecure object storage endpoint is not authorized");
  }
  return {
    nodeEnv: nodeEnv as BackendConfig["nodeEnv"],
    port,
    database: {
      host: environment.DATABASE_HOST ?? "192.168.2.40",
      port: databasePort,
      name: "tcdx-grc",
      user: required(environment, "DATABASE_USER"),
      ...(databasePassword ? { password: databasePassword } : {}),
      sslMode: sslMode as BackendConfig["database"]["sslMode"]
    },
    oidc: {
      configured: oidcValues !== null,
      ...(oidcValues ? {
        issuer: httpsUrl(oidcValues.OIDC_ISSUER!, "OIDC_ISSUER"),
        clientId: oidcValues.OIDC_CLIENT_ID!,
        clientSecret: oidcValues.OIDC_CLIENT_SECRET!,
        redirectUri: httpsUrl(oidcValues.OIDC_REDIRECT_URI!, "OIDC_REDIRECT_URI"),
        scopes: oidcScopes!,
        allowedAlgorithms: oidcAlgorithms!,
        tokenEndpointAuthMethod: oidcTokenEndpointAuthMethod as "client_secret_basic" | "client_secret_post"
      } : {})
    },
    managedIdentityOidc: {
      configured: managedValues !== null,
      ...(managedValues && managedClientSecret ? {
        issuer: MANAGED_IDENTITY_ISSUER,
        clientId: "tcdx-grc",
        clientSecret: managedClientSecret,
        redirectUri: MANAGED_IDENTITY_CALLBACK,
        scopes: ["openid"],
        allowedAlgorithms: ["RS256"],
        tokenEndpointAuthMethod: "client_secret_post" as const,
        requiredAmr: ["pwd", "otp"],
        identityResolution: "existing_only" as const
      } : {})
    },
    managedIdentityAdmin: {
      configured: Boolean(adminValues && adminSecret && adminBaseUrl),
      issuer: MANAGED_IDENTITY_ISSUER,
      ...(adminValues && adminSecret && adminBaseUrl ? {
        baseUrl: adminBaseUrl,
        clientId: adminValues.MANAGED_IDENTITY_ADMIN_CLIENT_ID!,
        clientSecret: adminSecret
      } : {})
    },
    applicationJwt: {
      configured: Boolean(privateKey && publicKey),
      ...(privateKey && publicKey ? {
        issuer: httpsUrl(optionalRuntimeValue(environment, "APP_JWT_ISSUER") ?? optionalRuntimeValue(environment, "BACKEND_PUBLIC_ORIGIN") ?? "https://grc-bk.tcdx.int", "APP_JWT_ISSUER"),
        audience: optionalRuntimeValue(environment, "APP_JWT_AUDIENCE") ?? "tcdx-grc-api",
        privateKey: privateKey.replaceAll("\\n", "\n"),
        publicKey: publicKey.replaceAll("\\n", "\n"),
        keyId: optionalRuntimeValue(environment, "APP_JWT_KEY_ID") ?? `tcdx-${createHash("sha256").update(publicKey).digest("hex").slice(0, 16)}`,
        algorithm: jwtAlgorithm as "RS256" | "RS384" | "RS512",
        maxLifetimeSeconds: positiveInteger(optionalRuntimeValue(environment, "APP_JWT_MAX_LIFETIME_SECONDS") ?? "300", "APP_JWT_MAX_LIFETIME_SECONDS"),
        clockToleranceSeconds: positiveInteger(optionalRuntimeValue(environment, "APP_JWT_CLOCK_TOLERANCE_SECONDS") ?? "5", "APP_JWT_CLOCK_TOLERANCE_SECONDS")
      } : {})
    },
    objectStorage: {
      configured: storagePresent === storageParts.length && storagePresent > 0,
      ...(storageEndpoint && storageBucket && storageAccessKey && storageSecretKey && storageEncryptionKeyRef && clamavHost ? {
        endpoint: storageEndpoint,
        bucket: storageBucket,
        region: optionalRuntimeValue(environment, "OBJECT_STORAGE_REGION") ?? "us-east-1",
        accessKey: storageAccessKey,
        secretKey: storageSecretKey,
        signedUrlTtlSeconds: boundedInteger(optionalRuntimeValue(environment, "OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS") ?? "300", "OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS", 900),
        maxUploadBytes: boundedInteger(optionalRuntimeValue(environment, "OBJECT_STORAGE_MAX_UPLOAD_BYTES") ?? "26214400", "OBJECT_STORAGE_MAX_UPLOAD_BYTES", 1073741824),
        encryptionKeyRef: storageEncryptionKeyRef,
        clamavHost,
        clamavPort: boundedInteger(optionalRuntimeValue(environment, "CLAMAV_PORT") ?? "3310", "CLAMAV_PORT", 65535),
        clamavTimeoutMs: boundedInteger(optionalRuntimeValue(environment, "CLAMAV_TIMEOUT_MS") ?? "120000", "CLAMAV_TIMEOUT_MS", 600000)
      } : {})
    },
    frontendOrigin,
    aiServiceOrigin: "https://ia2.tcdx.int"
  };
}
