import { newUuidV7 } from "../../apps/backend/src/uuid.ts";

const sampleSize = 100_000;
const seen = new Set<string>();
let previous = "";
let orderRegressions = 0;
let invalid = 0;

for (let index = 0; index < sampleSize; index += 1) {
  const value = newUuidV7();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) invalid += 1;
  if (seen.has(value)) invalid += 1;
  seen.add(value);
  if (previous && value < previous) orderRegressions += 1;
  previous = value;
}

const pass = invalid === 0 && seen.size === sampleSize && orderRegressions === 0;
process.stdout.write(`${JSON.stringify({
  uuidLibrary: "uuid@14.0.2",
  uuidVersion: 7,
  sampleSize,
  unique: seen.size,
  invalid,
  lexicalOrderRegressions: orderRegressions,
  uuidV7Runtime: pass ? "PASS" : "BLOCKED"
}, null, 2)}\n`);
if (!pass) process.exitCode = 1;
