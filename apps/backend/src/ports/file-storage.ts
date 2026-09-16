import type { ScopeKind } from "@tcdx-grc/shared-types";
import { FoundationError } from "../errors.js";

export type AuthorizedFileAccess = {
  tenantId: string;
  correlationId: string;
  capabilityEnabled: true;
  permissionGranted: true;
  scope: ScopeKind;
  objectPolicyAllowed: true;
};

export type QuarantineUploadRequest = AuthorizedFileAccess & {
  fileObjectId: string;
  declaredMime: string;
  sizeBytes: number;
  classification: string;
};

export interface FileStoragePort {
  allocateQuarantineUpload(request: QuarantineUploadRequest): Promise<{ objectKey: string; uploadReference: string }>;
  finalizeQuarantine(request: AuthorizedFileAccess & {
    fileObjectId: string;
    objectKey: string;
    declaredMime: string;
    expectedSizeBytes: number;
  }): Promise<{ detectedMime: string; sizeBytes: number; sha256: string; scanState: "passed" | "failed" | "timeout" }>;
  createDownloadReference(request: AuthorizedFileAccess & {
    fileObjectId: string;
    objectKey: string;
    sha256: string;
    scanState: "passed";
    classification: string;
  }): Promise<{ downloadReference: string }>;
}

export class UnavailableFileStoragePort implements FileStoragePort {
  private unavailable(): never {
    throw new FoundationError("TCDX.DEPENDENCY.UNAVAILABLE", "File storage runtime is not configured", 503, true);
  }

  async allocateQuarantineUpload(_request: QuarantineUploadRequest): Promise<{ objectKey: string; uploadReference: string }> {
    return this.unavailable();
  }

  async finalizeQuarantine(_request: AuthorizedFileAccess & {
    fileObjectId: string;
    objectKey: string;
    declaredMime: string;
    expectedSizeBytes: number;
  }): Promise<{ detectedMime: string; sizeBytes: number; sha256: string; scanState: "passed" | "failed" | "timeout" }> {
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
}
