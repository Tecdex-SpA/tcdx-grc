import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client, Pool } = pg;

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl: false | { rejectUnauthorized: boolean };
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("<")) throw new Error(`Missing required secret-backed configuration: ${name}`);
  return value;
}

export function databaseConfig(): DatabaseConfig {
  const sslMode = process.env.DATABASE_SSL_MODE ?? "require";
  return {
    host: process.env.DATABASE_HOST ?? "192.168.2.40",
    port: Number(process.env.DATABASE_PORT ?? "5432"),
    database: process.env.DATABASE_NAME ?? "tcdx-grc",
    user: required("DATABASE_USER"),
    password: process.env.DATABASE_PASSWORD && !process.env.DATABASE_PASSWORD.startsWith("<") ? process.env.DATABASE_PASSWORD : undefined,
    ssl: sslMode === "disable" ? false : { rejectUnauthorized: sslMode !== "no-verify" }
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
