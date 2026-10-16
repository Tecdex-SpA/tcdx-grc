import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const yamlPath = path.join(root, 'node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/index.js');
const YAML = await import(yamlPath);
const folder = 'docs/executable-contracts/candidates/PO_COMMERCIAL_SIMPLIFICATION_v1.12';
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function parse(p) {
  const doc = YAML.parseDocument(read(p), { uniqueKeys: true });
  assert.equal(doc.errors.length, 0, `invalid YAML: ${p}`);
  return doc.toJSON();
}
const active = parse('docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml');
const candidate = parse(`${folder}/snapshots/02_OPENAPI_BASE_CONTRACT.yaml`);
function withoutNewAnnotations(value) {
  if (Array.isArray(value)) return value.map(withoutNewAnnotations);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['x-tcdx-po-candidate', 'x-tcdx-po-reconciliation'].includes(key))
    .map(([key, child]) => [key, withoutNewAnnotations(child)]));
}
function compatible(base, proposed) {
  assert.deepEqual(withoutNewAnnotations(proposed), base,
    'candidate changed existing transport/security/permission/scope/effect/physical contract');
}
compatible(active, candidate);
const operations = document => Object.entries(document.paths).flatMap(([url, item]) =>
  Object.entries(item).filter(([, op]) => op && typeof op === 'object' && op.operationId)
    .map(([method, op]) => ({ url, method, ...op })));
const current = operations(active);
assert.equal(current.length, 175);
assert.equal(new Set(current.map(o => o.operationId)).size, 175);
const annotated = JSON.parse(read(`${folder}/ANNOTATED_OPERATIONS.json`));
for (const id of Object.keys(annotated)) assert(current.some(o => o.operationId === id), id);
let references = 0;
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string') {
    assert(value.$ref.startsWith('#/'), `unexpected external ref ${value.$ref}`);
    let target = candidate;
    for (const part of value.$ref.slice(2).split('/').map(x => x.replaceAll('~1', '/').replaceAll('~0', '~')))
      target = target?.[part];
    assert.notEqual(target, undefined, `unresolved ${value.$ref}`);
    references++;
  }
  for (const child of Object.values(value)) walk(child);
}
walk(candidate);
const rowIds = content => [...content.matchAll(/^\|\s*([a-z][A-Za-z0-9]+)\s*\|/gm)].map(m => m[1]);
const baseRows = rowIds(read('docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md'));
const newRows = rowIds(read(`${folder}/snapshots/03_API_RESOURCE_OPERATION_MATRIX.md`));
assert.deepEqual(newRows, baseRows, 'operation-matrix inventory changed');
for (const op of current) assert(newRows.includes(op.operationId), `matrix missing ${op.operationId}`);
const permissionRows = content => content.split('\n').filter(line =>
  /^\|\s*(?:`|<code>)[a-z][a-z0-9_.]+(?:`|<\/code>)/.test(line));
assert.deepEqual(permissionRows(read(`${folder}/snapshots/05_PERMISSION_CATALOG.md`)),
  permissionRows(read('docs/executable-contracts/05_PERMISSION_CATALOG.md')), 'permission/grant rows changed');
const fields = ['x-tcdx-permission', 'x-tcdx-scope', 'x-tcdx-capability', 'x-tcdx-audit-event',
  'x-tcdx-domain-events', 'x-tcdx-idempotency-class', 'x-tcdx-transaction-boundary', 'x-tcdx-physical-entities'];
const bindings = current.filter(o => Object.hasOwn(annotated, o.operationId)).map(o => ({
  operation_id: o.operationId, method: o.method, path: o.url,
  ...Object.fromEntries(fields.map(k => [k, o[k] ?? null]))
}));
if (process.argv.includes('--write-bindings'))
  fs.writeFileSync(path.join(root, folder, 'OPERATION_BINDINGS.json'),
    JSON.stringify({ status: 'DRAFT_NOT_EFFECTIVE', bindings }, null, 2) + '\n');
else assert.deepEqual(JSON.parse(read(`${folder}/OPERATION_BINDINGS.json`)).bindings, bindings);
// Negative controls mutate isolated parsed data, never a source file.
const negatives = [];
for (const kind of ['permission', 'scope', 'security', 'request-schema', 'new-route', 'audit-event']) {
  const bad = structuredClone(candidate);
  const op = bad.paths['/memberships'].post;
  if (kind === 'permission') op['x-tcdx-permission'] = 'unauthorized.synthetic.permission';
  if (kind === 'scope') op['x-tcdx-scope'] = 'platform';
  if (kind === 'security') op.security = [];
  if (kind === 'request-schema') bad.components.schemas.RetentionPolicyCreateRequest.properties.synthetic = { type: 'string' };
  if (kind === 'new-route') bad.paths['/synthetic-not-authorized'] = { get: { operationId: 'synthetic' } };
  if (kind === 'audit-event') op['x-tcdx-audit-event'] = 'audit.synthetic';
  assert.throws(() => compatible(active, bad), undefined, `negative control missed ${kind}`);
  negatives.push(kind);
}
process.stdout.write(JSON.stringify({ result: 'PASS', scope: 'DOCUMENTARY_ONLY',
  yaml_parser: 'existing transitive yaml@2.9.1; no installation', operations: current.length,
  resolved_local_references: references, annotated_operations: bindings.length,
  transport_security_permissions_scopes_schemas_effects_unchanged: true,
  negative_compatibility_controls_rejected: negatives }, null, 2) + '\n');
