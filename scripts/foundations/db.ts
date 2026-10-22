import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isIP } from "node:net";
import pg from "pg";

const { Client, Pool } = pg;

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string | undefined;
  ssl: false | { rejectUnauthorized: boolean; ca?: string; servername?: string };
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("<")) throw new Error(`Missing required secret-backed configuration: ${name}`);
  return value;
}

export function databaseConfig(): DatabaseConfig {
  const sslMode = process.env.DATABASE_SSL_MODE ?? "require";
  const logicalHost = process.env.DATABASE_HOST ?? "192.168.2.40";
  const hostAddress = process.env.DATABASE_HOSTADDR;
  const rootCertificate = process.env.DATABASE_SSL_ROOT_CERT;
  if (hostAddress && (!isIP(hostAddress) || sslMode !== "verify-full")) {
    throw new Error("DATABASE_HOSTADDR requires a literal IP and verify-full TLS");
  }
  if (sslMode === "verify-full" && !rootCertificate) {
    throw new Error("verify-full requires an explicit approved DATABASE_SSL_ROOT_CERT");
  }
  // libpq host/hostaddr semantics: connect to the explicit address while TLS
  // verifies the logical hostname. No DNS rewrite, proxy or disabled check.
  const ssl = sslMode === "disable" ? false : {
    rejectUnauthorized: sslMode !== "no-verify",
    ...(rootCertificate ? { ca: readFileSync(rootCertificate, "utf8") } : {}),
    ...(sslMode === "verify-full" ? { servername: logicalHost } : {})
  };
  return {
    host: hostAddress ?? logicalHost,
    port: Number(process.env.DATABASE_PORT ?? "5432"),
    database: process.env.DATABASE_NAME ?? "tcdx-grc",
    user: required("DATABASE_USER"),
    password: process.env.DATABASE_PASSWORD && !process.env.DATABASE_PASSWORD.startsWith("<") ? process.env.DATABASE_PASSWORD : undefined,
    ssl
  };
}

export function createClient(): InstanceType<typeof Client> {
  return new Client(databaseConfig());
}

export function createPool(): InstanceType<typeof Pool> {
  return new Pool(databaseConfig());
}

export const repositoryRoot = resolve(import.meta.dirname, "../..");

export function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(repositoryRoot, relativePath), "utf8")) as T;
}
