import { Ajv, type AnySchemaObject } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { isIanaTimezone } from "../iana-timezone.js";

// Test infrastructure only. Published schemas remain byte-for-byte intact.
export function contractSchemaValidator(schemas: Record<string, AnySchemaObject>) {
  const compilers = {
    draft7: new Ajv({ strict: false, allErrors: true }),
    draft2020: new Ajv2020({ strict: false, allErrors: true })
  };
  for (const compiler of Object.values(compilers)) {
    (addFormats as unknown as (instance: Ajv | Ajv2020) => void)(compiler);
    compiler.addFormat("iana-time-zone", isIanaTimezone);
    compiler.addSchema({ $id: "urn:tcdx:test:openapi", components: { schemas } });
  }
  const compilerFor = (name: string) => {
    const schema = schemas[name];
    if (!schema) throw new Error(`Unknown contract schema: ${name}`);
    const dialect = schema.$schema;
    if (dialect === "http://json-schema.org/draft-07/schema#") return compilers.draft7;
    if (dialect === undefined || dialect === "https://json-schema.org/draft/2020-12/schema") return compilers.draft2020;
    throw new Error(`Unsupported published JSON Schema dialect: ${String(dialect)}`);
  };
  return {
    compilerFor,
    compile: (name: string) => compilerFor(name).compile({ $ref: `urn:tcdx:test:openapi#/components/schemas/${name}` })
  };
}
