"""Run via existing SSH on QA backend; emits only allowlisted nonsecret metadata.

No activation CLI, secret file reads, token requests, container start/stop or writes.
"""
import datetime
import json
import os
from pathlib import Path
import socket
import subprocess
import pwd

assert socket.gethostname().split('.')[0] == 'grc-bk', 'QA_BACKEND_HOST_REQUIRED'
def run(args):
    p = subprocess.run(args, capture_output=True, text=True, timeout=20)
    if p.returncode:
        return {'exit_code': p.returncode, 'output': 'COMMAND_FAILED_RAW_OUTPUT_NOT_EXPORTED'}
    return {'exit_code': 0, 'output': p.stdout.strip()}
def metadata(path):
    try:
        s = path.lstat()
        return {'path': str(path), 'exists': True, 'uid': s.st_uid, 'gid': s.st_gid, 'mode': oct(s.st_mode & 0o777), 'regular_file': path.is_file(), 'directory': path.is_dir(), 'symlink': path.is_symlink()}
    except OSError as e:
        return {'path': str(path), 'exists': False, 'error': type(e).__name__}

names = ['tcdx-grc-backend', 'tcdx-grc-step6a3-publication-operator', 'tcdx-grc-step6a3-c04w-publication-operator', 'tcdx-grc-step6a3-c04w-lifecycle-operator', 'tcdx-grc-step6a3-initial-source-operator']
# All environment values stay in memory on their own host. Only the exact
# nonsecret path/hash/profile fields below can leave this process.
allowed = {'NODE_ENV', 'DATABASE_HOST', 'DATABASE_NAME', 'TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET', 'TCDX_COMMERCIAL_APPROVED_MANIFEST_SHA256', 'TCDX_QA_EXISTING_SESSION_ORIGIN', 'TCDX_IAM_M2M_PROFILE_FILE', 'TCDX_IAM_M2M_PROFILE_SHA256', 'TCDX_IAM_BINDINGS_FILE', 'TCDX_IAM_BINDINGS_SHA256', 'TCDX_IAM_DECISION_FILE', 'TCDX_IAM_DECISION_SHA256', 'TCDX_IAM_RBAC_R3_FILE', 'TCDX_IAM_RBAC_R3_SHA256', 'TCDX_C04W_PUBLICATION_ROOT', 'TCDX_INITIAL_SOURCE_PUBLICATION_ROOT', 'TCDX_LIBRARY_PUBLICATION_ROOT', 'TCDX_LIBRARY_PUBLICATION_INPUT_FILE', 'TCDX_LIBRARY_PUBLICATION_INPUT_SHA256'}
code = r'''
const fs=require('node:fs'),crypto=require('node:crypto'),net=require('node:net');
const paths=['/app/apps/backend/dist/security/commercial-catalog-operator.js','/app/apps/backend/dist/security/publication-operator-server.js','/app/apps/backend/dist/security/iam-publication.js','/app/apps/backend/dist/security/iam-publication-runtime.js','/app/apps/backend/dist/security/normative-library-publication.js'];
const files=paths.map(path=>{try{const b=fs.readFileSync(path);const t=b.toString();return {path,present:true,sha256:crypto.createHash('sha256').update(b).digest('hex'),library_operation:t.includes('iam.library.publish'),library_method:t.includes('publishNormativeLibrary'),library_config:t.includes('TCDX_LIBRARY_PUBLICATION_ROOT')};}catch(e){return {path,present:false,error:e.code};}});
const refs=['/run/secrets/iam_publisher_client_secret',process.env.TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET].filter(Boolean).map(path=>{try{const s=fs.lstatSync(path);return {path,present:true,socket:s.isSocket(),file:s.isFile(),symlink:s.isSymbolicLink(),uid:s.uid,gid:s.gid,mode:(s.mode&511).toString(8),owner_matches:s.uid===process.getuid()};}catch(e){return {path,present:false,error:e.code};}});
const configured=process.env.TCDX_COMMERCIAL_CATALOG_OPERATOR_SOCKET;
const result={uid:process.getuid(),files,refs};
if(!configured){console.log(JSON.stringify({...result,connection_probe:'NOT_CONFIGURED'}));}
else{const s=net.connect(configured);let done=false;const finish=(status)=>{if(done)return;done=true;s.destroy();console.log(JSON.stringify({...result,connection_probe:status,bytes_sent:0,activation_requests:0}));};s.setTimeout(3000,()=>finish('TIMEOUT'));s.once('connect',()=>finish('CONNECTED_NO_BYTES'));s.once('error',e=>finish(e.code));}
'''
containers = []
for name in names:
    item = run(['docker', 'inspect', name])
    if item['exit_code']:
        containers.append({'name': name, 'present': False})
        continue
    d = json.loads(item['output'])[0]
    env = dict(s.split('=', 1) for s in d['Config'].get('Env', []) if '=' in s)
    mounts = [{'type': m['Type'], 'source': m['Source'], 'destination': m['Destination'], 'read_write': m.get('RW')} for m in d['Mounts'] if m['Destination'] in {'/run/tcdx-operator', '/run/secrets/iam_publisher_client_secret', '/run/config/step6a3-iam'}]
    result = {'name': name, 'present': True, 'id': d['Id'], 'image': d['Image'], 'state': {'status': d['State']['Status'], 'running': d['State']['Running'], 'started_at': d['State']['StartedAt'], 'health': d['State'].get('Health', {}).get('Status')}, 'container_user': d['Config'].get('User'), 'command': d['Config'].get('Cmd'), 'environment_names': sorted(env), 'safe_configuration': {k: v for k, v in env.items() if k in allowed}, 'reviewed_mounts': mounts}
    for m in mounts:
        m['host_metadata'] = metadata(Path(m['source']))
        if m['destination'] == '/run/tcdx-operator':
            m['socket_metadata'] = metadata(Path(m['source']) / 'catalog.sock')
    if d['State']['Running']:
        observed = run(['docker', 'exec', name, 'node', '-e', code])
        result['runtime_probe'] = json.loads(observed['output']) if observed['exit_code'] == 0 else observed
    containers.append(result)
    # No returned object retains the full environment or inspect payload.
    del env, d, item

print(json.dumps({'status': 'PASS_READ_ONLY_METADATA', 'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'host': socket.gethostname(), 'administrative_user': pwd.getpwuid(os.getuid()).pw_name, 'uid': os.getuid(), 'host_secret_custody': metadata(Path.home() / '.secrets/tcdx-grc-qa/iam-publisher-client-secret'), 'containers': containers, 'secrets_read': False, 'tokens_requested': 0, 'activation_requests': 0, 'processes_started_or_stopped': 0}, indent=2))
