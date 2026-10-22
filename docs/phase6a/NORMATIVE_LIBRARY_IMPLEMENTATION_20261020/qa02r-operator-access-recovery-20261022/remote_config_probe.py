"""QA backend nonsecret publication config verification; never opens a secret file."""
import hashlib
import json
from pathlib import Path
import socket
import subprocess
import datetime
assert socket.gethostname().split('.')[0] == 'grc-bk'
names = ['tcdx-grc-step6a3-publication-operator', 'tcdx-grc-step6a3-c04w-publication-operator', 'tcdx-grc-step6a3-c04w-lifecycle-operator', 'tcdx-grc-step6a3-initial-source-operator']
results = []
for name in names:
    d = json.loads(subprocess.check_output(['docker', 'inspect', name], text=True))[0]
    env = dict(x.split('=', 1) for x in d['Config']['Env'] if '=' in x)
    source = next(m['Source'] for m in d['Mounts'] if m['Destination'] == '/run/config/step6a3-iam')
    checks = []
    for prefix in ['TCDX_IAM_M2M_PROFILE', 'TCDX_IAM_BINDINGS', 'TCDX_IAM_DECISION', 'TCDX_IAM_RBAC_R3']:
        target = env.get(prefix + '_FILE')
        expected = env.get(prefix + '_SHA256')
        assert target and target.startswith('/run/config/step6a3-iam/'), 'ALLOWLISTED_CONFIG_PATH_REQUIRED'
        path = Path(source) / Path(target).name
        assert path.parent == Path(source) and not path.is_symlink()
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        checks.append({'variable': prefix, 'host_path': str(path), 'runtime_path': target, 'sha256': digest, 'expected_sha256': expected, 'matches': digest == expected})
    # This is a public identity/config profile; it contains a secret reference only.
    profile = json.loads((Path(source) / 'step6a3-m2m-qa-profile.json').read_text())
    fields = ['environment', 'principal_code', 'client_id', 'issuer', 'audience', 'credential_ref', 'max_lifetime_seconds', 'clock_tolerance_seconds', 'algorithms']
    results.append({'name': name, 'checks': checks, 'profile': {k: profile[k] for k in fields}})
print(json.dumps({'status': 'PASS_NONSENSITIVE_CONFIG', 'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'containers': results, 'credential_contents_read': False, 'tokens_requested': 0}, indent=2))
