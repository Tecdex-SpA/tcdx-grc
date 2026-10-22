// Derive only the published library slice. Never changes the effective contracts.
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const root = new URL('../../', import.meta.url);
const req = createRequire(new URL('packages/contracts/package.json', root));
const { Ajv2020 } = req('ajv/dist/2020.js');
const standalone = req('ajv/dist/standalone/index.js');
const addFormats = req('ajv-formats');
const vr = createRequire(realpathSync(new URL('apps/frontend/node_modules/vite/package.json', root)));
const { rolldown } = await import(vr.resolve('rolldown'));
const base = 'docs/executable-contracts/amendments/NORMATIVE_LIBRARY_20261020/';
const sources = {};
function read(path) { const bytes=readFileSync(new URL(path,root)); sources[path]=createHash('sha256').update(bytes).digest('hex');return JSON.parse(bytes); }
const successor='docs/executable-contracts/amendments/NORMATIVE_LIBRARY_B06_REGISTRY_20261020/';
const receipt=read(successor+'CONTRACT_PUBLICATION_RECEIPT.json');
if(receipt.status!=='PASS_CONTRACT_EFFECTIVE_LOCAL')throw new Error('B06 successor not published');
function verify(ref){const bytes=readFileSync(new URL(ref.path,root));if(createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw new Error('Hash mismatch '+ref.path);}
verify(receipt.publication_manifest);verify(receipt.authorization);
const manifest=read(receipt.publication_manifest.path);for(const ref of [...manifest.files,...manifest.predecessor])verify(ref);
const itemReceipt=read('docs/executable-contracts/amendments/NORMATIVE_LIBRARY_ITEM_INITIAL_20261020/CONTRACT_PUBLICATION_RECEIPT.json');
if(itemReceipt.status!=='PASS_CONTRACT_EFFECTIVE_LOCAL')throw new Error('Item initial state not published');
verify(itemReceipt.publication_manifest);verify(itemReceipt.authorization);
const itemManifest=read(itemReceipt.publication_manifest.path);for(const ref of [...itemManifest.files,...itemManifest.predecessor])verify(ref);
const itemInitial=read(itemReceipt.authorization.path);
const api=read(base+'02_OPENAPI_NORMATIVE_LIBRARY.json');
const registry=read(base+'OPERATIONS.json');
// PO-authorized contextual B04 successor; immutable predecessors remain exact.
const discoveryReceipt=read('docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/code-b04-01-full-resolution-20261022/contracts/RECEIPT.json');
if(discoveryReceipt.status!=='PASS_CONTRACT_EFFECTIVE_LOCAL'||discoveryReceipt.runtime_activation!=='NONE')throw new Error('B04 contextual contract not published locally');
for(const ref of discoveryReceipt.files)verify(ref);
const discovery=read(discoveryReceipt.files.find(ref=>ref.path.endsWith('/CONTRACT.json')).path);
for(const ref of discovery.predecessors)verify(ref);
const discoveryApi=read(discoveryReceipt.files.find(ref=>ref.path.endsWith('/OPENAPI_DELTA.json')).path);
if(JSON.stringify(discovery.schemas)!==JSON.stringify(discoveryApi.components.schemas)||discoveryApi.paths[discovery.operation.path]?.get.operationId!==discovery.operation.operation_id)throw new Error('B04 schema/operation drift');
registry.new_operations.push(discovery.operation);
Object.assign(api.components.schemas,discovery.schemas);
Object.assign(api.paths,discoveryApi.paths);
const schemas={};
function collect(name) { if(schemas[name])return; const s=api.components.schemas[name];if(!s)throw new Error(name);schemas[name]=s;function walk(v){if(!v||typeof v!=='object')return;if(v.$ref){if(!v.$ref.startsWith('#/components/schemas/'))throw new Error(v.$ref);collect(v.$ref.split('/').at(-1));}Object.values(v).forEach(walk);}walk(s); }
const names = new Set(registry.new_operations.flatMap(o=>[o.request_schema,o.response_schema]).filter(Boolean));
for(const n of ['MaterialChangePayload','ControlOverrideCreateRequest','ApplicabilityCreateRequest','KnowledgeTarget','KnowledgeContextLinkInput','KnowledgeVersionProjection','MatrixProjection'])if(api.components.schemas[n])names.add(n);
for(const n of names)collect(n);
const audit=read(base+'APPLICABILITY_CONTEXT_AUDIT_SCHEMA.json');
const ajv=new Ajv2020({strict:false,allErrors:true,validateFormats:true,code:{source:true,esm:true}});addFormats(ajv);ajv.addMetaSchema(req('ajv/dist/refs/json-schema-draft-07.json'));
ajv.addSchema({$id:'urn:tcdx:normative-library:published',components:{schemas}});ajv.addSchema(audit);
const exports=Object.fromEntries([...names].sort().map(n=>[n,'urn:tcdx:normative-library:published#/components/schemas/'+n]));exports.ApplicabilityContextAudit=audit.$id;
let code=standalone(ajv,exports).replace(/require\("([^"]+)"\)/g,(_,id)=>`require(${JSON.stringify(req.resolve(id))})`);
const bundler=await rolldown({input:'virtual:library',plugins:[{name:'library',resolveId(id){if(id==='virtual:library')return id;},load(id){if(id==='virtual:library')return code;}}],logLevel:'silent'});
const {output}=await bundler.generate({format:'esm',minify:true});await bundler.close();
const sourceCapabilities={};
for(const methods of Object.values(api.paths))for(const op of Object.values(methods)){if(!op?.operationId)continue;const permission=op['x-tcdx-permission']?.replaceAll('`','');if(permission&&op['x-tcdx-capability'])sourceCapabilities[permission]=op['x-tcdx-capability'];}
const overrideCreate=api.paths['/configuration-overrides'].post;
const existingOperations=[{operation_id:overrideCreate.operationId,path:'/configuration-overrides',method:'post',context:'TENANT',request_schema:'ControlOverrideCreateRequest',response_schema:'ControlOverrideResult',success:202,permission:overrideCreate['x-tcdx-permission'].replaceAll('`',''),policy:overrideCreate['x-tcdx-control-scope-policy'],audit_event:overrideCreate['x-tcdx-audit-event'].replaceAll('`',''),domain_event:overrideCreate['x-tcdx-domain-events'].replaceAll('`','')}];
const policies=read(base+'OBJECT_POLICIES.json');policies.policies.CONTROL_OVERRIDE_DEFINITION_REFERENCE=discovery.policy;
const assets={registry,existingOperations,itemInitial,sourceCapabilities,matrices:read(base+'MATRIX_TYPES.json'),definitions:read(base+'CONFIGURATION_DEFINITIONS.json'),lifecycle:read(successor+'LIFECYCLE_BINDINGS.json'),decisionDispatch:read(successor+'DECISION_DISPATCH.json'),policies,events:read(base+'EVENTS_AND_AUDIT.json'),permissions:read(base+'PERMISSIONS_AND_GRANTS.json'),regulatory:read(base+'REGULATORY_SCOPE.json'),importContract:read(base+'CANONICAL_IMPORT_CONTRACT.json'),sources};
const files={
 'packages/contracts/src/normative-library.generated.json':JSON.stringify(assets,null,2)+'\n',
 'packages/contracts/src/normative-library-validators.generated.ts':'// @ts-nocheck\n// Generated by Ajv from published schemas; verify with generator --check.\n'+output[0].code
};
for(const [path,text]of Object.entries(files)){const url=new URL(path,root);if(process.argv.includes('--check')){if(readFileSync(url,'utf8')!==text)throw new Error('Stale '+path);}else writeFileSync(url,text);}
console.log(`NORMATIVE_LIBRARY_ASSETS=PASS schemas=${names.size+1} operations=${registry.new_operations.length}`);
