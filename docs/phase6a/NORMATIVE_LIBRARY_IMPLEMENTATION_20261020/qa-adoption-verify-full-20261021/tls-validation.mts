// Approved QA public certificate only. No DDL, trust store or server changes.
import { readFileSync,writeFileSync,chmodSync,existsSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { rootCertificates, type TLSSocket } from 'node:tls';
import { createClient, databaseConfig } from '../../../../scripts/foundations/db.ts';
const base=import.meta.dirname;
const wanted='FB:68:09:DA:13:9E:E3:E5:2C:2F:1F:EA:D7:5B:11:92:7B:04:B8:96:7A:2B:5D:B8:46:9C:B6:70:E3:BB:A3:E6';
const candidate=readFileSync(base+'/QA_APPROVED_CERT_CANDIDATE.pem','utf8');
if((candidate.match(/BEGIN CERTIFICATE/g)||[]).length!==1 || new X509Certificate(candidate).fingerprint256!==wanted)throw Error('Certificate differs from independent PO administrator attestation');
if(existsSync(base+'/TLS_VALIDATION.json'))throw Error('Preserve existing validation');
const proof:any={authority:'PO independently verified certificate from db-v4 administrative console at /etc/ssl/certs/ssl-cert-snakeoil.pem; exact SHA256 and QA address/name binding approved in current instruction',approved_fingerprint:wanted,logical_host:process.env.DATABASE_HOST,hostaddr:process.env.DATABASE_HOSTADDR,sslmode:process.env.DATABASE_SSL_MODE,root_certificate:process.env.DATABASE_SSL_ROOT_CERT,tests:[]};
if(process.env.DATABASE_HOST!=='db-tecdex'||process.env.DATABASE_HOSTADDR!=='192.168.2.40'||process.env.DATABASE_SSL_MODE!=='verify-full')throw Error('Exact PO connection required');
const c=createClient();
try {
 await c.connect();
 const stream=(c as unknown as {connection:{stream:TLSSocket}}).connection.stream;
 if(!stream.authorized || stream.getPeerCertificate().fingerprint256!==wanted)throw Error('TLS peer not authorized');
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const identity=(await c.query("SELECT current_database() db,host(inet_server_addr()) host,inet_server_port() port,current_user AS username,current_setting('server_version_num') version,current_setting('cluster_name') cluster,current_setting('transaction_read_only') readonly,current_setting('default_transaction_read_only') default_readonly,(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) ssl")).rows[0];
 proof.identity=identity;
 if(identity.db!=='tcdx-grc'||identity.host!=='192.168.2.40'||identity.port!==5432||identity.username!=='postgres'||identity.version!=='160015'||identity.cluster!=='16/main'||identity.readonly!=='on'||identity.default_readonly!=='on'||!identity.ssl)throw Error('QA read-only identity blocked');
 proof.identity=identity;proof.tls={authorized:stream.authorized,peer_fingerprint:stream.getPeerCertificate().fingerprint256,protocol:stream.getProtocol(),servername:'db-tecdex',DNS_changes:'NONE'};
 // Retrieve the PUBLIC file through the now authenticated administrative QA
 // session. The candidate was authenticated by the PO's independent fingerprint;
 // the administrative copy below is checked again, never trusted by discovery.
 const publicPem=(await c.query('SELECT pg_read_file($1,0,65536) AS public_certificate',['/etc/ssl/certs/ssl-cert-snakeoil.pem'])).rows[0].public_certificate as string;
 if((publicPem.match(/BEGIN CERTIFICATE/g)||[]).length!==1||new X509Certificate(publicPem).fingerprint256!==wanted)throw Error('Administrative public copy differs');
 writeFileSync(base+'/QA_ADMINISTRATIVE_PUBLIC_CERT.pem',publicPem,{flag:'wx',mode:0o600});chmodSync(base+'/QA_ADMINISTRATIVE_PUBLIC_CERT.pem',0o600);
 proof.administrative_copy={source:'Authenticated PostgreSQL administrative session, read-only public file only',path:'/etc/ssl/certs/ssl-cert-snakeoil.pem',fingerprint:new X509Certificate(publicPem).fingerprint256,private_key_read:false};
 await c.query('ROLLBACK');proof.tests.push({name:'canonical_client_CA_and_SAN_and_readonly',status:'PASS'});
 // Exercise the literal libpq settings requested by PO, using only the existing
 // credential in process memory; never an argv/file/log or persisted setting.
 const password=(c as unknown as {password:string}).password;
 const conn=`host=db-tecdex hostaddr=192.168.2.40 port=5432 dbname=tcdx-grc user=postgres sslmode=verify-full sslrootcert=${base}/QA_ADMINISTRATIVE_PUBLIC_CERT.pem connect_timeout=5`;
 const p=spawnSync('/opt/homebrew/opt/postgresql@16/bin/psql',[conn,'-X','-w','-qAt','-v','ON_ERROR_STOP=1','-c',"BEGIN READ ONLY; SELECT jsonb_build_object('db',current_database(),'host',inet_server_addr(),'readonly',current_setting('transaction_read_only'),'ssl',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid())); ROLLBACK;"],{encoding:'utf8',env:{...process.env,PGPASSWORD:password},timeout:15000});
 proof.libpq={settings:conn,exit_code:p.status,stdout:p.stdout,stderr:p.stderr,credential:'Existing native pgpass credential in ephemeral child process memory only; value not recorded'};
 if(p.status!==0)throw Error('Literal libpq verify-full failed');proof.tests.push({name:'libpq_verify_full_host_and_hostaddr',status:'PASS'});
 for(const [name,override,expected] of [['wrong_SAN_rejected',{servername:'unapproved.invalid'},'ERR_TLS_CERT_ALTNAME_INVALID'],['unapproved_CA_rejected',{ca:rootCertificates[0]},'DEPTH_ZERO_SELF_SIGNED_CERT']] as const){
  const config=databaseConfig();if(!config.ssl)throw Error('TLS required');Object.assign(config.ssl,override);
  const pg=(await import('pg')).default;const bad=new pg.Client(config);let code='';try{await bad.connect();}catch(e){code=(e as {code:string}).code;}finally{await bad.end();}
  proof.tests.push({name,status:code===expected?'PASS':'FAIL',observed_error:code});if(code!==expected)throw Error(name);
 }
 proof.status='PASS_VERIFIED_TLS_ONLY';
} catch(e){proof.status='FAIL';proof.error=String(e);process.exitCode=1;}finally{await c.end();writeFileSync(base+'/TLS_VALIDATION.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({status:proof.status,tests:proof.tests,error:proof.error})+'\n');}
