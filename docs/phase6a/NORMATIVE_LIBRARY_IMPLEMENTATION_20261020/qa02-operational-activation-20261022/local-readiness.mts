// Offline metadata only: never reads credentials or contacts a service.
import {readFileSync,lstatSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
const root=new URL('../../../../',import.meta.url).pathname;
const profile=JSON.parse(readFileSync(root+'iam/config/step6a3-m2m-qa-profile.json','utf8'));
const preparation=JSON.parse(readFileSync(root+'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/local-operational-preparation-20261022/IAM_REGISTRY_PREPARATION.json','utf8'));
const paths=[profile.credential_ref,homedir()+'/.secrets/tcdx-grc-qa/iam-publisher-client-secret','/run/tcdx-operator/catalog.sock'];
const custody=paths.map(path=>{if(!existsSync(path))return {path,present:false};const s=lstatSync(path);return {path,present:true,file:s.isFile(),socket:s.isSocket(),symlink:s.isSymbolicLink(),mode:(s.mode&0o777).toString(8),owner_matches:s.uid===process.getuid?.()};});
const contract=JSON.parse(readFileSync(root+'packages/contracts/src/normative-library.generated.json','utf8'));
const digest=(path:string)=>createHash('sha256').update(readFileSync(root+path)).digest('hex');
for(const [path,hash] of Object.entries(contract.sources))if(digest(path)!==hash)throw Error('Source integrity: '+path);
const migrations=JSON.parse(readFileSync(root+'database/migrations/manifest.json','utf8')).migrations;
if(migrations.length!==36)throw Error('36 migrations required');
for(const m of migrations)if(digest('database/migrations/'+m.filename)!==m.sha256)throw Error('Migration integrity');
console.log(JSON.stringify({status:'PASS_OFFLINE_CONTRACTS',profile,profile_sha256:createHash('sha256').update(readFileSync(root+'iam/config/step6a3-m2m-qa-profile.json')).digest('hex'),custody,
 configured_environment_names:Object.keys(process.env).filter(k=>k.startsWith('TCDX_IAM_')||k.startsWith('TCDX_LIBRARY_')),
 source_and_36_migration_hashes_verified:true,
 approved_permissions:preparation.catalogue_delta,approved_grants:preparation.approved_base_pairs,limited_grant:preparation.existing_permission_limited_grant,
 bindings:preparation.bindings,definitions:contract.definitions.definitions,
 mechanism:'IamPublicationService.publishNormativeLibrary authenticates fresh OAuth proof and publishes IAM+B06+Definitions atomically; no independent SQL activation',
 local_authenticated_operator_available:custody[0]!.present&&custody[2]!.present},null,2));
