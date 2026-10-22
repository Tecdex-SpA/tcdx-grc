import { connect } from "node:net";
import { newUuidV7 } from "../uuid.js";

const [socketPath, operation] = process.argv.slice(2);
if (!socketPath || !["iam.provision", "iam.publish", "iam.revoke", "iam.c04w.publish", "iam.initial_source.publish", "iam.library.publish"].includes(operation ?? "") || process.argv.length !== 4) {
  process.stderr.write("USAGE: iam-publication-operator-cli SOCKET iam.provision|iam.publish|iam.revoke|iam.c04w.publish|iam.initial_source.publish|iam.library.publish\n");
  process.exitCode = 1;
} else {
  const socket = connect(socketPath);
  let body = "";
  socket.setTimeout(60_000, () => socket.destroy(new Error("OPERATOR_TIMEOUT")));
  socket.on("connect", () => socket.end(JSON.stringify({ operation, correlation_id: newUuidV7() })));
  socket.on("data", chunk => { body += chunk.toString("utf8"); });
  socket.on("end", () => {
    try {
      const result: unknown = JSON.parse(body);
      if (!result || typeof result !== "object" || "error" in result) throw new Error();
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } catch { process.stderr.write("IAM_OPERATION_DENIED_OR_FAILED\n"); process.exitCode = 1; }
  });
  socket.on("error", () => { process.stderr.write("IAM_OPERATOR_UNAVAILABLE\n"); process.exitCode = 1; });
}
