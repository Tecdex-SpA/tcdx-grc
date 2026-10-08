import { mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { catalogConfidence, catalogEffectiveFrom, catalogHeaderDirection, loadCatalogV11 } from "./catalog-v1.1.js";

const directory = resolve("data/regulatory/catalogs/tcdx-unified-compliance-control-catalog/v1.1");

describe("Catalog v1.1 immutable source and human-authorized normalization", () => {
  it("verifies all 49 frozen hashes and source counts without importing quarantine", () => {
    const catalog = loadCatalogV11(directory);
    expect(catalog.manifest.files).toHaveLength(49);
    expect(catalog.rows.quarantined_relations).toHaveLength(1213);
    expect(catalog.rows.normative_units).toHaveLength(260);
    expect(catalog.rows.requirements).toHaveLength(118);
    expect(catalog.rows.regulatory_reference_controls).toHaveLength(131);
    expect(catalog.rows.tcdx_baseline_controls).toHaveLength(81);
  });

  it("fails closed if a catalog source file no longer matches its manifest hash", () => {
    const temporary = mkdtempSync(join(tmpdir(), "tcdx-catalog-hash-"));
    const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8")) as { files: Array<{ file: string }> };
    writeFileSync(join(temporary, "manifest.json"), readFileSync(join(directory, "manifest.json")));
    for (const entry of manifest.files) symlinkSync(join(directory, entry.file), join(temporary, entry.file));
    const changed = manifest.files.find((entry) => entry.file === "requirements.json");
    expect(changed).toBeDefined();
    const target = join(temporary, changed!.file);
    const bytes = readFileSync(target);
    // Replacing a symlink leaves the frozen source untouched.
    unlinkSync(target);
    writeFileSync(target, Buffer.concat([bytes, Buffer.from(" ")]));
    expect(() => loadCatalogV11(temporary)).toThrow(/Catalog hash drift/);
    rmSync(temporary, { recursive: true });
  });

  it("rejects a quarantined relation even when a copied test package has valid hashes", () => {
    const temporary = mkdtempSync(join(tmpdir(), "tcdx-catalog-quarantine-"));
    const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8")) as { files: Array<{ file: string; sha256: string; bytes: number }> };
    for (const entry of manifest.files) symlinkSync(join(directory, entry.file), join(temporary, entry.file));
    const file = "requirement_control_mappings.json";
    const target = join(temporary, file);
    const mappings = JSON.parse(readFileSync(target, "utf8")) as Array<Record<string, string>>;
    const quarantine = JSON.parse(readFileSync(join(directory, "quarantined_relations.json"), "utf8")) as Array<{ record_id: string }>;
    mappings[0]!.mapping_code = quarantine[0]!.record_id;
    unlinkSync(target);
    const bytes = Buffer.from(JSON.stringify(mappings));
    writeFileSync(target, bytes);
    const entry = manifest.files.find((item) => item.file === file)!;
    entry.bytes = bytes.length;
    entry.sha256 = createHash("sha256").update(bytes).digest("hex");
    writeFileSync(join(temporary, "manifest.json"), JSON.stringify(manifest));
    expect(() => loadCatalogV11(temporary)).toThrow(/Quarantined relation/);
    rmSync(temporary, { recursive: true });
  });

  it("uses only the official ISO 42001 civil date resolution for the partial source value", () => {
    expect(catalogEffectiveFrom("ISO_IEC_42001_2023", "2023-12")).toBe("2023-12-18T00:00:00Z");
    expect(() => catalogEffectiveFrom("ISO_IEC_27001_2022", "2023-12")).toThrow(/Unapproved partial/);
    expect(() => catalogEffectiveFrom("ISO_IEC_42001_2023", "2023-11")).toThrow(/Unapproved partial/);
    expect(() => catalogEffectiveFrom("ISO_IEC_42001_2023", "2023-12", "to")).toThrow(/Unapproved partial/);
    expect(() => catalogEffectiveFrom("ISO_IEC_42001_2023", "2023")).toThrow(/Unapproved partial/);
    expect(catalogEffectiveFrom("ISO_IEC_42001_2023", "2023-12-18")).toBe("2023-12-18T00:00:00.000Z");
    const catalog = loadCatalogV11(directory);
    const matches = (name: string) => catalog.rows[name]!.filter((row) => row.framework_code === "ISO_IEC_42001_2023" && row.effective_from === "2023-12").length;
    expect(matches("normative_units")).toBe(55);
    expect(matches("requirements")).toBe(7);
    const isoCodes = new Set(catalog.rows.regulatory_reference_controls!.filter((row) => row.source_framework_code === "ISO_IEC_42001_2023").map((row) => row.control_code));
    expect(catalog.rows.regulatory_reference_control_versions!.filter((row) => isoCodes.has(row.control_code) && row.effective_from === "2023-12")).toHaveLength(38);
  });

  it("normalizes header direction and confidence only by approved closed vocabularies", () => {
    expect(catalogHeaderDirection("directed")).toBe("source_to_target");
    expect(catalogHeaderDirection("bidirectional")).toBe("bidirectional");
    expect(() => catalogHeaderDirection("reverse")).toThrow(/Unapproved/);
    expect(catalogConfidence("medium")).toBe("0.750000");
    expect(catalogConfidence("high")).toBe("0.900000");
    expect(() => catalogConfidence("low")).toThrow(/Unapproved/);
  });
});
