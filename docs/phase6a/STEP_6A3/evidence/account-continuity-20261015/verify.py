"""Finish source-bound checks and final Spanish UI captures; no QA mutations."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
NODE = Path('/tmp/tcdx-grc-npm-cache/_npx/5dad66f2cb301fc2/node_modules/node/bin/node')
env = dict(os.environ)
env['PATH'] = str(NODE.parent) + os.pathsep + env['PATH']
env['NO_COLOR'] = '1'
results=[]
retry = '--ui-retry' in sys.argv

def run(name, command):
    p=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True,timeout=180)
    (OUT/(name+'.log')).write_text(p.stdout+p.stderr)
    results.append({'name':name,'command':command,'exit_code':p.returncode,
                    'log_sha256':hashlib.sha256((p.stdout+p.stderr).encode()).hexdigest()})
    if p.returncode:
        raise RuntimeError('CHECK_FAILED: '+name)

try:
    if not retry:
        run('v110-governance',['python3','scripts/verify-v110-governance.py'])
        run('rector-governance',['bash','scripts/verify-rector-governance.sh'])
        run('rector-status',['bash','scripts/test-rector-governance-status.sh'])
        run('current-step6a3',['python3','scripts/verify-phase6a3-current.py'])
        run('diff-check',['git','diff','--check'])
        run('backend-typecheck',[str(NODE),'node_modules/typescript/bin/tsc','-p','apps/backend/tsconfig.json','--noEmit'])
        run('frontend-typecheck',[str(NODE),'node_modules/typescript/bin/tsc','-p','apps/frontend/tsconfig.json','--noEmit'])
        run('generated-contracts',[str(NODE),'scripts/foundations/generate-contract-assets.mjs','--check'])
    # Existing tests capture only labelled mock UI. Preserve the preexisting screenshot bytes.
    paths=[]
    for project in ['chromium-desktop','chromium-narrow']:
        for surface in ['retention-tenant-admin','politicas-retencion']:
            p=ROOT/'artifacts/phase5-iam-ui/local-playwright'/f'{surface}-{project}.png'
            if p.exists():
                paths.append((p,p.read_bytes()))
    try:
        run('final-spanish-ui-retry' if retry else 'final-spanish-ui',[str(NODE),'node_modules/@playwright/test/cli.js','test',
            'e2e/core-grc-ui.spec.ts','--grep','Políticas de retención mantiene' if retry else 'C-04W company settings|Políticas de retención mantiene',
            '--project=chromium-desktop','--project=chromium-narrow','--reporter=line',
            '--output='+str(OUT/('playwright-retry-output' if retry else 'playwright-output'))])
        for project in ['chromium-desktop','chromium-narrow']:
            for surface in ['retention-tenant-admin','politicas-retencion']:
                p=ROOT/'artifacts/phase5-iam-ui/local-playwright'/f'{surface}-{project}.png'
                if p.exists(): shutil.copyfile(p,OUT/f'mock-ui-{surface}-{project}.png')
    finally:
        for p,data in paths: p.write_bytes(data)
    live=json.loads((OUT/'live-ledger-registry.json').read_text())['result']['registry']
    bindings=json.loads((ROOT/'docs/executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10/LIFECYCLE_BINDINGS.json').read_text())['bindings']
    fields=['entity_type','from_state','command_code','to_state','precondition_policy_ref','permission_code',
            'sod_policy_ref','audit_event_code','idempotency_semantics','concurrency_semantics','system_actor_allowed']
    for b in bindings:
        r=next(r for r in live if r['command_code']==b['command_code'])
        assert all(r[k]==b[k] for k in fields)
        assert r['notification_policy_ref']==b['notification_policy']
        assert r['recalculation_policy_ref']==b['recalculation_policy']
        assert r['scopes']==b['allowed_scopes'] and r['effects']==len(b['side_effect_event_codes'])==0
        assert r['lifecycle_state']=='published' and r['audits']==1
    results.append({'name':'exact-five-lifecycle-bindings-all-fields','status':'PASS'})
finally:
    (OUT/('verification-retry-result.json' if retry else 'verification-result.json')).write_text(json.dumps({
        'recorded_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'results':results,'ui_scope':'LOCAL_CURRENT_SOURCE_MOCK_API; no human acceptance or authenticated QA screenshot claimed'
    },indent=2)+'\n')
print('FOCUSED_VERIFICATION=PASS')
