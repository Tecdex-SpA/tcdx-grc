import { readFileSync, realpathSync, statSync } from "node:fs";
import { loadConfig } from "./config.js";

// Run only against the candidate image and protected read-only runtime mounts.
// This entry point opens no database/network connection and prints no values.
try {
  const config = loadConfig(process.env);
  if (!config.managedIdentityOidc.configured || !config.managedIdentityAdmin.configured) {
    throw new Error("Managed Identity runtime configuration is required");
  }
  const mounts = readFileSync("/proc/self/mountinfo", "utf8").trim().split("\n").map((line) => {
    const fields = line.split(" ");
    return { path: fields[4]!.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8))),
      readOnly: fields[5]!.split(",").includes("ro") };
  }).sort((a, b) => b.path.length - a.path.length);
  for (const key of ["MANAGED_IDENTITY_OIDC_CLIENT_SECRET_FILE", "MANAGED_IDENTITY_ADMIN_CLIENT_SECRET_FILE"]) {
    const path = process.env[key]!;
    if (statSync(path).uid !== process.getuid?.()) throw new Error("Secret file owner must match runtime UID");
    const resolved = realpathSync(path);
    const mount = mounts.find((entry) => resolved === entry.path || resolved.startsWith(`${entry.path === "/" ? "" : entry.path}/`));
    if (!mount?.readOnly) throw new Error("Secret mount must be read-only");
  }
  process.stdout.write("MANAGED_IDENTITY_CONFIG_PREFLIGHT=PASS\n");
} catch {
  process.stderr.write("MANAGED_IDENTITY_CONFIG_PREFLIGHT=BLOCKED\n");
  process.exitCode = 1;
}
