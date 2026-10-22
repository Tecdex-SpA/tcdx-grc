"""Persist only the configured session bounds in the existing QA deployment file."""
import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[2]
policy=json.loads((root/'deploy/qa/session-duration.json').read_text())
assert policy['environment']=='qa'
script=r"""import json,pathlib,os,subprocess
policy=POLICY
container=json.loads(subprocess.check_output(['docker','inspect','tcdx-grc-backend']))[0]
env=dict(value.split('=',1) for value in container['Config']['Env'])
assert env['NODE_ENV']=='qa'
keys=['APP_SESSION_IDLE_SECONDS','APP_SESSION_MAX_SECONDS']
assert all(env[key]==str(policy[key]) for key in keys)
path=pathlib.Path.home()/'apps/tcdx-grc/deploy/qa/.env'
assert path.is_file() and not path.is_symlink() and path.stat().st_mode & 0o077 == 0
original=path.read_text()
backup=path.with_name('.env.before-session-duration-20261019')
if not backup.exists():
 fd=os.open(backup,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:f.write(original)
lines=[line for line in original.splitlines() if line.split('=',1)[0] not in keys]
lines.extend(key+'='+str(policy[key]) for key in keys)
path.write_text('\n'.join(lines)+'\n')
config=path.with_name('session-duration.json')
config.write_text(json.dumps(policy,indent=2)+'\n')
print(json.dumps({'status':'PASS','environment':'qa','keys':keys,'other_configuration_preserved':True,'secret_values_printed':False}))
""".replace('POLICY',repr(policy))
r=subprocess.run(['ssh','tecdex@192.168.2.45','python3 -'],input=script,capture_output=True,text=True)
if r.returncode:raise RuntimeError('QA_POLICY_PERSISTENCE_FAILED')
print(r.stdout)
(root/'docs/phase6a/STEP_6A3/evidence/session-duration-20261019/persistent-policy.json').write_text(r.stdout)
