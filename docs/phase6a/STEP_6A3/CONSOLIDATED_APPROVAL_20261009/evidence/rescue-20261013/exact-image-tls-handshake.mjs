import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import crypto from 'node:crypto';
const cert=fs.readFileSync('/run/qa-db-public.pem');
if(crypto.createHash('sha256').update(cert).digest('hex')!=='0a99469321c1117cdf3154a7e5c5e50dd42f719af7b8b1a647fa0bb55179519b')throw Error('CA_PIN_CHANGED');
const socket=net.connect({host:'192.168.2.40',port:5432});
socket.setTimeout(10000,()=>socket.destroy(new Error('TIMEOUT')));
const req=Buffer.alloc(8);req.writeInt32BE(8,0);req.writeInt32BE(80877103,4);
socket.once('connect',()=>socket.write(req));
socket.once('error',()=>{console.log(JSON.stringify({result:'FAIL_NETWORK_OR_TLS'}));process.exitCode=1});
socket.once('data',data=>{
 if(data.toString()!=='S'){socket.destroy();throw Error('TLS_UNSUPPORTED')}
 const secure=tls.connect({socket,servername:'db-tecdex',rejectUnauthorized:true});
 secure.once('secureConnect',()=>{
  const peer=secure.getPeerCertificate();
  if(!secure.authorized)throw Error('TLS_UNAUTHORIZED');
  console.log(JSON.stringify({result:'PASS_EXACT_CANDIDATE_TLS_HANDSHAKE',image:'sha256:3be791953c806bbb24556526f06adfa73b364f374856a4f8102e5db9521d3cee',node:process.version,protocol:secure.getProtocol(),authorized:secure.authorized,certificateFingerprint:peer.fingerprint256,subjectCN:peer.subject.CN,subjectAltName:peer.subjectaltname,authentication:'NOT_ATTEMPTED_NO_CREDENTIALS',databaseMutations:0}));secure.end();
 });
 secure.once('error',()=>{console.log(JSON.stringify({result:'FAIL_VERIFICATION'}));process.exitCode=1});
});
