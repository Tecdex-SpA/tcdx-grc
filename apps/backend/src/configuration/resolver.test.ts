import { describe, expect, it } from "vitest";
import { resolveConfiguration } from "./resolver.js";

describe("configuration resolution", () => {
  it("selects the single highest precedence layer and retains lineage", () => {
    const result = resolveConfiguration([
      { layerId: "platform", precedence: 0, specificity: "definition", value: "base" },
      { layerId: "tenant", precedence: 2, specificity: "tenant", value: "tenant-value" }
    ]);
    expect(result).toEqual({ value: "tenant-value", selectedLayerId: "tenant", layerIds: ["platform", "tenant"] });
  });

  it("fails on equal-precedence ambiguity and missing data", () => {
    expect(() => resolveConfiguration([])).toThrow("No effective configuration");
    expect(() => resolveConfiguration([
      { layerId: "a", precedence: 2, specificity: "tenant", value: 1 },
      { layerId: "b", precedence: 2, specificity: "tenant", value: 2 }
    ])).toThrow("Configuration conflict");
  });
});
