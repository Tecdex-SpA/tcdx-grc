import type { ProblemEnvelope } from "@tcdx-grc/contracts";
import type { AccessTokenProvider, SelectedTenant } from "./auth-boundary.js";
import { uiText } from "./i18n/es.js";

export class ApiProblem extends Error {
  constructor(readonly problem: ProblemEnvelope, readonly status: number) {
    super(problem.message);
  }
}

export class ApiClient {
  constructor(
    private readonly origin: string,
    private readonly tokens: AccessTokenProvider,
    private readonly selectedTenant: () => SelectedTenant
  ) {}

  async request<T>(path: string, init: RequestInit = {}, options: { tenantContext?: "required" | "omit" } = {}): Promise<T> {
    const token = await this.tokens.getAccessToken();
    if (!token) throw new ApiProblem({ code: "TCDX.AUTHENTICATION.REQUIRED", message: uiText.auth.title, correlation_id: crypto.randomUUID(), retryable: false }, 401);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (options.tenantContext !== "omit") {
      const tenant = this.selectedTenant();
      if (!tenant) throw new ApiProblem({ code: "TCDX.TENANT_CONTEXT.REQUIRED", message: uiText.tenant.selectDetail, correlation_id: crypto.randomUUID(), retryable: false }, 400);
      headers.set("x-tcdx-tenant-id", tenant.tenantId);
    }
    const response = await fetch(new URL(path, this.origin), { ...init, headers });
    if (!response.ok) {
      const problem = await response.json() as ProblemEnvelope;
      if (response.status === 401) await this.tokens.clearSession();
      throw new ApiProblem(problem, response.status);
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  }

  accessMe<T>(): Promise<T> { return this.request<T>("/api/v1/access/me", {}, { tenantContext: "omit" }); }

  platformGet<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, init, { tenantContext: "omit" });
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>("/auth/logout", { method: "POST" }, { tenantContext: "omit" });
    } finally {
      await this.tokens.clearSession();
    }
  }

  async post<T>(path: string, body: Record<string, unknown>, idempotencyKey = crypto.randomUUID()): Promise<T> {
    return this.request<T>(path, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(body) });
  }

  async platformPost<T>(path: string, body: Record<string, unknown>, idempotencyKey = crypto.randomUUID()): Promise<T> {
    return this.request<T>(path, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(body) }, { tenantContext: "omit" });
  }

  private async fileRequest(path: string, init: RequestInit): Promise<Response> {
    const token = await this.tokens.getAccessToken();
    if (!token) throw new ApiProblem({ code: "TCDX.AUTHENTICATION.REQUIRED", message: uiText.auth.title, correlation_id: crypto.randomUUID(), retryable: false }, 401);
    const tenant = this.selectedTenant();
    if (!tenant) throw new ApiProblem({ code: "TCDX.TENANT_CONTEXT.REQUIRED", message: uiText.tenant.selectDetail, correlation_id: crypto.randomUUID(), retryable: false }, 400);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    headers.set("x-tcdx-tenant-id", tenant.tenantId);
    const response = await fetch(new URL(path, this.origin), { ...init, headers });
    if (!response.ok) {
      const problem = await response.json() as ProblemEnvelope;
      if (response.status === 401) await this.tokens.clearSession();
      throw new ApiProblem(problem, response.status);
    }
    return response;
  }

  async uploadEvidenceFile(file: File, retentionPolicyId: string, classification: string, sourceProvenance: string): Promise<string> {
    const envelope = await this.post<{ result: { upload_intent_id: string; upload_url: string } }>("/api/v1/files:request-upload", {
      original_filename: file.name, declared_mime: file.type || "application/octet-stream", size_bytes: file.size,
      classification, retention_policy_id: retentionPolicyId, source_provenance: sourceProvenance
    });
    const { upload_intent_id: intentId, upload_url: uploadUrl } = envelope.result;
    const expectedPath = `/api/v1/file-upload-intents/${encodeURIComponent(intentId)}/content`;
    if (uploadUrl !== expectedPath) throw new Error("Unexpected upload endpoint");
    await this.fileRequest(expectedPath, { method: "PUT", headers: { "content-type": "application/octet-stream" }, body: file });
    const finalized = await this.post<{ result: { file_object_id: string } }>(`/api/v1/file-upload-intents/${encodeURIComponent(intentId)}:finalize`, { expected_version: 1 });
    return finalized.result.file_object_id;
  }

  async downloadFileObject(fileObjectId: string): Promise<{ blob: Blob; filename: string }> {
    const response = await this.fileRequest(`/api/v1/file-objects/${encodeURIComponent(fileObjectId)}/content`, { method: "GET" });
    const match = /filename\*=UTF-8''([^;]+)/i.exec(response.headers.get("content-disposition") ?? "");
    let filename = "download";
    if (match) { try { filename = decodeURIComponent(match[1]!); } catch { /* use safe fallback */ } }
    return { blob: await response.blob(), filename };
  }
}
