import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { loadC04wLifecyclePublication } from "./c04w-lifecycle-publication.js";
import { IamPublicationService } from "./iam-publication.js";
const manifestPath = "docs/executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10/PUBLICATION_MANIFEST.json";
const approved = "e7f30ded29f213fa33a8648466b5c7bbfcc6bb520e6cdf2b11968a41d9f6e944";
const receipts = ["docs/physical-data-model/amendments/STEP_6A3_C04W_v1.10/CONTRACT_PUBLICATION_RECEIPT.json",
  "docs/executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10/CONTRACT_PUBLICATION_RECEIPT.json"];
async function publishedFixture() {
  const root = await mkdtemp(resolve(tmpdir(), "c04w-publication-test-"));
  const m = JSON.parse(await readFile(manifestPath, "utf8"));
  const paths: string[] = [manifestPath, ...m.files.flatMap((f: { source: string; successor_path: string }) => [f.source, f.successor_path]),
    ...m.human_decisions.map((f: { path: string }) => f.path), ...m.dependencies.map((f: { path: string }) => f.path), ...receipts];
  for (const path of paths) { await mkdir(dirname(resolve(root, path)), { recursive: true }); await copyFile(path, resolve(root, path)); }
  // The unchanged C04W publication pins its historical 34-migration index.
  // Derive that exact prefix and verify its approved hash, rather than asking
  // the historical loader to accept the current successor's different bytes.
  const path = "database/migrations/manifest.json";
  const current = JSON.parse(await readFile(path, "utf8"));
  const predecessor = JSON.stringify({ ...current, migrations: current.migrations.slice(0, 34) }, null, 2) + "\n";
  expect(createHash("sha256").update(predecessor).digest("hex")).toBe(m.dependencies.find((f: { path: string }) => f.path === path).sha256);
  await writeFile(resolve(root, path), predecessor);
  return { root, m };
}
describe("C04W exact approved successor publication", () => {
  it("loads all ten approved successors, both human acts, five tenant edges and the full ledger", async () => {
    const { root } = await publishedFixture();
    try {
      const c = await loadC04wLifecyclePublication(root, approved);
      expect(c.bindings).toHaveLength(5); expect(c.migrations).toHaveLength(34);
      expect(c.bindings.filter(b => b.entity_type === "RetentionPolicyApplicability" && b.from_state === "draft").map(b => b.permission_code))
        .toEqual(["privacy.retention_policy.update", "privacy.retention_policy.review"]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("denies a mismatched pinned manifest and an operation with no effective configuration before authentication", async () => {
    await expect(loadC04wLifecyclePublication(process.cwd(), "0".repeat(64))).rejects.toMatchObject({ statusCode: 403 });
    const service = new IamPublicationService({} as never, {} as never, {} as never, async () => { throw Error("MUST_NOT_AUTHENTICATE"); });
    await expect(service.publishC04w("unconfigured")).rejects.toMatchObject({ statusCode: 403 });
  });
  it("denies modified successor bytes, missing approval and ineffective receipt", async () => {
    const { root, m } = await publishedFixture();
    try {
      expect((await loadC04wLifecyclePublication(root, approved)).bindings).toHaveLength(5);
      const target = m.files[0].successor_path;
      await writeFile(resolve(root, target), "tampered");
      await expect(loadC04wLifecyclePublication(root, approved)).rejects.toMatchObject({ statusCode: 403 });
      await copyFile(target, resolve(root, target));
      const original = await readFile(resolve(root, receipts[0]!), "utf8");
      await writeFile(resolve(root, receipts[0]!), original.replace("PASS_CONTRACT_EFFECTIVE", "STAGED_NOT_EFFECTIVE"));
      await expect(loadC04wLifecyclePublication(root, approved)).rejects.toMatchObject({ statusCode: 403 });
      await writeFile(resolve(root, receipts[0]!), original);
      await writeFile(resolve(root, m.human_decisions[1].path), "{}");
      await expect(loadC04wLifecyclePublication(root, approved)).rejects.toMatchObject({ statusCode: 403 });
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
