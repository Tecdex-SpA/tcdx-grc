// Execute only inside the authenticated canonical QA operator. No secrets exit.
import {loadConfig} from './apps/backend/dist/config.js';
import {createDatabase,sql} from './apps/backend/dist/database.js';
import {ApplicationTokenService} from './apps/backend/dist/security/application-token.js';
import {IamPublicationService} from './apps/backend/dist/security/iam-publication.js';
import {configureQaIamPublication} from './apps/backend/dist/security/iam-publication-runtime.js';
import {MinioFileStoragePort} from './apps/backend/dist/ports/minio-file-storage.js';
import {permitsSourceUse} from './apps/backend/dist/normative-library/rights.js';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const config=loadConfig(process.env),db=createDatabase(config);
const result={environment:config.nodeEnv,TLS:config.database.sslMode,committed_writes:0};
try{
 if(config.nodeEnv!=='qa')throw Error('QA_REQUIRED');
 result.database=(await sql`SELECT current_user,current_database(),host(inet_server_addr()) address`.execute(db)).rows[0];
 if(process.argv[2]!=='backend'){
  const tokens=await ApplicationTokenService.create(config.applicationJwt);
  const iam=await configureQaIamPublication(db,tokens,config,process.env);
  const proof=await tokens.authenticateMachine(await IamPublicationService.credentialFile(iam.configuration.profile.credential_ref)());
  result.authentication='PASS_FRESH_M2M';
  result.principal=await iam.resolvePrincipal(proof);
 }
 result.registry=(await sql`SELECT count(*)::integer AS published_definitions FROM config.configuration_definitions WHERE lifecycle_state='published'`.execute(db)).rows[0];
 if(process.argv[2]==='backend'){
 const storage=new MinioFileStoragePort(config.objectStorage);
 await storage.verifyReady();result.private_storage='PASS_EXISTING_ENCRYPTED_BUCKET';
 const ports=await storage.createKnowledgePorts();
 result.H04_absent_right_denied=!(await permitsSourceUse({sourceId:randomUUID(),ownershipClass:'PLATFORM_CONTROL',sourceTenantId:null,audienceTenantId:null,contentHash:'a'.repeat(64),packVersionId:null,act:'consultation',environment:'qa',now:new Date().toISOString(),preliminary:false},[],ports.rightsEvidence));
 const {Client}=createRequire(new URL('./apps/backend/package.json',import.meta.url))('minio');
 const c=config.objectStorage;
 const minio=new Client({endPoint:c.endpoint.hostname,port:Number(c.endpoint.port||(c.endpoint.protocol==='https:'?443:80)),useSSL:c.endpoint.protocol==='https:',accessKey:c.accessKey,secretKey:c.secretKey,region:c.region,pathStyle:true});
 result.private_storage_versioning=(await minio.getBucketVersioning(c.bucket)).Status;
 }
}catch(e){result.error={name:e.name,code:e.code,statusCode:e.statusCode,constraint:e.constraint,table:e.table,schema:e.schema};}
finally{await db.destroy();console.log(JSON.stringify(result));}
