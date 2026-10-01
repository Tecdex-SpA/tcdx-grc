import { PostgresQueryCompiler } from "kysely";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import type { FileStoragePort } from "../ports/file-storage.js";

const tenantId = "018f47f2-6170-7bd0-9d43-12f644a2b111";
const foreignTenantId = "018f47f2-6170-7bd0-9d43-12f644a2b112";
const membershipId = "018f47f2-6170-7bd0-9d43-12f644a2b113";
const principalId = "018f47f2-6170-7bd0-9d43-12f644a2b114";
const intentId = "018f47f2-6170-7bd0-9d43-12f644a2b115";
const fileId = "018f47f2-6170-7bd0-9d43-12f644a2b116";

function database(options: { missingFile?: boolean } = {}) {
  const compiler = new PostgresQueryCompiler();
  const executeQuery = async (query: { sql: string; parameters: readonly unknown[] }) => {
    const statement = query.sql;
    if (statement.includes("FROM iam.tenant_memberships") && statement.includes("membership_state='active'")) {
      return { rows: query.parameters[0] === tenantId ? [{ tenant_membership_id: membershipId }] : [] };
    }
    if (statement.includes("FROM iam.membership_roles mr")) return { rows: [
      { permission_code: "evidence.document.update", scope_kind: "tenant", role_code: "EVIDENCE_OWNER" },
      { permission_code: "evidence.evidence.read", scope_kind: "tenant", role_code: "EVIDENCE_OWNER" }
    ] };
    if (statement.includes("FROM platform.subscriptions s")) return { rows: [{ capability_group: "EVIDENCE_DOCUMENTS" }] };
    if (statement.includes("FROM evidence.file_upload_intents t")) return { rows: [{
      file_upload_intent_id: intentId, row_version: 1, lifecycle_state: "pending_upload", expected_size_bytes: "12",
      expires_at: new Date(Date.now() + 300_000).toISOString(), quarantine_object_key: `quarantine/${intentId}`,
      __tenant_id: tenantId, created_at: new Date(), created_by_user_identity_id: principalId
    }] };
    if (statement.includes("FROM evidence.file_objects t")) return { rows: options.missingFile ? [] : [{
      file_object_id: fileId, scan_status: "passed", __tenant_id: tenantId,
      created_at: new Date(), created_by_user_identity_id: principalId
    }] };
    if (statement.includes("FROM evidence.file_objects WHERE")) return { rows: options.missingFile ? [] : [{
      object_key: `objects/${fileId}`, original_filename: "../unsafe.pdf", detected_mime: "application/pdf",
      size_bytes: "12", sha256: "a".repeat(64), scan_status: "passed", classification: "confidential"
    }] };
    throw new Error(`Unexpected SQL: ${statement}`);
  };
  const queryExecutor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: Parameters<PostgresQueryCompiler["compileQuery"]>[0], queryId: Parameters<PostgresQueryCompiler["compileQuery"]>[1]) => compiler.compileQuery(node, queryId),
    executeQuery
  };
  const fake = { executeQuery, getExecutor: () => queryExecutor, transaction: () => ({ execute: async (fn: (tx: unknown) => Promise<unknown>) => fn(fake) }) };
  return fake as never;
}

function app(options: { missingFile?: boolean } = {}) {
  const uploadQuarantineContent = vi.fn(async (request: { content: Readable }) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request.content) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe("%PDF-test-12");
  });
  const openDownload = vi.fn(async () => Readable.from([Buffer.from("%PDF-test-12")]));
  const storage = { uploadQuarantineContent, openDownload } as unknown as FileStoragePort;
  const server = buildApp(async () => true, {
    database: database(options),
    identityVerifier: { verifyBearerToken: async () => ({ principalId, principalClass: "HUMAN_INTERACTIVE" }) } as never,
    fileStorage: storage
  });
  return { server, uploadQuarantineContent, openDownload };
}

const headers = { authorization: "Bearer local-test-token", "x-tcdx-tenant-id": tenantId };

describe("private browser file transport", () => {
  it("stages exact authorized bytes and streams a sanitized authorized download", async () => {
    const { server, uploadQuarantineContent, openDownload } = app();
    try {
      const uploaded = await server.inject({ method: "PUT", url: `/api/v1/file-upload-intents/${intentId}/content`,
        headers: { ...headers, "content-type": "application/octet-stream" }, payload: Buffer.from("%PDF-test-12") });
      expect(uploaded.statusCode).toBe(204);
      expect(uploadQuarantineContent).toHaveBeenCalledTimes(1);
      const downloaded = await server.inject({ method: "GET", url: `/api/v1/file-objects/${fileId}/content`, headers });
      expect(downloaded.statusCode).toBe(200);
      expect(downloaded.body).toBe("%PDF-test-12");
      expect(downloaded.headers["content-disposition"]).toContain("unsafe.pdf");
      expect(downloaded.headers["content-disposition"]).not.toContain("../");
      expect(downloaded.body).not.toContain("minio");
      expect(openDownload).toHaveBeenCalledTimes(1);
    } finally { await server.close(); }
  });

  it("fails closed for missing authentication, foreign tenant, size, MIME and missing object", async () => {
    const { server, uploadQuarantineContent } = app({ missingFile: true });
    const url = `/api/v1/file-upload-intents/${intentId}/content`;
    try {
      expect((await server.inject({ method: "PUT", url, headers: { "content-type": "application/octet-stream" }, payload: Buffer.from("%PDF-test-12") })).statusCode).toBe(401);
      expect((await server.inject({ method: "PUT", url, headers: { ...headers, "x-tcdx-tenant-id": foreignTenantId, "content-type": "application/octet-stream" }, payload: Buffer.from("%PDF-test-12") })).statusCode).toBe(404);
      expect((await server.inject({ method: "PUT", url, headers: { ...headers, "content-type": "application/octet-stream" }, payload: Buffer.from("too short") })).statusCode).toBe(413);
      expect((await server.inject({ method: "PUT", url, headers: { ...headers, "content-type": "text/plain" }, payload: "wrong MIME" })).statusCode).toBe(415);
      expect((await server.inject({ method: "GET", url: `/api/v1/file-objects/${fileId}/content`, headers })).statusCode).toBe(404);
      expect(uploadQuarantineContent).not.toHaveBeenCalled();
    } finally { await server.close(); }
  });
});
