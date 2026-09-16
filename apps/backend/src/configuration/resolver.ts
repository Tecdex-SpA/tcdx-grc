import { FoundationError } from "../errors.js";

export type ConfigurationLayer = {
  layerId: string;
  precedence: 0 | 1 | 2 | 3;
  specificity: string;
  value: unknown;
};

export type EffectiveConfiguration = { value: unknown; selectedLayerId: string; layerIds: string[] };

export function resolveConfiguration(layers: readonly ConfigurationLayer[]): EffectiveConfiguration {
  if (layers.length === 0) throw new FoundationError("TCDX.RESULT.INSUFFICIENT_DATA", "No effective configuration", 422);
  const highest = Math.max(...layers.map((layer) => layer.precedence));
  const candidates = layers.filter((layer) => layer.precedence === highest);
  const specificity = new Set(candidates.map((layer) => layer.specificity));
  if (specificity.size !== 1 || candidates.length !== 1) {
    throw new FoundationError("TCDX.CONFLICT.RESOURCE", "Configuration conflict", 409);
  }
  return { value: candidates[0]!.value, selectedLayerId: candidates[0]!.layerId, layerIds: layers.map((layer) => layer.layerId) };
}
