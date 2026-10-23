import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root='docs/executable-contracts/amendments/PHASE6A_RUNTIME_BINDINGS_20261023/';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const exact=ref=>{if(hash(ref.path)!==ref.sha256)throw Error('Runtime binding authority drift: '+ref.path);return JSON.parse(readFileSync(ref.path));};
const receipt=JSON.parse(readFileSync(root+'CONTRACT_PUBLICATION_RECEIPT.json'));
if(receipt.status!=='PASS_CONTRACT_EFFECTIVE_LOCAL'||receipt.runtime_activation!=='NONE')throw Error('Runtime binding contract is not published locally');
exact(receipt.authorization);exact(receipt.review);
const manifest=exact(receipt.publication_manifest);
for(const ref of [...manifest.files,...manifest.predecessor])if(hash(ref.path)!==ref.sha256)throw Error('Runtime binding source drift: '+ref.path);
const contract=JSON.parse(readFileSync(root+'CONTRACT.json')),api=JSON.parse(readFileSync(root+'OPENAPI.json'));
const successorRoot='docs/executable-contracts/amendments/PHASE6A_PUBLICATION_CLOSURE_20261023/';
const successorReceipt=JSON.parse(readFileSync(successorRoot+'CONTRACT_PUBLICATION_RECEIPT.json'));
if(successorReceipt.status!=='PASS_CONTRACT_EFFECTIVE_LOCAL'||successorReceipt.runtime_activation!=='NONE')throw Error('Publication reference successor missing');
exact(successorReceipt.authorization);
const successorManifest=exact(successorReceipt.publication_manifest);
for(const ref of [...successorManifest.files,...successorManifest.predecessor])if(hash(ref.path)!==ref.sha256)throw Error('Publication reference source drift');
const referencePublication=JSON.parse(readFileSync(successorRoot+'CONTRACT.json'));
contract.publication.atomic_states=referencePublication.atomic_states;
contract.publication.unchanged_states=referencePublication.unchanged_states;
contract.concurrency.population_hash=referencePublication.population_hash;
contract.concurrency.etag=referencePublication.etag;
contract.reference_publication=referencePublication;
const ddl=manifest.files.find(ref=>ref.path.endsWith('/DDL_SPEC.sql'));
if(!ddl)throw Error('Missing approved physical binding');
const physicalMigration={id:'20261023000100',filename:'20261023000100_phase6a_runtime_bindings.sql',sha256:ddl.sha256};
const req=createRequire(new URL('../../packages/contracts/package.json',import.meta.url));
const {Ajv2020}=req('ajv/dist/2020.js'),standalone=req('ajv/dist/standalone/index.js'),addFormats=req('ajv-formats');
const ajv=new Ajv2020({strict:false,allErrors:true,code:{source:true,esm:true}});addFormats(ajv);
ajv.addSchema({$id:'urn:tcdx:runtime-bindings',components:{schemas:api.components.schemas}});
const validators=Object.fromEntries(Object.keys(api.components.schemas).map(name=>[name,'urn:tcdx:runtime-bindings#/components/schemas/'+name]));
const code=standalone(ajv,validators).replace(/require\("([^"]+)"\)/g,(_,id)=>`require(${JSON.stringify(req.resolve(id))})`);
const vr=createRequire(realpathSync(new URL('../../apps/frontend/node_modules/vite/package.json',import.meta.url)));
const {rolldown}=await import(vr.resolve('rolldown'));
const bundle=await rolldown({input:'virtual:runtime',plugins:[{name:'runtime',resolveId(id){if(id==='virtual:runtime')return id;},load(id){if(id==='virtual:runtime')return code;}}],logLevel:'silent'});
const {output}=await bundle.generate({format:'esm',minify:true});await bundle.close();
for(const [file,bytes]of Object.entries({
 'apps/backend/src/regulatory/runtime-bindings-contract.generated.json':JSON.stringify({receipt_sha256:hash(root+'CONTRACT_PUBLICATION_RECEIPT.json'),successor_receipt_sha256:hash(successorRoot+'CONTRACT_PUBLICATION_RECEIPT.json'),physicalMigration,contract,api},null,2)+'\n',
 'apps/backend/src/regulatory/runtime-bindings-validators.generated.ts':'// @ts-nocheck\n// Derived from the published P1/P2/T1 OpenAPI.\n'+output[0].code
})){
 if(process.argv.includes('--check')){if(readFileSync(file,'utf8')!==bytes)throw Error('Runtime binding generated drift: '+file);}else writeFileSync(file,bytes);
}
console.log('RUNTIME_BINDING_CONTRACT_DERIVATION=PASS');
