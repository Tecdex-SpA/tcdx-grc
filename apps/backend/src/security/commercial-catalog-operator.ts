import { connect, createServer, type Server } from "node:net";
import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, unlink } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import type { Kysely } from "kysely";
import type { FoundationDatabase } from "../database.js";
import type { IdentityVerifier } from "./authentication.js";
import { resolvePlatformActor } from "./platform-authority.js";
import { commercialCatalogPublication } from "./commercial-catalog-publication.js";

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
type OperatorRequest = {
  bearer_token: string;
  manifest_base64: string;
  decision_record_base64: string;
  approval_receipt_base64: string;
  idempotency_key: string;
  correlation_id: string;
};

function request(value: unknown): OperatorRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_REQUEST");
  const record = value as Record<string, unknown>;
  const names = ["bearer_token", "manifest_base64", "decision_record_base64", "approval_receipt_base64", "idempotency_key", "correlation_id"];
  if (Object.keys(record).sort().join("\0") !== [...names].sort().join("\0")
    || names.some(name => typeof record[name] !== "string" || !(record[name] as string).length)) throw new Error("INVALID_REQUEST");
  for (const name of ["manifest_base64", "decision_record_base64", "approval_receipt_base64"])
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(record[name] as string))
      throw new Error("INVALID_REQUEST");
  return record as OperatorRequest;
}

/** Local process channel only. It is never registered as an HTTP route or exposed by the proxy. */
export async function startCommercialCatalogOperator(input: {
  socketPath: string;
  approvedManifestSha256: string;
  database: Kysely<FoundationDatabase>;
  identityVerifier: IdentityVerifier;
  iamOperation?: (operation: "iam.provision" | "iam.publish" | "iam.revoke" | "iam.c04w.publish" | "iam.initial_source.publish" | "iam.library.publish" | "iam.runtime_bindings.publish", correlationId: string) => Promise<unknown>;
}): Promise<() => Promise<void>> {
  if (!isAbsolute(input.socketPath) || input.socketPath.length > 100) throw new Error("INVALID_OPERATOR_SOCKET_PATH");
  if (!/^[0-9a-f]{64}$/.test(input.approvedManifestSha256)) throw new Error("INVALID_APPROVED_MANIFEST_HASH");
  const directory = dirname(input.socketPath);
  await mkdir(directory, { mode: 0o700, recursive: true });
  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== process.getuid?.()
    || (directoryStat.mode & 0o077) !== 0) throw new Error("INSECURE_OPERATOR_SOCKET_DIRECTORY");
  const existing = await lstat(input.socketPath).catch(error => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
  if (existing) {
    if (!existing.isSocket() || existing.uid !== process.getuid?.()) throw new Error("OPERATOR_SOCKET_ALREADY_EXISTS");
    const probe = await new Promise<string>(resolve => {
      const socket = connect(input.socketPath);
      socket.once("connect", () => { socket.destroy(); resolve("active"); });
      socket.once("error", error => resolve((error as NodeJS.ErrnoException).code ?? "error"));
    });
    if (probe !== "ECONNREFUSED") throw new Error("OPERATOR_SOCKET_ALREADY_EXISTS");
    await unlink(input.socketPath);
  }

  const server: Server = createServer({ allowHalfOpen: true }, socket => {
    let data = "";
    socket.setTimeout(30_000, () => socket.destroy());
    socket.on("data", chunk => {
      data += chunk.toString("utf8");
      if (Buffer.byteLength(data) > MAX_REQUEST_BYTES) socket.destroy();
    });
    socket.on("end", () => {
      socket.setTimeout(0);
      void (async () => {
        try {
          const decoded: unknown = JSON.parse(data);
          if (decoded && typeof decoded === "object" && !Array.isArray(decoded) && "operation" in decoded) {
            const command = decoded as Record<string, unknown>;
            if (!input.iamOperation || Object.keys(command).sort().join(",") !== "correlation_id,operation"
              || !["iam.provision", "iam.publish", "iam.revoke", "iam.c04w.publish", "iam.initial_source.publish", "iam.library.publish", "iam.runtime_bindings.publish"].includes(String(command.operation)) || typeof command.correlation_id !== "string")
              throw new Error("INVALID_IAM_OPERATION");
            socket.end(JSON.stringify(await input.iamOperation(command.operation as "iam.provision" | "iam.publish" | "iam.revoke" | "iam.c04w.publish" | "iam.initial_source.publish" | "iam.library.publish" | "iam.runtime_bindings.publish", command.correlation_id)));
            return;
          }
          const command = request(decoded);
          const manifestBytes = Buffer.from(command.manifest_base64, "base64");
          if (createHash("sha256").update(manifestBytes).digest("hex") !== input.approvedManifestSha256)
            throw new Error("UNAPPROVED_MANIFEST");
          const identity = await input.identityVerifier.verifyBearerToken(command.bearer_token);
          const actor = await resolvePlatformActor(input.database, identity);
          const result = await input.database.transaction().setIsolationLevel("read committed").execute(tx =>
            commercialCatalogPublication(tx, actor, {
              manifestBytes,
              decisionRecordBytes: Buffer.from(command.decision_record_base64, "base64"),
              approvalReceiptBytes: Buffer.from(command.approval_receipt_base64, "base64"),
              idempotencyKey: command.idempotency_key,
              correlationId: command.correlation_id
            }));
          socket.end(JSON.stringify(result));
        } catch {
          // Never reflect identity, token, artifact bytes or database details to the operator channel.
          socket.end(JSON.stringify({ error: "COMMERCIAL_PUBLICATION_DENIED_OR_FAILED" }));
        }
      })();
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(input.socketPath, resolve);
    });
    await chmod(input.socketPath, 0o600);
  } catch (error) {
    server.close();
    throw error;
  }
  const socketStat = await lstat(input.socketPath);
  return async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    const current = await lstat(input.socketPath).catch(() => undefined);
    if (current?.ino === socketStat.ino && current.dev === socketStat.dev) await unlink(input.socketPath);
  };
}
