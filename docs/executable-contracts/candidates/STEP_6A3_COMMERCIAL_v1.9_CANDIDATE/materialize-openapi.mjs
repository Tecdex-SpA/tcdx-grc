import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const target = resolve(root, 'docs/executable-contracts/candidates/STEP_6A3_COMMERCIAL_v1.9_CANDIDATE');
const require = createRequire(resolve(root, 'packages/contracts/package.json'));
const { parse } = require('yaml');
const base = parse(readFileSync(resolve(root, 'docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml'), 'utf8'));
const delta = JSON.parse(readFileSync(resolve(target, '07_OPENAPI_COMMERCIAL_CANDIDATE.json'), 'utf8'));
const unchangedBase = JSON.parse(JSON.stringify(base));

if (base.openapi !== '3.1.0' || delta.openapi !== base.openapi) throw new Error('OpenAPI version mismatch');
if (delta.info['x-package-id'] !== 'GP-STEP6A3-COMMERCIAL-20261013-02') throw new Error('Unexpected package');
if (delta.servers.length !== 1 || delta.servers[0].url !== 'https://grc.tecdex.net/api/v1') throw new Error('Noncanonical public server');

// The approved cursor adds maxLength 2048; keep it distinct from the older base cursor.
delta.components.parameters.CommercialCursor = delta.components.parameters.Cursor;
delete delta.components.parameters.Cursor;
for (const methods of Object.values(delta.paths)) {
  for (const operation of Object.values(methods)) {
    for (const parameter of operation.parameters) {
      if (parameter.$ref === '#/components/parameters/Cursor') {
        parameter.$ref = '#/components/parameters/CommercialCursor';
      }
    }
  }
}

for (const [path, methods] of Object.entries(delta.paths)) {
  const existing = base.paths[path] ?? {};
  for (const [method, operation] of Object.entries(methods)) {
    if (existing[method]) throw new Error(`Operation collision: ${method} ${path}`);
    existing[method] = operation;
  }
  base.paths[path] = existing;
}

for (const [group, entries] of Object.entries(delta.components)) {
  base.components[group] ??= {};
  for (const [name, definition] of Object.entries(entries)) {
    if (group === 'schemas' && name === 'ErrorEnvelope') continue;
    if (base.components[group][name]) {
      if (group === 'parameters' && ['IdempotencyKey', 'CorrelationId', 'PageSize'].includes(name)) {
        const existing = base.components[group][name];
        for (const key of ['name', 'in', 'required', 'schema']) {
          if (JSON.stringify(existing[key]) !== JSON.stringify(definition[key])) {
            throw new Error(`Parameter semantics collision: ${name}.${key}`);
          }
        }
        continue;
      }
      if (JSON.stringify(base.components[group][name]) !== JSON.stringify(definition)) {
        throw new Error(`Component collision: ${group}.${name}`);
      }
      continue;
    }
    base.components[group][name] = definition;
  }
}

function rewriteExternalErrorRef(value) {
  if (Array.isArray(value)) return value.map(rewriteExternalErrorRef);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      key === '$ref' && typeof child === 'string' && child.endsWith('/02_OPENAPI_BASE_CONTRACT.yaml#/components/schemas/ErrorEnvelope')
        ? '#/components/schemas/ErrorEnvelope'
        : rewriteExternalErrorRef(child),
    ]));
  }
  return value;
}

const merged = rewriteExternalErrorRef(base);
merged.servers = delta.servers;
merged.info = {
  ...merged.info,
  version: '1.0.0-commercial-v1.9-candidate',
  'x-status': 'CANDIDATE_NOT_EFFECTIVE',
  'x-master-regent': 'TCDX_GRC_MASTER_REGENT_BASELINE_v1.9_2026-10-14',
  'x-commercial-decision': 'DR-STEP6A3-COMMERCIAL-GOVERNANCE-20261013-02',
  'x-commercial-package-sha256': '489e8cec4b72c2cf464d0315e5ba4f2f5664012b60df2327a07f82882943ba55',
};
const expectedOperationCount = Object.values(delta.paths).reduce((n, methods) => n + Object.keys(methods).length, 0);
if (expectedOperationCount !== 4) throw new Error('Unexpected commercial operation count');
for (const [path, methods] of Object.entries(unchangedBase.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (JSON.stringify(merged.paths[path][method]) !== JSON.stringify(operation)) {
      throw new Error(`Existing operation altered: ${method} ${path}`);
    }
  }
}
let resolvedReferences = 0;
function verifyReferences(value) {
  if (Array.isArray(value)) return value.forEach(verifyReferences);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === '$ref' && typeof child === 'string') {
      if (!child.startsWith('#/')) throw new Error(`Nonlocal reference: ${child}`);
      let node = merged;
      for (const token of child.slice(2).split('/')) {
        node = node?.[token.replaceAll('~1', '/').replaceAll('~0', '~')];
      }
      if (node === undefined) throw new Error(`Unresolved reference: ${child}`);
      resolvedReferences++;
    } else verifyReferences(child);
  }
}
verifyReferences(merged);
writeFileSync(resolve(target, '02_OPENAPI_COMMERCIAL_MERGED_CANDIDATE.json'), `${JSON.stringify(merged, null, 2)}\n`);
process.stdout.write(JSON.stringify({status:'PASS',addedOperations:4,existingOperationsPreserved:true,resolvedReferences,publicServer:merged.servers[0].url})+'\n');
