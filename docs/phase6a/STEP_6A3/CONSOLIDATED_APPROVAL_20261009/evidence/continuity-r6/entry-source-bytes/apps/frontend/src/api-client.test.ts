import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiProblem } from "./api-client.js";

const tokens = {
  getAccessToken: vi.fn(async () => "tcdx-token"),
  clearSession: vi.fn(async () => undefined)
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  tokens.getAccessToken.mockClear();
  tokens.clearSession.mockClear();
});

describe("frontend backend-authoritative session boundary", () => {
  it("uses only GRC HTTPS endpoints for file upload and download", async () => {
    const tenantId = "01900000-0000-7000-8000-000000000001";
    const intentId = "01900000-0000-7000-8000-000000000002";
    const fileId = "01900000-0000-7000-8000-000000000003";
    const visited: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      visited.push(url);
      expect(url).toMatch(/^https:\/\/grc\.tecdex\.net\/api\/v1\//);
      expect(new Headers(init?.headers).get("x-tcdx-tenant-id")).toBe(tenantId);
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer tcdx-token");
      if (url.endsWith("/files:request-upload")) return new Response(JSON.stringify({ result: { upload_intent_id: intentId, upload_url: `/api/v1/file-upload-intents/${intentId}/content` } }), { status: 202 });
      if (url.endsWith("/content") && init?.method === "PUT") {
        expect(new Headers(init.headers).get("content-type")).toBe("application/octet-stream");
        expect(init.body).toBeInstanceOf(File);
        return new Response(null, { status: 204 });
      }
      if (url.endsWith(":finalize")) return new Response(JSON.stringify({ result: { file_object_id: fileId } }), { status: 202 });
      return new Response("%PDF-test", { status: 200, headers: { "content-disposition": "attachment; filename=\"download\"; filename*=UTF-8''safe.pdf" } });
    }));
    const api = new ApiClient("https://grc.tecdex.net", tokens, () => ({ tenantId }));
    const file = new File(["%PDF-test"], "safe.pdf", { type: "application/pdf" });
    await expect(api.uploadEvidenceFile(file, "01900000-0000-7000-8000-000000000004", "confidential", "test provenance")).resolves.toBe(fileId);
    await expect(api.downloadFileObject(fileId)).resolves.toMatchObject({ filename: "safe.pdf" });
    expect(visited).toHaveLength(4);
    expect(visited.join(" ")).not.toContain("minio");
  });
  it("omits tenant context from /access/me discovery", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).has("x-tcdx-tenant-id")).toBe(false);
      return new Response(JSON.stringify({ available_tenant_contexts: [], effective_platform_role_codes: [] }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetcher);
    const api = new ApiClient("https://api.example", tokens, () => ({ tenantId: "01900000-0000-7000-8000-000000000001" }));
    await expect(api.accessMe()).resolves.toEqual({ available_tenant_contexts: [], effective_platform_role_codes: [] });
  });

  it("propagates the selected tenant only on tenant requests", async () => {
    const tenantId = "01900000-0000-7000-8000-000000000001";
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer tcdx-token");
      expect(headers.get("x-tcdx-tenant-id")).toBe(tenantId);
      return new Response(JSON.stringify({ items: [], page: { has_more: false, next_cursor: null } }), { status: 200 });
    }));
    const api = new ApiClient("https://api.example", tokens, () => ({ tenantId }));
    await api.request("/api/v1/actions");
  });

  it("fails before the network when no tenant context is selected", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const api = new ApiClient("https://api.example", tokens, () => null);
    await expect(api.request("/api/v1/actions")).rejects.toBeInstanceOf(ApiProblem);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("omits tenant context from Platform mutation requests", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer tcdx-token");
      expect(headers.has("x-tcdx-tenant-id")).toBe(false);
      return new Response(JSON.stringify({ result: {} }), { status: 202, headers: { "content-type": "application/json" } });
    }));
    const api = new ApiClient("https://api.example", tokens, () => ({ tenantId: "01900000-0000-7000-8000-000000000001" }));
    await api.platformPost("/api/v1/platform/membership-invitations", { tenant_id: "01900000-0000-7000-8000-000000000001" });
  });
});
