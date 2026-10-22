#!/usr/bin/env python3
"""Release custody and classification wrapper over existing checks/build/promoters.

No credentials are stored here. Technical receipts stay in ignored local custody;
the four-file release dossier records only reviewed public outcomes/hashes.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
CUSTODY = ROOT / '.release-custody/integrated-qa-release-20261022'
NODE = Path('/Users/andresbarouh/.npm/_npx/5dad66f2cb301fc2/node_modules/node/bin/node')
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
def save(name, data):
    CUSTODY.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (CUSTODY / name).open('x') as f: f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
def environment():
    env = dict(os.environ)
    assert subprocess.check_output([str(NODE), '--version'], text=True).strip() == 'v22.23.2'
    env['PATH'] = str(NODE.parent) + os.pathsep + env.get('PATH', '')
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    return env
def inventory(name='inventory'):
    CUSTODY.mkdir(mode=0o700, parents=True, exist_ok=True)
    assert not (ROOT / '.git/index.lock').exists()
    status = subprocess.check_output(['git', 'status', '--porcelain=v1', '-uall', '-z'], cwd=ROOT).decode().split('\0')
    changed = {line[3:]: line[:2] for line in status if line}
    # Include sealed test/evidence logs even when globally ignored; these are
    # reviewed evidence, not transient process logs. Never include private custody.
    sealed = set()
    for manifest in (ROOT / 'docs/phase6a').rglob('FILE_MANIFEST.json'):
        try: content = json.loads(manifest.read_text())
        except (ValueError, UnicodeError): continue
        entries = content.get('files', [])
        if isinstance(entries, list):
            for row in entries:
                if isinstance(row, dict) and isinstance(row.get('path'), str): sealed.add(row['path'])
        for row in content.get('created', []):
            if isinstance(row, dict) and isinstance(row.get('path'), str): sealed.add(row['path'])
    for path in sorted(sealed):
        p = ROOT / path
        if p.is_file() and path.endswith('.log') and not subprocess.run(['git', 'ls-files', '--error-unmatch', path], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
            changed.setdefault(path, '!!')
    rows = []
    for path, status in sorted(changed.items()):
        p = ROOT / path
        private = path.startswith(('.continuity-preservation/', '.release-custody/')) or '__pycache__' in p.parts or p.suffix == '.pyc' or '.private.' in path or path.endswith(('.pgdump', '.dump', '.tar', '.tar.gz'))
        if private: category, group = 'F_PRIVATE_OR_TEMPORARY', None
        elif path.startswith(('database/', 'packages/contracts/', 'docs/executable-contracts/', 'docs/physical-data-model/', 'docs/governance/amendments/NORMATIVE_LIBRARY_', 'docs/normative-sources/incoming/', 'docs/phase6a/NORMATIVE_')) and '/integrated-qa-release-20261022/' not in path:
            category, group = ('C_MIGRATIONS' if path.startswith('database/migrations/') else 'B_CONTRACTS_AUTHORITY_AND_EVIDENCE'), 'contracts'
        elif path.startswith('scripts/foundations/'):
            category, group = 'B_CANONICAL_GENERATORS_AND_CHECKS', 'contracts'
        elif path.startswith('apps/backend/'):
            category, group = ('D_TESTS' if '.test.' in path else 'A_BACKEND_FUNCTIONAL'), 'backend'
        elif path.startswith(('apps/frontend/', 'e2e/')):
            category, group = ('D_TESTS' if '.test.' in path or path.startswith('e2e/') else 'A_FRONTEND_FUNCTIONAL'), 'frontend'
        else:
            category, group = 'E_OPERATIONS_GOVERNANCE_AND_APPROVED_EVIDENCE', 'operations'
        rows.append({'path': path, 'status': status, 'category': category, 'commit_group': group, 'bytes': p.stat().st_size if p.is_file() else 0, 'sha256': sha(p) if p.is_file() else None})
    result = {'utc': now(), 'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'), 'index': git('diff', '--cached', '--raw'), 'rows': rows,
              'counts': {key: sum(r['commit_group'] == key for r in rows) for key in ['contracts', 'backend', 'frontend', 'operations', None]}}
    save(name+'.json', result)
    for group in ['contracts', 'backend', 'frontend', 'operations']:
        (CUSTODY / (group + '.pathspec')).write_bytes(b''.join((r['path'] + '\0').encode() for r in rows if r['commit_group'] == group))
    print(json.dumps({'inventory': 'COMPLETE_CLASSIFIED', 'counts': result['counts'], 'bytes': sum(r['bytes'] for r in rows), 'largest': sorted([{'path': r['path'], 'bytes': r['bytes']} for r in rows], key=lambda r: r['bytes'], reverse=True)[:6]}))
def check(name, args):
    assert name.replace('-', '').replace('_', '').isalnum()
    assert not (CUSTODY / (name + '.json')).exists()
    start = now()
    with (CUSTODY / (name + '.log')).open('x') as log:
        p = subprocess.run(args, cwd=ROOT, env=environment(), stdout=log, stderr=subprocess.STDOUT)
    result = {'started_utc': start, 'finished_utc': now(), 'command': args, 'exit_code': p.returncode, 'log_sha256': sha(CUSTODY / (name + '.log'))}
    # A test reporter may itself produce NAME.json during execution.
    save(name + ('-command.json' if (CUSTODY / (name + '.json')).exists() else '.json'), result)
    print(json.dumps(result))
    sys.exit(p.returncode)
if __name__ == '__main__':
    if sys.argv[1] == 'inventory': inventory(sys.argv[2] if len(sys.argv)>2 else 'inventory')
    elif sys.argv[1] == 'check': check(sys.argv[2], sys.argv[3:])
    elif sys.argv[1] == 'database':
        mode=sys.argv[2]
        assert mode in ['PRE','PRE_RETRY','POST','BACKUP','schema']
        spec=importlib.util.spec_from_file_location('qa_release_env',ROOT/'docs/phase6a/NORMATIVE_LIBRARY_IMPLEMENTATION_20261020/qa01-migration36-adoption-20261022/operator.py')
        prior=importlib.util.module_from_spec(spec)
        sys.dont_write_bytecode=True
        spec.loader.exec_module(prior)
        env=prior.env(False)
        env['PGOPTIONS']=env['PGOPTIONS'].replace('grc_qa01_migration36','grc_integrated_qa_release_readonly')
        args=[str(NODE),'--experimental-strip-types','scripts/foundations/verify-schema.ts'] if mode=='schema' else [str(NODE),'--experimental-strip-types','scripts/normative-library/qa-release-database.mts',mode]
        p=subprocess.run(args,cwd=ROOT,env=env,capture_output=True,text=True,timeout=300)
        save('database-'+mode+'-command.json',{'exit_code':p.returncode,'stdout':p.stdout if p.returncode==0 else 'FAILED_DIAGNOSTIC_REDACTED','started_mode':mode})
        print(p.stdout if p.returncode==0 else 'DATABASE_CHECK_FAILED')
        sys.exit(p.returncode)
    elif sys.argv[1] == 'image':
        component=sys.argv[2]
        assert component in ['backend','frontend']
        assert git('status','--porcelain')==''
        revision=git('rev-parse','HEAD')
        archive=CUSTODY/('source-'+revision+'.tar')
        if not archive.exists(): subprocess.run(['git','archive','--format=tar','--output',str(archive),revision],cwd=ROOT,check=True)
        source_hash=sha(archive)
        tag='tcdx-grc-'+component+':integrated-qa-20261022'
        args=['docker','build','--platform','linux/amd64','--label','org.opencontainers.image.revision='+revision,'--label','tcdx.source.sha256='+source_hash,'-f','apps/'+component+'/Dockerfile','-t',tag,'.']
        start=now()
        build_name=component+('-'+sys.argv[3] if len(sys.argv)>3 else '')
        with (CUSTODY/('image-'+build_name+'.log')).open('x') as log: p=subprocess.run(args,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
        if p.returncode: print('IMAGE_BUILD_FAILED_'+component);sys.exit(p.returncode)
        info=json.loads(subprocess.check_output(['docker','image','inspect',tag],text=True))[0]
        assert info['Architecture']=='amd64' and info['Config']['Labels']['org.opencontainers.image.revision']==revision
        save('image-'+build_name+'.json',{'source_commit':revision,'source_archive_sha256':source_hash,'source_archive':str(archive),'image_id':info['Id'],'tag':tag,'started_utc':start,'finished_utc':now(),'architecture':'amd64','build_exit_code':0})
        print(json.dumps({'component':component,'image_id':info['Id'],'source_commit':revision}))
    else: raise SystemExit('inventory | check NAME COMMAND...')
