import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import type { Client } from "minio";
import { describe, expect, it, vi } from "vitest";
import { FoundationError } from "../errors.js";
import type { AuthorizedFileAccess } from "./file-storage.js";
import { MinioFileStoragePort, type MinioFileStorageConfig } from "./minio-file-storage.js";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const correlationId = "018f47f2-6170-7bd0-9d43-12f644a2b112";
const uploadIntentId = "018f47f2-6170-7bd0-9d43-12f644a2b113";
const fileObjectId = "018f47f2-6170-7bd0-9d43-12f644a2b114";

const config: MinioFileStorageConfig = {
  endpoint: new URL("https://minio.qa.invalid"),
  bucket: "tcdx-grc-evidence",
  region: "us-east-1",
  accessKey: "runtime-only-access-key",
  secretKey: "runtime-only-secret-key",
  signedUrlTtlSeconds: 300,
  maxUploadBytes: 1_024,
  encryptionKeyRef: "kms/runtime/evidence",
  clamavHost: "clamav",
  clamavPort: 3310,
  clamavTimeoutMs: 5_000
};

const access: AuthorizedFileAccess = {
  tenantId,
  correlationId,
  capabilityEnabled: true,
  permissionGranted: true,
  scope: "tenant",
  objectPolicyAllowed: true
};

function client(overrides: Record<string, unknown> = {}): Client {
  return {
    bucketExists: vi.fn().mockResolvedValue(true),
    getBucketEncryption: vi.fn().mockResolvedValue({
      ServerSideEncryptionConfiguration: {
        Rule: { ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } }
      }
    }),
    presignedPutObject: vi.fn().mockResolvedValue("https://minio.qa.invalid/signed-put"),
    statObject: vi.fn().mockResolvedValue({ size: 12, versionId: "version-1", etag: "etag-1" }),
    getObject: vi.fn().mockResolvedValue(Readable.from([Buffer.from("%PDF-test")])) ,
    copyObject: vi.fn().mockResolvedValue({ VersionId: "version-1" }),
    removeObject: vi.fn().mockResolvedValue(undefined),
    presignedGetObject: vi.fn().mockResolvedValue("https://minio.qa.invalid/signed-get"),
    ...overrides
  } as unknown as Client;
}

const passedScan = async (_host: string, _port: number, _timeout: number, _stream: NodeJS.ReadableStream) => ({
  sha256: "a".repeat(64),
  sample: Buffer.from("%PDF-1.7\n")
});

describe("MinIO S3-compatible file storage", () => {
  it("streams only intent-bound browser bytes into private quarantine and rejects overflow", async () => {
    const payload = Buffer.from("%PDF-test-12");
    const putObject = vi.fn(async (_bucket: string, _key: string, stream: Readable) => {
      for await (const _chunk of stream) { /* consume the bounded stream */ }
    });
    const removeObject = vi.fn().mockResolvedValue(undefined);
    const fake = client({ putObject, removeObject, statObject: vi.fn().mockResolvedValue({ size: payload.length }) });
    const port = new MinioFileStoragePort(config, fake, passedScan);
    await port.uploadQuarantineContent({ ...access, uploadIntentId, quarantineObjectKey: `quarantine/${uploadIntentId}`, sizeBytes: payload.length, content: Readable.from([payload]) });
    expect(putObject).toHaveBeenCalledWith(config.bucket, `quarantine/${uploadIntentId}`, expect.any(Readable), payload.length);
    await expect(port.uploadQuarantineContent({ ...access, uploadIntentId, quarantineObjectKey: "quarantine/other", sizeBytes: payload.length, content: Readable.from([payload]) }))
      .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
    await expect(port.uploadQuarantineContent({ ...access, uploadIntentId, quarantineObjectKey: `quarantine/${uploadIntentId}`, sizeBytes: payload.length - 1, content: Readable.from([payload]) }))
      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 413 });
    expect(removeObject).toHaveBeenCalledWith(config.bucket, `quarantine/${uploadIntentId}`);
  });

  it("streams an authorized scan-PASS object and verifies its size and SHA-256", async () => {
    const payload = Buffer.from("%PDF-test-12");
    const sha256 = createHash("sha256").update(payload).digest("hex");
    const port = new MinioFileStoragePort(config, client({
      statObject: vi.fn().mockResolvedValue({ size: payload.length }),
      getObject: vi.fn().mockImplementation(async () => Readable.from([payload]))
    }), passedScan);
    const stream = await port.openDownload({ ...access, fileObjectId, objectKey: `objects/${fileObjectId}`, sha256, sizeBytes: payload.length, scanState: "passed", classification: "confidential" });
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(payload);
    await expect(port.openDownload({ ...access, fileObjectId, objectKey: "objects/other", sha256, sizeBytes: payload.length, scanState: "passed", classification: "confidential" }))
      .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED" });
    const missing = new MinioFileStoragePort(config, client({ statObject: vi.fn().mockRejectedValue(new Error("NoSuchKey")) }), passedScan);
    await expect(missing.openDownload({ ...access, fileObjectId, objectKey: `objects/${fileObjectId}`, sha256, sizeBytes: payload.length, scanState: "passed", classification: "confidential" }))
      .rejects.toMatchObject({ code: "TCDX.DEPENDENCY.UNAVAILABLE" });
  });
  it("allocates only the opaque server-owned quarantine key with a bounded expiry", async () => {
    const fake = client();
    const port = new MinioFileStoragePort(config, fake, passedScan);
    const before = Date.now();
    const result = await port.allocateQuarantineUpload({
      ...access,
      uploadIntentId,
      declaredMime: "application/pdf",
      sizeBytes: 12,
      classification: "confidential"
    });

    expect(result.objectKey).toBe(`quarantine/${uploadIntentId}`);
    expect(result.uploadReference).toBe("https://minio.qa.invalid/signed-put");
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 299_000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(before + 301_000);
    expect(fake.presignedPutObject).toHaveBeenCalledWith(config.bucket, `quarantine/${uploadIntentId}`, 300);
    await expect(port.allocateQuarantineUpload({ ...access, uploadIntentId, declaredMime: "application/pdf", sizeBytes: 1_025, classification: "confidential" }))
      .rejects.toMatchObject({ code: "TCDX.VALIDATION.FAILED", statusCode: 400 });
  });

  it("derives trusted metadata, promotes once and removes quarantine only after the caller commits", async () => {
    const statObject = vi.fn()
      .mockResolvedValueOnce({ size: 12, etag: "quarantine-etag" })
      .mockResolvedValueOnce({ size: 12, versionId: "version-1", etag: "final-etag" });
    const removeObject = vi.fn().mockResolvedValue(undefined);
    const fake = client({ statObject, removeObject });
    const port = new MinioFileStoragePort(config, fake, passedScan);

    const finalized = await port.finalizeQuarantine({
      ...access,
      uploadIntentId,
      fileObjectId,
      quarantineObjectKey: `quarantine/${uploadIntentId}`,
      declaredMime: "application/pdf",
      expectedSizeBytes: 12
    });

    expect(finalized).toEqual({
      objectKey: `objects/${fileObjectId}`,
      detectedMime: "application/pdf",
      sizeBytes: 12,
      sha256: "a".repeat(64),
      scanState: "passed",
      storageVersion: "version-1",
      encryptionKeyRef: "kms/runtime/evidence"
    });
    expect(fake.copyObject).toHaveBeenCalledTimes(1);
    expect(removeObject).not.toHaveBeenCalled();
    await port.removeQuarantine({ ...access, uploadIntentId, quarantineObjectKey: `quarantine/${uploadIntentId}` });
    expect(removeObject).toHaveBeenCalledWith(config.bucket, `quarantine/${uploadIntentId}`);
  });

  it("rejects wrong size and wrong detected MIME before any promotion", async () => {
    const copyObject = vi.fn();
    const wrongSize = new MinioFileStoragePort(config, client({ statObject: vi.fn().mockResolvedValue({ size: 11 }), copyObject }), passedScan);
    await expect(wrongSize.finalizeQuarantine({ ...access, uploadIntentId, fileObjectId, quarantineObjectKey: `quarantine/${uploadIntentId}`, declaredMime: "application/pdf", expectedSizeBytes: 12 }))
      .rejects.toMatchObject({ code: "TCDX.INVARIANT.VIOLATION", statusCode: 422 });

    const wrongMimeClient = client({ copyObject });
    const wrongMime = new MinioFileStoragePort(config, wrongMimeClient, passedScan);
    await expect(wrongMime.finalizeQuarantine({ ...access, uploadIntentId, fileObjectId, quarantineObjectKey: `quarantine/${uploadIntentId}`, declaredMime: "image/png", expectedSizeBytes: 12 }))
      .rejects.toMatchObject({ code: "TCDX.INVARIANT.VIOLATION", statusCode: 422 });
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("fails closed for malware and scanner unavailability without promoting content", async () => {
    const copyObject = vi.fn();
    const malwareScan = async () => { throw new FoundationError("TCDX.FILE.MALWARE_REJECTED", "malware", 422); };
    const malware = new MinioFileStoragePort(config, client({ copyObject }), malwareScan);
    await expect(malware.finalizeQuarantine({ ...access, uploadIntentId, fileObjectId, quarantineObjectKey: `quarantine/${uploadIntentId}`, declaredMime: "application/pdf", expectedSizeBytes: 12 }))
      .rejects.toMatchObject({ code: "TCDX.FILE.MALWARE_REJECTED", statusCode: 422 });

    const unavailableScan = async () => { throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "scanner unavailable", 503, true); };
    const unavailable = new MinioFileStoragePort(config, client({ copyObject }), unavailableScan);
    await expect(unavailable.finalizeQuarantine({ ...access, uploadIntentId, fileObjectId, quarantineObjectKey: `quarantine/${uploadIntentId}`, declaredMime: "application/pdf", expectedSizeBytes: 12 }))
      .rejects.toMatchObject({ code: "TCDX.DEPENDENCY.UNAVAILABLE", statusCode: 503, retryable: true });
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("enforces key binding and bucket encryption fail-closed", async () => {
    const port = new MinioFileStoragePort(config, client(), passedScan);
    await expect(port.finalizeQuarantine({ ...access, uploadIntentId, fileObjectId, quarantineObjectKey: "quarantine/other", declaredMime: "application/pdf", expectedSizeBytes: 12 }))
      .rejects.toMatchObject({ code: "TCDX.INVARIANT.VIOLATION", statusCode: 422 });
    await expect(port.createDownloadReference({ ...access, fileObjectId, objectKey: "objects/other", sha256: "a".repeat(64), scanState: "passed", classification: "confidential" }))
      .rejects.toMatchObject({ code: "TCDX.AUTHORIZATION.DENIED", statusCode: 403 });

    const noEncryption = new MinioFileStoragePort(config, client({
      getBucketEncryption: vi.fn().mockResolvedValue({ ServerSideEncryptionConfiguration: {} })
    }), passedScan);
    await expect(noEncryption.verifyReady()).rejects.toMatchObject({ code: "TCDX.DEPENDENCY.UNAVAILABLE", statusCode: 503 });
  });
});
