// Execute only inside the authenticated canonical QA operator. No secrets exit.
import {loadConfig} from './apps/backend/dist/config.js';
import {createDatabase,sql} from './apps/backend/dist/database.js';
import {ApplicationTokenService} from './apps/backend/dist/security/application-token.js';
import {IamPublicationService} from './apps/backend/dist/security/iam-publication.js';
import {configureQaIamPublication} from './apps/backend/dist/security/iam-publication-runtime.js';
const config=loadConfig(process.env),db=createDatabase(config);
const result={environment:config.nodeEnv,TLS:config.database.sslMode,committed_writes:0};
try{
 if(config.nodeEnv!=='qa')throw Error('QA_REQUIRED');
 const tokens=await ApplicationTokenService.create(config.applicationJwt);
 const iam=await configureQaIamPublication(db,tokens,config,process.env);
 result.database=(await sql`SELECT current_user,current_database(),host(inet_server_addr()) address`.execute(db)).rows[0];
 const proof=await tokens.authenticateMachine(await IamPublicationService.credentialFile(iam.configuration.profile.credential_ref)());
 result.authentication='PASS_FRESH_M2M';
 const principal=await iam.resolvePrincipal(proof);result.principal=principal;
 result.registry=(await sql`SELECT count(*)::integer AS published_definitions FROM config.configuration_definitions WHERE lifecycle_state='published'`.execute(db)).rows[0];
}catch(e){result.error={name:e.name,code:e.code,statusCode:e.statusCode,constraint:e.constraint,table:e.table,schema:e.schema};}
finally{await db.destroy();console.log(JSON.stringify(result));}
