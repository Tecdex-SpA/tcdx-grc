import { readFile } from "node:fs/promises";
import { connect } from "node:net";
import { stdin, stdout, argv } from "node:process";
import { newUuidV7 } from "../uuid.js";

async function readToken(): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || !stdin.setRawMode) throw new Error("INTERACTIVE_TERMINAL_REQUIRED");
  stdout.write("Application token for the current Platform Admin session: ");
  let token = "";
  stdin.setRawMode(true);
  stdin.resume();
  try {
    return await new Promise<string>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        for (const char of chunk.toString("utf8")) {
          if (char === "\r" || char === "\n") {
            stdin.off("data", onData);
            stdout.write("\n");
            resolve(token);
            return;
          }
          if (char === "\u0003") {
            stdin.off("data", onData);
            reject(new Error("CANCELLED"));
            return;
          }
          if (char === "\u007f") token = token.slice(0, -1);
          else if (char >= " " && token.length < 16_384) token += char;
        }
      };
      stdin.on("data", onData);
    });
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
  }
}

async function main(): Promise<void> {
  const [socketPath, manifestPath, decisionPath, receiptPath, idempotencyKey] = argv.slice(2);
  if (!socketPath || !manifestPath || !decisionPath || !receiptPath || !idempotencyKey || argv.length !== 7)
    throw new Error("USAGE: operator-cli SOCKET MANIFEST DECISION RECEIPT IDEMPOTENCY_KEY");
  const [manifest, decision, receipt] = await Promise.all([
    readFile(manifestPath), readFile(decisionPath), readFile(receiptPath)
  ]);
  const bearerToken = await readToken();
  const request = JSON.stringify({
    bearer_token: bearerToken,
    manifest_base64: manifest.toString("base64"),
    decision_record_base64: decision.toString("base64"),
    approval_receipt_base64: receipt.toString("base64"),
    idempotency_key: idempotencyKey,
    correlation_id: newUuidV7()
  });
  const response = await new Promise<string>((resolve, reject) => {
    const socket = connect(socketPath);
    let body = "";
    socket.setTimeout(300_000, () => socket.destroy(new Error("OPERATOR_TIMEOUT")));
    socket.on("connect", () => socket.end(request));
    socket.on("data", chunk => { body += chunk.toString("utf8"); });
    socket.on("end", () => resolve(body));
    socket.on("error", reject);
  });
  const result: unknown = JSON.parse(response);
  if (!result || typeof result !== "object" || "error" in result) throw new Error("COMMERCIAL_PUBLICATION_DENIED_OR_FAILED");
  stdout.write(`${JSON.stringify(result)}\n`);
}

void main().catch(error => {
  // No token, artifact bytes, connection string or SQL detail reaches stdout/stderr.
  process.stderr.write(`${error instanceof Error ? error.message : "OPERATOR_FAILED"}\n`);
  process.exitCode = 1;
});
