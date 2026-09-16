export type RuntimeEnvironment = Record<string, string | undefined>;

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
  oidc: {
    configured: boolean;
    issuer?: string;
    audience?: string;
    jwksUri?: string;
    allowedAlgorithms?: string[];
  };
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
  const issuer = optionalRuntimeValue(environment, "OIDC_ISSUER");
  const audience = optionalRuntimeValue(environment, "OIDC_AUDIENCE");
  const jwksUri = optionalRuntimeValue(environment, "OIDC_JWKS_URI");
  const algorithms = optionalRuntimeValue(environment, "OIDC_ALLOWED_ALGORITHMS");
  const databasePassword = optionalRuntimeValue(environment, "DATABASE_PASSWORD");
  const oidcConfigured = Boolean(issuer && audience && jwksUri && algorithms);
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
      configured: oidcConfigured,
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
      ...(jwksUri ? { jwksUri } : {}),
      ...(algorithms ? { allowedAlgorithms: algorithms.split(",").map((value) => value.trim()).filter(Boolean) } : {})
    },
    aiServiceOrigin: "https://ia2.tcdx.int"
  };
}
