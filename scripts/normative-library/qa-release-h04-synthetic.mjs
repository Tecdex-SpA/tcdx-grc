// Run only inside the deployed QA backend. A single task-owned synthetic proof
// version is created and removed; no database row or normative content is written.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {loadConfig} from './apps/backend/dist/config.js';
import {newUuidV7} from './apps/backend/dist/uuid.js';
import {rightsBindingHash,MinioRightsEvidence,permitsSourceUse} from './apps/backend/dist/normative-library/rights.js';
const config=loadConfig(process.env),c=config.objectStorage;
if(config.nodeEnv!=='qa'||config.database.hostAddress!=='192.168.2.40')throw Error('QA_REQUIRED');
const {Client}=createRequire(new URL('./apps/backend/package.json',import.meta.url))('minio');
const client=new Client({endPoint:c.endpoint.hostname,port:Number(c.endpoint.port||(c.endpoint.protocol==='https:'?443:80)),useSSL:c.endpoint.protocol==='https:',accessKey:c.accessKey,secretKey:c.secretKey,region:c.region,pathStyle:true});
const now=new Date(),id=newUuidV7(),key='knowledge-rights/'+id+'/'+newUuidV7()+'.json';
const record={knowledge_source_usage_right_id:id,knowledge_source_id:newUuidV7(),ownership_class:'PLATFORM_CONTROL',tenant_id:null,audience_tenant_id:null,content_hash:createHash('sha256').update('TecDex synthetic QA editorial fixture, no normative text').digest('hex'),edition_ref:'SYNTHETIC_QA_ONLY',regulatory_pack_version_id:null,use_act:'consultation',use_environment:'qa',content_kind:'editorial',effective_from:new Date(now.getTime()-1000).toISOString(),effective_to:new Date(now.getTime()+60000).toISOString(),revoked_at:null,evidence_ref:'',evidence_hash:'',recorded_audit_event_id:newUuidV7()};
const proof={binding_hash:rightsBindingHash(record),authority:'Product Owner authorization INTEGRATED_QA_RELEASE_20261022: synthetic QA validation only',basis:'TecDex-owned synthetic editorial fixture; no third-party rights or production authority asserted',evidence_locator:'inline synthetic fixture in versioned QA release test',evidence_sha256:record.content_hash};
const bytes=Buffer.from(JSON.stringify(proof));
const result={database_writes:0,normative_imports:0,persisted_rights:0,synthetic_only:true,checks:[],cleanup:'NOT_STARTED'};
let version;
try{
 const encryption=await client.getBucketEncryption(c.bucket),versioning=await client.getBucketVersioning(c.bucket);
 if(encryption?.ServerSideEncryptionConfiguration?.Rule?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm!=='AES256'||versioning.Status!=='Enabled')throw Error('ENCRYPTED_VERSIONED_CUSTODY_REQUIRED');
 const stored=await client.putObject(c.bucket,key,bytes,bytes.length,{'Content-Type':'application/json'});
 version=stored.versionId;if(!version||version==='null')throw Error('IMMUTABLE_VERSION_REQUIRED');
 record.evidence_ref=JSON.stringify({key,version});record.evidence_hash=createHash('sha256').update(bytes).digest('hex');
 const evidence=new MinioRightsEvidence(client,c.bucket);
 const request={sourceId:record.knowledge_source_id,ownershipClass:record.ownership_class,sourceTenantId:null,audienceTenantId:null,contentHash:record.content_hash,packVersionId:null,act:'consultation',environment:'qa',now:now.toISOString(),preliminary:false,edition:record.edition_ref};
 const check=async(name,req,rows,expected)=>{const actual=await permitsSourceUse(req,rows,evidence);if(actual!==expected)throw Error('H04_CHECK_FAILED_'+name);result.checks.push({name,allowed:actual});};
 await check('exact_source_act_and_real_private_immutable_proof',request,[record],true);
 await check('absent_right',request,[],false);
 await check('different_source',{...request,sourceId:newUuidV7()},[record],false);
 await check('different_act',{...request,act:'publication'},[record],false);
 await check('different_tenant_audience',{...request,audienceTenantId:newUuidV7()},[record],false);
 await check('different_environment',{...request,environment:'production'},[record],false);
 await check('ambiguous_right',request,[record,record],false);
 await check('revoked_right',request,[{...record,revoked_at:record.effective_from}],false);
 await check('proof_hash_mismatch',request,[{...record,evidence_hash:'0'.repeat(64)}],false);
 result.status='PASS_QA_DEPLOYED_H04_SYNTHETIC';
}catch(error){result.status='FAIL';result.error={code:error.code??error.message};process.exitCode=1;}
finally{
 if(version){
  try{
   await client.removeObject(c.bucket,key,{versionId:version});
   let absent=false;try{await client.statObject(c.bucket,key,{versionId:version});}catch(error){if(['NoSuchKey','NoSuchVersion','NotFound'].includes(error.code))absent=true;else throw error;}
   if(!absent)throw Error('FIXTURE_VERSION_STILL_PRESENT');result.cleanup='PASS_EXACT_OWNED_VERSION_REMOVED';
  }catch(error){result.cleanup='FAIL';result.status='FAIL';process.exitCode=1;}
 }
 console.log(JSON.stringify(result));
}
