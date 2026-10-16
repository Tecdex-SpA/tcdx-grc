"""Read-only QA reconciliation; writes new local evidence only. No tokens or environment dumps."""
from pathlib import Path
import concurrent.futures
import datetime
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def save(name, value):
    path = OUT / name
    if path.exists():
        return  # Preserve evidence from a partially completed collection.
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')

def ssh(host, command, source=None):
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
                             'tecdex@' + host, command], input=source,
                            capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError('QA_READ_FAILED: ' + host)
    return result.stdout

def runtime(kind, host, directory, receipts):
    source = '''import json,subprocess,datetime,hashlib,re
from pathlib import Path
kind=KIND
def run(args):
 return subprocess.run(args,capture_output=True,text=True,check=True).stdout
x=json.loads(run(['docker','inspect','tcdx-grc-'+kind]))[0]
im=json.loads(run(['docker','image','inspect',x['Image']]))[0]
allc=[json.loads(v) for v in run(['docker','ps','-a','--format','{{json .}}']).splitlines()]
logs=subprocess.run(['docker','logs','--since',x['State']['StartedAt'],'tcdx-grc-'+kind],capture_output=True,text=True,check=True)
logtext=logs.stdout+'\\n'+logs.stderr
root=Path(DIRECTORY)
result={'observed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kind':kind,
 'image_id':x['Image'],'container_id':x['Id'],'running':x['State']['Running'],
 'health':x['State'].get('Health',{}).get('Status'),'restart_count':x['RestartCount'],
 'started_at':x['State']['StartedAt'],'source_sha256':im['Config'].get('Labels',{}).get('tcdx.source.sha256'),
 'architecture':im['Architecture'],'os':im['Os'],
 'log_counts':{'fatal':len(re.findall(r'(?i)fatal|uncaught',logtext)),
  'sql_errors':len(re.findall(r'(?i)SQLSTATE|query failed|database error',logtext)),
  'http_5xx':len(re.findall(r'"status(?:Code)?":\\s*5\\d\\d',logtext))},
 'rollback_containers':[{'name':v['Names'],'image':v['Image'],'state':v['State']} for v in allc if v['Names'].startswith('tcdx-grc-'+kind+'-rollback-')],
 'receipts':[]}
for name in RECEIPTS:
 data=(root/name).read_bytes()
 result['receipts'].append({'remote_path':str(root/name),'sha256':hashlib.sha256(data).hexdigest(),'content':json.loads(data)})
print(json.dumps(result))
'''.replace('KIND', repr(kind)).replace('DIRECTORY', repr(directory)).replace('RECEIPTS', repr(receipts))
    return json.loads(ssh(host, 'python3 -', source))

def probe(name):
    source = Path('/tmp/' + name + '.mjs').read_text()
    save(name + '.probe-source.json', {'provenance':'RECOVERED_LOCAL_PROBE',
         'source_path':'/tmp/' + name + '.mjs','sha256':sha(source.encode()),'source':source})
    return json.loads(ssh('192.168.2.45',
        'docker exec -i -w /app/apps/backend tcdx-grc-backend node --input-type=module', source))

def main():
    assert ROOT.name == 'tcdx-grc-step6a3-prep-20261015'
    start = subprocess.run(['git','status','--porcelain=v1'],cwd=ROOT,capture_output=True,text=True,check=True).stdout
    save('git-before.json', {'observed_at_utc':NOW,'status':start,
        'branch':subprocess.run(['git','branch','--show-current'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.strip(),
        'head':subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.strip()})
    manifest_path = ROOT/'docs/executable-contracts/amendments/STEP_6A3_C04W_CFGD_v1.10/PUBLICATION_MANIFEST.json'
    manifest = json.loads(manifest_path.read_text())
    checks=[]
    for entry in manifest['files']:
        for field in ['source','successor_path','active_projection']:
            if field in entry:
                p=ROOT/entry[field]
                checks.append({'path':entry[field],'sha256':sha(p.read_bytes()),'expected':entry['sha256'],'pass':sha(p.read_bytes())==entry['sha256']})
    for entry in manifest['human_decisions']+manifest['dependencies']:
        p=ROOT/entry['path']
        checks.append({'path':entry['path'],'sha256':sha(p.read_bytes()),'expected':entry['sha256'],'pass':sha(p.read_bytes())==entry['sha256']})
    p=ROOT/'docs/executable-contracts/27_PHASE5_METHODOLOGY_BINDING.md'
    checks.append({'path':str(p.relative_to(ROOT)),'sha256':sha(p.read_bytes()),'pass':sha(p.read_bytes())=='eedf85debfb5eb48e25d4abdd5ff4332c5dba8197ab7b96a66b97f640cfef4df'})
    assert all(c['pass'] for c in checks)
    save('authority-integrity.json',{'observed_at_utc':NOW,'status':'PASS','publication_manifest_sha256':sha(manifest_path.read_bytes()),'checks':checks})
    recovered=[]
    for name in ['step6a3-c04w-qa-proof.json','step6a3-cfgd-qa-proof.json',
                 'step6a3-final-backend-source-manifest.json','step6a3-final-frontend-source-manifest.json',
                 'step6a3-c04w-before-registry.json','step6a3-c04w-after-registry.json',
                 'step6a3-c04w-ui-release-gate.json','step6a3-final-live.json',
                 'step6a3-final-qa-schema.log','step6a3-final-preflight-tests.log',
                 'c04w-lifecycle-pg.log','c04w-publication-tests.log','c04w-operator-impact.log',
                 'step6a3-final-tests.log','step6a3-final-pg.log','step6a3-final-contracts-verify.log']:
        p=Path('/tmp')/name
        data=p.read_bytes()
        if not (OUT/('recovered-'+name)).exists():
            (OUT/('recovered-'+name)).write_bytes(data)
        recovered.append({'source':str(p),'file':'recovered-'+name,'sha256':sha(data),
                          'mtime_utc':datetime.datetime.fromtimestamp(p.stat().st_mtime,datetime.timezone.utc).isoformat(),
                          'provenance':'RECOVERED_PREVIOUS_SESSION_FILE; unsigned, not a new execution'})
    log=Path('/Users/andresbarouh/Downloads/incompleta15b.txt')
    save('recovery-index.json',{'recovered_at_utc':NOW,'files':recovered,'partial_session_log':{
         'source':str(log),'sha256':sha(log.read_bytes()),'terminal_line':log.read_text().splitlines()[-1],
         'provenance':'PARTIAL_SESSION_LOG_NOT_FINAL_ACT; browser screenshot/denial reports require separate corroboration'}})
    directory='/home/tecdex/.config/tcdx-grc/'
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={
          'backend-runtime':pool.submit(runtime,'backend','192.168.2.45',directory+'step6a3-iam-m2m-20261014',[
             'backend-activation-step6a3-c04w-cfgd-final-20261015.json','operator-c04w-runtime-evidence.json',
             'release-gate.json','physical_publication.json','executable_publication.json']),
          'frontend-runtime':pool.submit(runtime,'frontend','192.168.2.46',directory+'step6a3-c04w-final-20261015',[
             'frontend-activation-step6a3-c04w-cfgd-final-20261015.json',
             'frontend-activation-step6a3-c04w-cfgd-ui-es-20261015.json','release-gate.json']),
          'live-ledger-registry':pool.submit(probe,'step6a3-final-live'),
          'live-c04w':pool.submit(probe,'step6a3-c04w-qa-proof'),
          'live-cfgd':pool.submit(probe,'step6a3-cfgd-qa-proof'),
          'live-commercial-preservation':pool.submit(probe,'step6a3-qa-state')}
        results={}
        for key,job in jobs.items():
            results[key]=job.result()
            save(key+'.json',{'provenance':'LIVE_QA_READ_ONLY','collected_at_utc':NOW,'result':results[key]})
    expected={'backend':('sha256:474e525a3e6b2bcc067dda7a77039b36f2832ca37d138b1424a700644560fc6d','879942f159f61a607712fe4c7ba79668343f008285e43a37129159fae821a58e'),
              'frontend':('sha256:552ff3e9412cb1c78bfa3400c26c8835c6a2bfa09a6db1dc72ef18b8a2712eeb','bac88a14e73d95ed258cd4e3c9a615dce5ec42c7352241b5239fec7e16d45821')}
    parity=[]
    for kind,(image,source) in expected.items():
        r=results[kind+'-runtime']
        assert r['image_id']==image and r['source_sha256']==source and r['health']=='healthy' and r['restart_count']==0
        m=json.loads((OUT/('recovered-step6a3-final-'+kind+'-source-manifest.json')).read_text())
        differences=[v['path'] for v in m['files'] if not (ROOT/v['path']).is_file() or sha((ROOT/v['path']).read_bytes())!=v['sha256']]
        parity.append({'kind':kind,'image_id':image,'source_sha256':source,'files_compared':len(m['files']),'differences':differences})
    assert not any(p['differences'] for p in parity)
    save('source-parity.json',{'status':'PASS_LOCAL_BYTES_MATCH_RECOVERED_IMAGE_INPUT_MANIFEST_AND_LIVE_IMAGE_LABEL','checks':parity,
         'limitation':'Build input manifest and image label are not a signed build attestation. No rebuild performed.'})
    live=results['live-ledger-registry']
    manifest=json.loads((ROOT/'database/migrations/manifest.json').read_text())['migrations']
    assert live['migrations']==[{'migration_id':e['id'],'filename':e['filename'],'content_sha256':e['sha256'],'outcome':'applied'} for e in manifest]
    assert len(live['registry'])==5 and all(e['audits']==1 and e['scopes']==['tenant'] and e['effects']==0 for e in live['registry'])
    before=json.loads((OUT/'recovered-step6a3-c04w-after-registry.json').read_text())
    assert results['live-commercial-preservation']['fingerprints']==before['fingerprints']
    assert results['live-c04w']['applicabilities']==json.loads((OUT/'recovered-step6a3-c04w-qa-proof.json').read_text())['applicabilities']
    assert results['live-cfgd']['assessments']==json.loads((OUT/'recovered-step6a3-cfgd-qa-proof.json').read_text())['assessments']
    save('reconciliation-result.json',{'observed_at_utc':NOW,'status':'PASS_READ_ONLY_RECONCILIATION',
        'ledger':'PASS_34_EXACT','registry':'PASS_5_AUDITED_TENANT_ROWS','history':'PASS_PRESERVED',
        'commercial_fingerprints':'PASS_UNCHANGED','contract_publication':'PASS_CONTRACT_EFFECTIVE',
        'STEP_6A3':'PARTIAL_BLOCKED','RECTOR_GATE':'BLOCKED','STEP_6A4':'NOT_STARTED',
        'not_proven':['Authentic legal source','Independent legal reviewer act','Human QA/UI acceptance',
                      'Screenshots from previous computer session are not available as local image receipts',
                      'Previous browser SoD DENY is session-log evidence, not a saved HTTP receipt']})
    print('PASS_READ_ONLY_RECONCILIATION')

def supplement():
    code = '''import subprocess,json,datetime
p=subprocess.run(['docker','logs','--since','2026-10-15T19:50:00Z','tcdx-grc-backend'],capture_output=True,text=True,check=True)
requests={};results=[]
for line in (p.stdout+'\\n'+p.stderr).splitlines():
 try: v=json.loads(line)
 except ValueError: continue
 request=v.get('req',{});rid=v.get('reqId');url=request.get('url','').split('?')[0]
 if '/retention-policy-applicabilities' in url or '/control-assessments' in url:
  requests[rid]={'method':request.get('method'),'path':url,'request_id':rid}
 status=v.get('res',{}).get('statusCode')
 if rid in requests and isinstance(status,int):
  results.append({**requests[rid],'http_status':status,'log_time':v.get('time')})
print(json.dumps({'observed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'provenance':'LIVE_QA_FILTERED_HTTP_LOGS; no tokens, headers, bodies or actor inference',
 'responses':results,'limitation':'403 proves denial, not a particular SoD policy cause without a correlated body or domain audit'}))
'''
    save('qa-http-log-corroboration.json',json.loads(ssh('192.168.2.45','python3 -',code)))
    checks=[]
    for path in ['/', '/api/v1/retention-policy-applicabilities', '/api/v1/control-assessments']:
        p=subprocess.run(['curl','--silent','--show-error','--max-time','20','--output','/dev/null',
                          '--write-out','%{http_code}', 'https://grc.tecdex.net'+path],capture_output=True,text=True,timeout=25)
        checks.append({'path':path,'method':'GET','http_status':p.stdout,'exit_code':p.returncode})
    save('public-http-now.json',{'observed_at_utc':NOW,'provenance':'LIVE_PUBLIC_HTTPS_NO_AUTHENTICATION',
         'checks':checks,'authentication':'NOT_ATTEMPTED'})
    print('SUPPLEMENT_READ_ONLY=PASS')

if __name__=='__main__':
    supplement() if '--supplement' in sys.argv else main()
