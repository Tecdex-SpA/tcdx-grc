import openApi from "../../../docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml?raw";
import lifecycleSource from "../../../docs/executable-contracts/09_SEED_MANIFESTS.md?raw";
import adapterSource from "../../../apps/frontend/src/reference-read.ts?raw";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { FORM_VOCABULARIES, PUBLISHED_LIFECYCLE_STATES } from "./phase6a-vocabularies.js";
const api = parse(openApi);
describe("Phase6A closed read/vocabulary authority", () => {
  it("maps each adapter to an existing GET and exact published permission", () => {
    const definitions = [...adapterSource.matchAll(/operation: "([^"]+)", path: "([^"]+)", id: "[^"]+", permission: "([^"]+)"/g)].map(match => ({ operation: match[1]!, path: match[2]!, permission: match[3]! }));
    expect(definitions).toHaveLength(17);
    for (const definition of definitions) {
      const op = api.paths[definition.path]?.get;
      expect(op?.operationId).toBe(definition.operation); expect(op["x-tcdx-permission"].replaceAll("`", "")).toBe(definition.permission);
    }
  });
  it("derives every exported vocabulary from its exact request schema", () => {
    for (const [key, values] of Object.entries(FORM_VOCABULARIES)) {
      const [name, field] = key.split("."); const property = api.components.schemas[name!].properties[field!];
      const schema = property.$ref ? api.components.schemas[property.$ref.split("/").at(-1)] : property;
      expect(values).toEqual(schema.enum); expect(name).not.toMatch(/Risk|Incident|Membership/);
    }
  });
  it("uses only published lifecycle registry edges for each supported entity", () => {
    for (const [entity, states] of Object.entries(PUBLISHED_LIFECYCLE_STATES)) {
      const expected = new Set(lifecycleSource.split("\n").filter(line => line.startsWith(`| \`${entity}\` |`)).flatMap(line => line.split("|").slice(2, 4).map(cell => cell.trim().replaceAll("`", ""))));
      expect(new Set(states)).toEqual(expected); expect(states.length).toBeGreaterThan(0);
    }
  });

});
