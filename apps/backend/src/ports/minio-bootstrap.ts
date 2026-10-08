import { readFileSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";
import { Client } from "minio";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("<")) throw new Error(`Missing object-storage bootstrap configuration: ${name}`);
  return value;
}

function secret(name: string): string {
  const inline = process.env[name];
  const file = process.env[`${name}_FILE`];
  if (inline && file) throw new Error(`${name} and ${name}_FILE are mutually exclusive`);
  if (inline) return inline;
  if (!file) throw new Error(`Missing object-storage bootstrap secret: ${name}`);
  const value = readFileSync(file, "utf8").trim();
  if (!value) throw new Error(`Empty object-storage bootstrap secret: ${name}`);
  return value;
}

const endpoint = new URL(required("OBJECT_STORAGE_ENDPOINT"));
const bucket = required("OBJECT_STORAGE_BUCKET");
const region = process.env.OBJECT_STORAGE_REGION ?? "us-east-1";
const client = new Client({
  endPoint: endpoint.hostname,
  port: Number(endpoint.port || (endpoint.protocol === "https:" ? 443 : 80)),
  useSSL: endpoint.protocol === "https:",
  accessKey: secret("OBJECT_STORAGE_ACCESS_KEY"),
  secretKey: secret("OBJECT_STORAGE_SECRET_KEY"),
  region,
  pathStyle: true
});

let lastError: unknown;
for (let attempt = 1; attempt <= 60; attempt += 1) {
  try {
    if (!(await client.bucketExists(bucket))) await client.makeBucket(bucket, region);
    await client.setBucketEncryption(bucket);
    await client.setBucketVersioning(bucket, { Status: "Enabled" });
    const encryption = await client.getBucketEncryption(bucket);
    const versioning = await client.getBucketVersioning(bucket);
    const encryptionAlgorithm = encryption?.ServerSideEncryptionConfiguration?.Rule
      ?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm;
    if (encryptionAlgorithm !== "AES256" || versioning.Status !== "Enabled") {
      throw new Error("Object-storage bootstrap postcondition failed");
    }
    process.stdout.write(`${JSON.stringify({ bucket, private: true, encryption: "AES256", versioning: "Enabled" })}\n`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 60) await wait(2_000);
  }
}

throw new Error(`Object-storage bootstrap failed: ${lastError instanceof Error ? lastError.message : "unknown error"}`);
