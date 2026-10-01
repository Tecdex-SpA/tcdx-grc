import type { ScopeKind } from "@tcdx-grc/shared-types";
import { FoundationError } from "../errors.js";
import type { Readable } from "node:stream";

export type AuthorizedFileAccess = {
  tenantId: string;
  correlationId: string;
  capabilityEnabled: true;
  permissionGranted: true;
  scope: ScopeKind;
  objectPolicyAllowed: true;
};

export type QuarantineUploadRequest = AuthorizedFileAccess & {
  uploadIntentId: string;
  declaredMime: string;
  sizeBytes: number;
  classification: string;
  expiresAt?: Date;
};

export interface FileStoragePort {
  allocateQuarantineUpload(request: QuarantineUploadRequest): Promise<{ objectKey: string; uploadReference: string; expiresAt: Date }>;
  finalizeQuarantine(request: AuthorizedFileAccess & {
    uploadIntentId: string;
    fileObjectId: string;
    quarantineObjectKey: string;
    declaredMime: string;
    expectedSizeBytes: number;
  }): Promise<{
    objectKey: string;
    detectedMime: string;
    sizeBytes: number;
    sha256: string;
    scanState: "passed" | "failed" | "timeout";
    storageVersion: string;
    encryptionKeyRef: string;
  }>;
  removeQuarantine(request: AuthorizedFileAccess & {
    uploadIntentId: string;
    quarantineObjectKey: string;
  }): Promise<void>;
  removeFinalizedObject(request: AuthorizedFileAccess & {
    fileObjectId: string;
    objectKey: string;
  }): Promise<void>;
  createDownloadReference(request: AuthorizedFileAccess & {
    fileObjectId: string;
    objectKey: string;
    sha256: string;
    scanState: "passed";
    classification: string;
  }): Promise<{ downloadReference: string }>;
  uploadQuarantineContent(request: AuthorizedFileAccess & { uploadIntentId: string; quarantineObjectKey: string; sizeBytes: number; content: Readable }): Promise<void>;
  openDownload(request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string; sha256: string; sizeBytes: number; scanState: "passed"; classification: string }): Promise<Readable>;
}

export class UnavailableFileStoragePort implements FileStoragePort {
  private unavailable(): never {
    throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "File storage runtime is not configured", 503, true);
  }

  async allocateQuarantineUpload(_request: QuarantineUploadRequest): Promise<{ objectKey: string; uploadReference: string; expiresAt: Date }> {
    return this.unavailable();
  }

  async finalizeQuarantine(_request: AuthorizedFileAccess & {
    uploadIntentId: string;
    fileObjectId: string;
    quarantineObjectKey: string;
    declaredMime: string;
    expectedSizeBytes: number;
  }): Promise<{ objectKey: string; detectedMime: string; sizeBytes: number; sha256: string; scanState: "passed" | "failed" | "timeout"; storageVersion: string; encryptionKeyRef: string }> {
    return this.unavailable();
  }

  async createDownloadReference(_request: AuthorizedFileAccess & {
    fileObjectId: string;
    objectKey: string;
    sha256: string;
    scanState: "passed";
    classification: string;
  }): Promise<{ downloadReference: string }> {
    return this.unavailable();
  }

  async uploadQuarantineContent(_request: AuthorizedFileAccess & { uploadIntentId: string; quarantineObjectKey: string; sizeBytes: number; content: Readable }): Promise<void> {
    return this.unavailable();
  }

  async openDownload(_request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string; sha256: string; sizeBytes: number; scanState: "passed"; classification: string }): Promise<Readable> {
    return this.unavailable();
  }

  async removeQuarantine(_request: AuthorizedFileAccess & { uploadIntentId: string; quarantineObjectKey: string }): Promise<void> {
    return this.unavailable();
  }

  async removeFinalizedObject(_request: AuthorizedFileAccess & { fileObjectId: string; objectKey: string }): Promise<void> {
    return this.unavailable();
  }
}
