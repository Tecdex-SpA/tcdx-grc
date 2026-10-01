import { createHash } from "node:crypto";
import { connect } from "node:net";
import { Readable, Transform } from "node:stream";
import { Client, CopyDestinationOptions, CopySourceOptions } from "minio";
import { FoundationError } from "../errors.js";
import type { AuthorizedFileAccess, FileStoragePort, QuarantineUploadRequest } from "./file-storage.js";

export type MinioFileStorageConfig = {
  endpoint: URL;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  signedUrlTtlSeconds: number;
  maxUploadBytes: number;
  encryptionKeyRef: string;
  clamavHost: string;
  clamavPort: number;
  clamavTimeoutMs: number;
};

function assertAuthorized(request: AuthorizedFileAccess): void {
  if (!request.tenantId || !request.correlationId || request.capabilityEnabled !== true || request.permissionGranted !== true || request.objectPolicyAllowed !== true) {
    throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
  }
}

function detectedMime(sample: Buffer): string {
  if (sample.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (sample.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (sample[0] === 0xff && sample[1] === 0xd8 && sample[2] === 0xff) return "image/jpeg";
  if (["GIF87a", "GIF89a"].includes(sample.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (sample[0] === 0x50 && sample[1] === 0x4b && [0x03, 0x05, 0x07].includes(sample[2] ?? -1) && [0x04, 0x06, 0x08].includes(sample[3] ?? -1)) return "application/zip";
  const text = sample.toString("utf8").trimStart();
  if (text.startsWith("{") || text.startsWith("[")) {
    try { JSON.parse(text); return "application/json"; } catch { /* incomplete sample or plain text */ }
  }
  if (text.startsWith("<?xml") || /^<[A-Za-z][^>]*>/.test(text)) return "application/xml";
  if (sample.length > 0 && !sample.includes(0) && sample.toString("utf8").includes("�") === false) return "text/plain";
  return "application/octet-stream";
}

function clamavScan(host: string, port: number, timeoutMs: number, stream: NodeJS.ReadableStream): Promise<{ sha256: string; sample: Buffer }> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    const hash = createHash("sha256");
    const samples: Buffer[] = [];
    let sampleBytes = 0;
    let response = "";
    let settled = false;
    const fail = (message: string, cause?: unknown) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", message, 503, true, cause ? { dependency: "malware_scanner" } : undefined));
    };
    socket.setTimeout(timeoutMs, () => fail("Malware scanner timed out"));
    socket.on("error", (error) => fail("Malware scanner unavailable", error));
    socket.on("data", (chunk: Buffer) => { response += chunk.toString("utf8"); });
    socket.on("close", () => {
      if (settled) return;
      settled = true;
      const normalized = response.replaceAll("\0", "").trim();
      if (!normalized.endsWith("OK")) {
        reject(new FoundationError("TCDX.FILE.MALWARE_REJECTED", "Uploaded object failed malware scanning", 422, false, { scan_result: normalized.includes("FOUND") ? "malware_found" : "scanner_error" }));
        return;
      }
      resolve({ sha256: hash.digest("hex"), sample: Buffer.concat(samples, sampleBytes) });
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      stream.on("data", (raw: Buffer | string) => {
        const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        hash.update(chunk);
        if (sampleBytes < 8192) {
          const portion = chunk.subarray(0, 8192 - sampleBytes);
          samples.push(portion);
          sampleBytes += portion.length;
        }
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      });
      stream.once("error", () => fail("Object storage read failed"));
      stream.once("end", () => { const end = Buffer.alloc(4); socket.end(end); });
    });
  });
}

export class MinioFileStoragePort implements FileStoragePort {
  private readonly client: Client;

  constructor(
    private readonly config: MinioFileStorageConfig,
    client?: Client,
    private readonly scan: typeof clamavScan = clamavScan
  ) {
    this.client = client ?? new Client({
      endPoint: config.endpoint.hostname,
      port: Number(config.endpoint.port || (config.endpoint.protocol === "https:" ? 443 : 80)),
      useSSL: config.endpoint.protocol === "https:",
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
      pathStyle: true
    });
  }

  async verifyReady(): Promise<void> {
    try {
      if (!(await this.client.bucketExists(this.config.bucket))) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage bucket is unavailable", 503, true);
      const encryption = await this.client.getBucketEncryption(this.config.bucket);
      const encryptionAlgorithm = encryption?.ServerSideEncryptionConfiguration?.Rule
        ?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm;
      if (encryptionAlgorithm !== "AES256") {
        throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage bucket encryption is not configured", 503, false);
      }
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage readiness check failed", 503, true, { dependency: "object_storage" });
    }
  }

  async allocateQuarantineUpload(request: QuarantineUploadRequest): Promise<{ objectKey: string; uploadReference: string; expiresAt: Date }> {
    assertAuthorized(request);
    if (!Number.isSafeInteger(request.sizeBytes) || request.sizeBytes < 0 || request.sizeBytes > this.config.maxUploadBytes) {
      throw new FoundationError("TCDX.VALIDATION.FAILED", "Upload size is outside the configured range", 400, false, { field: "size_bytes" });
    }
    const objectKey = `quarantine/${request.uploadIntentId}`;
    const now = Date.now();
    const expiresAt = request.expiresAt ?? new Date(now + this.config.signedUrlTtlSeconds * 1_000);
    const remainingSeconds = Math.floor((expiresAt.getTime() - now) / 1_000);
    if (remainingSeconds < 1) throw new FoundationError("TCDX.LIFECYCLE.TRANSITION_DENIED", "Upload intent has expired", 409);
    const ttlSeconds = Math.min(this.config.signedUrlTtlSeconds, remainingSeconds);
    try {
      const uploadReference = await this.client.presignedPutObject(this.config.bucket, objectKey, ttlSeconds);
      return { objectKey, uploadReference, expiresAt };
    } catch {
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage upload allocation failed", 503, true, { dependency: "object_storage" });
    }
  }

  async uploadQuarantineContent(request: AuthorizedFileAccess & { uploadIntentId: string; quarantineObjectKey: string; sizeBytes: number; content: Readable }): Promise<void> {
    assertAuthorized(request);
    if (request.quarantineObjectKey !== `quarantine/${request.uploadIntentId}`) throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    if (!Number.isSafeInteger(request.sizeBytes) || request.sizeBytes < 1 || request.sizeBytes > this.config.maxUploadBytes) {
      throw new FoundationError("TCDX.VALIDATION.FAILED", "Upload size is outside the configured range", 400);
    }
    let received = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        if (received > request.sizeBytes) callback(new FoundationError("TCDX.VALIDATION.FAILED", "Upload exceeds declared size", 413));
        else callback(null, chunk);
      }
    });
    request.content.on("error", (error) => limiter.destroy(error));
    request.content.pipe(limiter);
    try {
      await this.client.putObject(this.config.bucket, request.quarantineObjectKey, limiter, request.sizeBytes);
      if (received !== request.sizeBytes) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Uploaded object size mismatch", 422);
      const stat = await this.client.statObject(this.config.bucket, request.quarantineObjectKey);
      if (stat.size !== request.sizeBytes) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Uploaded object size mismatch", 422);
    } catch (error) {
      try { await this.client.removeObject(this.config.bucket, request.quarantineObjectKey); } catch { /* cleanup is retried by intent expiry */ }
      if (error instanceof FoundationError) throw error;
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage upload failed", 503, true, { dependency: "object_storage" });
    }
  }

  async openDownload(request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string; sha256: string; sizeBytes: number; scanState: "passed"; classification: string }): Promise<Readable> {
    assertAuthorized(request);
    if (request.objectKey !== `objects/${request.fileObjectId}` || request.scanState !== "passed" || !/^[0-9a-f]{64}$/.test(request.sha256)) {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    try {
      const stat = await this.client.statObject(this.config.bucket, request.objectKey);
      if (stat.size !== request.sizeBytes) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Stored object size mismatch", 422);
      const object = await this.client.getObject(this.config.bucket, request.objectKey);
      const hash = createHash("sha256");
      let size = 0;
      const verify = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          size += chunk.length;
          if (size > request.sizeBytes) callback(new FoundationError("TCDX.INVARIANT.VIOLATION", "Stored object size mismatch", 422));
          else { hash.update(chunk); callback(null, chunk); }
        },
        flush(callback) {
          if (size !== request.sizeBytes || hash.digest("hex") !== request.sha256) callback(new FoundationError("TCDX.INVARIANT.VIOLATION", "Stored object checksum mismatch", 422));
          else callback();
        }
      });
      object.on("error", (error) => verify.destroy(error));
      return object.pipe(verify);
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage download failed", 503, true, { dependency: "object_storage" });
    }
  }

  async finalizeQuarantine(request: AuthorizedFileAccess & { uploadIntentId: string; fileObjectId: string; quarantineObjectKey: string; declaredMime: string; expectedSizeBytes: number }): Promise<{ objectKey: string; detectedMime: string; sizeBytes: number; sha256: string; scanState: "passed"; storageVersion: string; encryptionKeyRef: string }> {
    assertAuthorized(request);
    if (request.quarantineObjectKey !== `quarantine/${request.uploadIntentId}`) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Invalid quarantine object key", 422);
    try {
      const stat = await this.client.statObject(this.config.bucket, request.quarantineObjectKey);
      if (stat.size !== request.expectedSizeBytes || stat.size > this.config.maxUploadBytes) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Uploaded object size mismatch", 422);
      const stream = await this.client.getObject(this.config.bucket, request.quarantineObjectKey);
      const scanned = await this.scan(this.config.clamavHost, this.config.clamavPort, this.config.clamavTimeoutMs, stream);
      const mime = detectedMime(scanned.sample);
      if (request.declaredMime !== "application/octet-stream" && request.declaredMime !== mime) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Uploaded object MIME mismatch", 422);
      const objectKey = `objects/${request.fileObjectId}`;
      const copied = await this.client.copyObject(
        new CopySourceOptions({ Bucket: this.config.bucket, Object: request.quarantineObjectKey }),
        new CopyDestinationOptions({ Bucket: this.config.bucket, Object: objectKey, MetadataDirective: "COPY" })
      );
      const finalStat = await this.client.statObject(this.config.bucket, objectKey);
      const copyVersion = "VersionId" in copied ? copied.VersionId : undefined;
      const storageVersion = copyVersion ?? finalStat.versionId ?? finalStat.etag;
      if (!storageVersion) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage did not return a final version", 503, true);
      return {
        objectKey,
        detectedMime: mime,
        sizeBytes: stat.size,
        sha256: scanned.sha256,
        scanState: "passed",
        storageVersion,
        encryptionKeyRef: this.config.encryptionKeyRef
      };
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage finalization failed", 503, true, { dependency: "object_storage" });
    }
  }

  async removeQuarantine(request: AuthorizedFileAccess & { uploadIntentId: string; quarantineObjectKey: string }): Promise<void> {
    assertAuthorized(request);
    if (request.quarantineObjectKey !== `quarantine/${request.uploadIntentId}`) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Invalid quarantine object key", 422);
    try {
      await this.client.removeObject(this.config.bucket, request.quarantineObjectKey);
    } catch {
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Quarantine cleanup failed", 503, true, { dependency: "object_storage" });
    }
  }

  async removeFinalizedObject(request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string }): Promise<void> {
    assertAuthorized(request);
    if (request.objectKey !== `objects/${request.fileObjectId}`) throw new FoundationError("TCDX.INVARIANT.VIOLATION", "Invalid final object key", 422);
    try {
      await this.client.removeObject(this.config.bucket, request.objectKey);
    } catch {
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Final object compensation failed", 503, true, { dependency: "object_storage" });
    }
  }

  async createDownloadReference(request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string; sha256: string; scanState: "passed"; classification: string }): Promise<{ downloadReference: string }> {
    assertAuthorized(request);
    if (request.objectKey !== `objects/${request.fileObjectId}` || request.scanState !== "passed") {
      throw new FoundationError("TCDX.AUTHORIZATION.DENIED", "Access denied", 403);
    }
    try {
      const stat = await this.client.statObject(this.config.bucket, request.objectKey);
      if (stat.size < 0) throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Stored object is unavailable", 503, true);
      return { downloadReference: await this.client.presignedGetObject(this.config.bucket, request.objectKey, this.config.signedUrlTtlSeconds) };
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "Object storage download allocation failed", 503, true, { dependency: "object_storage" });
    }
  }
}
