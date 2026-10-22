#!/usr/bin/env python3
"""Transport and invoke the existing canonical QA promoters; never handles secrets.

Public activation input and reviewed source are mounted read-only. Each mutation
is explicit: backend/frontend promotion, operator replacement, or library publish.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[2]
C = ROOT / '.release-custody/integrated-qa-release-20261022'
REMOTE = '/home/tecdex/.config/tcdx-grc/integrated-qa-release-20261022'
HOSTS = {'backend': '192.168.2.45', 'frontend': '192.168.2.46'}
ITERATION = os.environ.get('TCDX_RELEASE_ITERATION', '')
assert ITERATION in ['', 'v3']
SUFFIX = '-' + ITERATION if ITERATION else ''
def read(path): return json.loads(path.read_text())
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def save(name, data):
    with (C / name).open('x') as f: f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
def image(component):
    return read(C / ('image-backend-' + (ITERATION or 'v2') + '.json' if component == 'backend' else 'image-frontend.json'))
def ssh(host, command, input=None, timeout=240):
    p = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=yes', 'tecdex@' + host, command], input=input, capture_output=True, text=True, timeout=timeout)
    if p.returncode: raise RuntimeError('QA_REMOTE_COMMAND_FAILED: ' + p.stdout[-900:] + p.stderr[-300:])
    return p.stdout.strip()
mode = sys.argv[1]
if mode == 'diagnose':
    receipt=json.loads(ssh(HOSTS['backend'],'docker exec -i tcdx-grc-step6a3-publication-operator node --input-type=module',(ROOT/'scripts/normative-library/qa-release-operator-diagnostic.mjs').read_text()))
    save('operator-diagnostic'+SUFFIX+'.json',receipt)
    print(json.dumps(receipt))
    sys.exit(0)
if mode == 'transport':
    component = sys.argv[2]
    assert component in HOSTS
    info = image(component)
    archive = C / (component + '-image'+SUFFIX+'.tar')
    if not archive.exists():
        subprocess.run(['docker', 'save', '-o', str(archive), info['image_id']], check=True)
    with archive.open('rb') as stream:
        p = subprocess.run(['ssh', 'tecdex@' + HOSTS[component], 'docker load'], stdin=stream, capture_output=True, text=True, timeout=240)
    if p.returncode:
        save('transport-' + component + '-failed.json', {'exit_code': p.returncode, 'stdout': p.stdout[-1600:], 'stderr': p.stderr[-1600:], 'image_id': info['image_id']})
        raise RuntimeError('QA_IMAGE_LOAD_FAILED: ' + p.stderr[-1600:])
    verified = json.loads(ssh(HOSTS[component], 'docker image inspect ' + shlex.quote(info['image_id']) + ' --format ' + shlex.quote('{{json .}}')))
    assert verified['Architecture'] == 'amd64' and verified['Config']['Labels']['org.opencontainers.image.revision'] == info['source_commit']
    save('transport-' + component + SUFFIX + '.json', {'image_id': info['image_id'], 'source_commit': info['source_commit'], 'archive_sha256': sha(archive), 'archive_bytes': archive.stat().st_size, 'host': HOSTS[component], 'verified': True})
    print('TRANSPORT_PASS_' + component)
elif mode == 'stage':
    info = image('backend')
    archive = Path(info['source_archive'])
    assert sha(archive) == info['source_archive_sha256']
    start = datetime.datetime.now(datetime.timezone.utc)
    end = start.replace(year=start.year + 1)
    publication = {'tenantIds': [], 'effectiveFrom': start.isoformat(timespec='milliseconds').replace('+00:00', 'Z'), 'effectiveTo': end.isoformat(timespec='milliseconds').replace('+00:00', 'Z')}
    input_path = C / 'publication-input.json'
    with input_path.open('x') as f: f.write(json.dumps(publication, indent=2) + '\n')
    setup = "from pathlib import Path\nimport os\np=Path(" + repr(REMOTE) + ")\np.mkdir(mode=0o700,exist_ok=False)\n(p/'source').mkdir(mode=0o700)\n"
    ssh(HOSTS['backend'], 'python3 -', setup)
    subprocess.run(['scp', str(archive), 'tecdex@' + HOSTS['backend'] + ':' + REMOTE + '/source.tar'], check=True, capture_output=True)
    subprocess.run(['scp', str(input_path), 'tecdex@' + HOSTS['backend'] + ':' + REMOTE + '/publication-input.json'], check=True, capture_output=True)
    verify = "import hashlib,subprocess,json\nfrom pathlib import Path\np=Path(" + repr(REMOTE) + ")\nassert hashlib.sha256((p/'source.tar').read_bytes()).hexdigest()==" + repr(info['source_archive_sha256']) + "\nsubprocess.run(['tar','-xf',str(p/'source.tar'),'-C',str(p/'source')],check=True)\nprint(json.dumps({'source_verified':True}))\n"
    outcome = json.loads(ssh(HOSTS['backend'], 'python3 -', verify))
    save('stage.json', {**outcome, 'source_commit': info['source_commit'], 'source_archive_sha256': info['source_archive_sha256'], 'remote_directory': REMOTE, 'publication_input': publication, 'publication_input_sha256': sha(input_path), 'PO_temporal_decision': 'One calendar year from recorded publication-start instant', 'tenant_scope_decision': 'Global-only per explicit release authorization; no tenant inferred'})
    print('STAGE_PASS_GLOBAL_ONLY_ONE_CALENDAR_YEAR')
elif mode in ['promote', 'preflight']:
    component = sys.argv[2]
    assert component in HOSTS
    info = image(component)
    policy = read(ROOT / 'deploy/qa/session-duration.json')
    env = {'QA_SESSION_ROLLOUT': 'integrated-qa-20261022'+SUFFIX, 'QA_RELEASE_SOURCE_COMMIT': info['source_commit'], 'APP_SESSION_IDLE_SECONDS': str(policy['APP_SESSION_IDLE_SECONDS']), 'APP_SESSION_MAX_SECONDS': str(policy['APP_SESSION_MAX_SECONDS'])}
    if component == 'backend':
        relative = 'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa-adoption-verify-full-20261021/QA_ADMINISTRATIVE_PUBLIC_CERT.pem'
        env.update(QA_DATABASE_TLS_ROOT_CERT=REMOTE + '/source/' + relative, QA_DATABASE_TLS_ROOT_CERT_SHA256=sha(ROOT / relative))
    command = ' '.join(k + '=' + shlex.quote(v) for k, v in env.items()) + ' python3 - ' + shlex.quote(component) + ' ' + shlex.quote(info['image_id']) + (' --preflight-only' if mode == 'preflight' else '')
    receipt = json.loads(ssh(HOSTS[component], command, (ROOT / 'scripts/phase6a3/qa-promote-session-duration.py').read_text()))
    save(mode + '-' + component + SUFFIX + '.json', {**receipt, 'source_commit': info['source_commit']})
    print(json.dumps(receipt))
elif mode == 'operators':
    info, staged = image('backend'), read(C / 'stage.json')
    names = ['tcdx-grc-step6a3-publication-operator', 'tcdx-grc-step6a3-c04w-publication-operator', 'tcdx-grc-step6a3-c04w-lifecycle-operator', 'tcdx-grc-step6a3-initial-source-operator']
    source = (ROOT / 'scripts/phase6a3/qa-iam-publication-runtime.py').read_text()
    for name in names:
        filename = 'operator-' + name + SUFFIX + '.json'
        if (C / filename).exists():
            assert read(C / filename)['ready']
            continue
        locate = "import json,subprocess\nd=json.loads(subprocess.check_output(['docker','inspect'," + repr(name) + "],text=True))[0]\nprint(next(m['Source'] for m in d['Mounts'] if m['Destination']=='/run/config/step6a3-iam'))\n"
        config = ssh(HOSTS['backend'], 'python3 -', locate)
        assert config.startswith('/home/tecdex/.config/tcdx-grc/')
        env = {'TCDX_QA_OPERATOR_NAME': name, 'TCDX_QA_OPERATOR_REPLACE': 'integrated-qa-release-20261022'+SUFFIX, 'TCDX_LIBRARY_RELEASE_HOST_DIRECTORY': REMOTE,
               'TCDX_LIBRARY_PUBLICATION_ROOT': '/run/config/library-release/source', 'TCDX_LIBRARY_PUBLICATION_INPUT_FILE': '/run/config/library-release/publication-input.json', 'TCDX_LIBRARY_PUBLICATION_INPUT_SHA256': staged['publication_input_sha256']}
        command = ' '.join(k + '=' + shlex.quote(v) for k, v in env.items()) + ' python3 - ' + shlex.quote(info['image_id']) + ' ' + shlex.quote(info['source_archive_sha256']) + ' ' + shlex.quote(config)
        receipt = json.loads(ssh(HOSTS['backend'], command, source))
        save(filename, receipt)
        print(json.dumps({'operator': name, 'ready': receipt['ready'], 'library_configured': receipt['library_configured']}), flush=True)
elif mode in ['activate', 'replay']:
    assert read(C / 'BACKUP.json')['status'] == 'PASS_VERIFIED_RECOVERABLE'
    assert read(C / ('promote-backend'+SUFFIX+'.json'))['status'] == 'PASS_QA'
    name = 'tcdx-grc-step6a3-publication-operator'
    assert read(C / ('operator-' + name + SUFFIX + '.json'))['ready']
    command = 'docker exec ' + shlex.quote(name) + ' node apps/backend/dist/security/iam-publication-operator-cli.js /run/tcdx-operator/catalog.sock iam.library.publish'
    receipt = json.loads(ssh(HOSTS['backend'], command))
    assert receipt['bindings'] == 13 and receipt['definitions'] == 4 and receipt['permissions'] == 8
    if mode == 'replay': assert receipt['created'] == receipt['audited'] == 0
    save('library-' + mode + SUFFIX + '.json', receipt)
    print(json.dumps(receipt))
else: raise SystemExit('transport COMPONENT | stage | preflight COMPONENT | promote COMPONENT | operators | activate | replay')
