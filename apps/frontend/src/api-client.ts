import type { ProblemEnvelope } from "@tcdx-grc/contracts";
import type { AccessTokenProvider, SelectedTenant } from "./auth-boundary.js";
import { uiText } from "./i18n/es.js";
import type { AuthenticationProviderAvailability, CurrentPrincipalAuthorization } from "@tcdx-grc/contracts";

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

  currentTenantId(): string | null { return this.selectedTenant()?.tenantId ?? null; }

  async request<T>(path: string, init: RequestInit = {}, options: { tenantContext?: "required" | "omit" } = {}): Promise<T> {
    return (await this.requestRepresentation<T>(path, init, options)).body;
  }

  private async requestRepresentation<T>(path: string, init: RequestInit = {}, options: { tenantContext?: "required" | "omit" } = {}): Promise<{ body: T; headers: Headers; status: number }> {
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
    if(response.status === 204) return { body: undefined as T, headers: response.headers, status: response.status };
    if(/^\/api\/v1\/(framework-version-references|membership-references|retention-policy-references)(?:\?|$)/.test(path)) {
      const parse=JSON.parse as (text:string,reviver:(key:string,value:unknown,context?:{source?:string})=>unknown)=>unknown;
      const body = parse(await response.text(),(key,value,context)=> {
        if(["version_number","retention_seconds"].includes(key) && typeof value==="number" && !Number.isSafeInteger(value)) {
          if(!context?.source || !/^[0-9]+$/.test(context.source)) throw new Error("LOSSLESS_INTEGER_UNAVAILABLE");
          return BigInt(context.source);
        }
        return value;
      }) as T;
      return { body, headers: response.headers, status: response.status };
    }
    return { body: await response.json() as T, headers: response.headers, status: response.status };
  }

  accessMe<T>(): Promise<T> { return this.request<T>("/api/v1/access/me", {}, { tenantContext: "omit" }); }

  /** Preserves the existing auth/tenant transport; callers use exact server concurrency metadata. */
  async requestVersioned<T>(path:string,init:RequestInit={},options:{tenantContext?:"required"|"omit"}={}):Promise<{body:T;etag:string|null}>{
    const representation=await this.requestRepresentation<T>(path,init,options);
    return {body:representation.body,etag:representation.headers.get("etag")};
  }

  async authenticationProviders(signal?: AbortSignal): Promise<AuthenticationProviderAvailability> {
    const response = await fetch(new URL("/api/v1/auth/providers", this.origin), {
      headers: { accept: "application/json" }, cache: "no-store", ...(signal ? { signal } : {})
    });
    if (!response.ok) throw new Error("PROVIDER_PROJECTION_UNAVAILABLE");
    return await response.json() as AuthenticationProviderAvailability;
  }

  currentAuthorization(tenantId: string | null, signal?: AbortSignal): Promise<CurrentPrincipalAuthorization> {
    return this.request<CurrentPrincipalAuthorization>("/api/v2/auth/me/authorization", {
      headers: tenantId ? { "X-TCDX-Tenant-Id": tenantId } : {}, cache: "no-store", ...(signal ? { signal } : {})
    }, { tenantContext: "omit" });
  }

  platformGet<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, init, { tenantContext: "omit" });
  }

  platformRepresentation<T>(path: string, init: RequestInit = {}): Promise<{ body: T; headers: Headers; status: number }> {
    return this.requestRepresentation<T>(path, init, { tenantContext: "omit" });
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>("/auth/logout", { method: "POST" }, { tenantContext: "omit" });
    } finally {
      await this.tokens.clearSession();
    }
  }

  async post<T>(path: string, body: Record<string, unknown>, idempotencyKey: string = crypto.randomUUID()): Promise<T> {
    return this.request<T>(path, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(body) });
  }

  async platformPost<T>(path: string, body: Record<string, unknown>, idempotencyKey: string = crypto.randomUUID(), ifMatch?: string): Promise<T> {
    return this.request<T>(path, { method: "POST", headers: { "Idempotency-Key": idempotencyKey, ...(ifMatch ? { "If-Match": ifMatch } : {}) }, body: JSON.stringify(body) }, { tenantContext: "omit" });
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

  async uploadEvidenceFile(file: File, retentionPolicyId: string, applicabilityId: string, classification: string, sourceProvenance: string, context: {scope_subject_id?:string;processing_activity_id?:string} = {}): Promise<string> {
    const envelope = await this.post<{ result: { upload_intent_id: string; upload_url: string } }>("/api/v1/files:request-upload", {
      original_filename: file.name, declared_mime: file.type || "application/octet-stream", size_bytes: file.size,
      ...context, classification, retention_policy_id: retentionPolicyId,
      retention_policy_applicability_id: applicabilityId, source_provenance: sourceProvenance
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
