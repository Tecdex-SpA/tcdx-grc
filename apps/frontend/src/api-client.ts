import type { ProblemEnvelope } from "@tcdx-grc/contracts";
import type { AccessTokenProvider, SelectedTenant } from "./auth-boundary.js";

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

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.tokens.getAccessToken();
    if (!token) throw new ApiProblem({ code: "TCDX.AUTHENTICATION.REQUIRED", message: "Authentication required", correlation_id: crypto.randomUUID(), retryable: false }, 401);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    const tenant = this.selectedTenant();
    if (tenant) headers.set("x-tcdx-tenant-id", tenant.tenantId);
    const response = await fetch(new URL(path, this.origin), { ...init, headers });
    if (!response.ok) {
      const problem = await response.json() as ProblemEnvelope;
      if (response.status === 401) await this.tokens.clearSession();
      throw new ApiProblem(problem, response.status);
    }
    return await response.json() as T;
  }

  async post<T>(path: string, body: Record<string, unknown>, idempotencyKey = crypto.randomUUID()): Promise<T> {
    return this.request<T>(path, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(body) });
  }
}
