import pathlib, subprocess, json, hashlib, datetime, csv, re, sys, urllib.request
R=pathlib.Path('/Users/andresbarouh/repos/tcdx-grc')
O=R/'docs/phase6a/STEP_6A4/INTEGRAL_QA_CLOSEOUT_20261020'
E=O/'evidence'
OLD=R/'docs/phase6a/STEP_6A4/evidence/qa-20261020'
COR=R/'docs/phase6a/STEP_6A4/REFERENCE_CORRECTION_20261020/evidence'
TAG='tcdx-grc-frontend:step6a4-integral-p3-p5-20261020'
ROLL='tcdx-grc-frontend-rollback-step6a4-integral-p3-p5-20261020'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(n,v): (E/n).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
def read(n):return json.loads((E/n).read_text())
def run(a,**kw):return subprocess.check_output(a,cwd=R,text=True,**kw)
def check(n,a):
 p=subprocess.run(a,cwd=R,text=True,capture_output=True);(E/(n+'.log')).write_text(p.stdout+p.stderr)
 save(n+'.json',{'command':a,'exit_code':p.returncode,'time':now()});assert p.returncode==0,n
def snap():
 paths=run(['git','ls-files','--cached','--others','--exclude-standard','-z']).split('\0')
 return {p:sha(R/p) for p in paths if p and (R/p).is_file() and not p.startswith(str(O.relative_to(R))+'/')}
REMOTE='''import subprocess,json,hashlib
c=json.loads(subprocess.check_output(['docker','inspect',NAME]))[0]
i=json.loads(subprocess.check_output(['docker','image','inspect',c['Image']]))[0]
conf={k:c[k] for k in ['Config','HostConfig']}
print(json.dumps({'container_id':c['Id'],'image_id':c['Image'],'repo_digests':i.get('RepoDigests',[]),'architecture':i['Architecture'],'os':i['Os'],'started_at':c['State']['StartedAt'],'running':c['State']['Running'],'health':c['State'].get('Health',{}).get('Status'),'restart_count':c['RestartCount'],'qa_environment':'NODE_ENV=qa' in c['Config']['Env'],'privileged':c['HostConfig']['Privileged'],'mounts_count':len(c['Mounts']),'configuration_sha256':hashlib.sha256(json.dumps(conf,sort_keys=True).encode()).hexdigest()}))
'''
def runtime(name,host):return json.loads(run(['ssh','-o','BatchMode=yes','tecdex@'+host,'python3 -'],input='NAME='+repr(name)+'\n'+REMOTE))
def inputs():
 files=[]
 for base in ['apps/frontend','packages/contracts','packages/shared-types','docs/ui/assets/brand']:
  for p in (R/base).rglob('*'):
   if p.is_file() and not any(x in p.parts for x in ['node_modules','dist','coverage']) and not p.name.endswith(('.log','.tsbuildinfo')) and not p.name.startswith('.env'):files.append(p)
 files += [R/p for p in ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.base.json','.dockerignore']]
 return {str(p.relative_to(R)):sha(p) for p in sorted(files)}
def preservation():
 before=read('workspace-entry.json');current=snap();changed=[p for p,h in before.items() if current.get(p)!=h]
 authorized=[]
 status='docs/governance/MASTER_EXECUTION_STATUS.md'
 if status in changed:
  text=(R/status).read_text();marker='\n\n## STEP6A4 — despliegue integral QA P3/P5 y preparación de cierre, 2026-10-20\n'
  assert text.count(marker)==1 and hashlib.sha256(text.split(marker)[0].encode()).hexdigest()==before[status]
  changed.remove(status);authorized.append(status)
 b=read('git-entry.json');g={'branch':run(['git','branch','--show-current']).strip(),'head':run(['git','rev-parse','HEAD']).strip(),'index_sha256':hashlib.sha256(run(['git','diff','--cached','--binary']).encode()).hexdigest()}
 assert not changed,changed
 assert all(g[k]==b[k] for k in g),'GIT_CHANGED'
 save('preservation.json',{'status':'PASS','entry_files_preserved':len(before)-len(authorized),'authorized_append_only':authorized,'changed_preexisting':changed,'git':g,'all_new_paths':[p for p in current if p not in before],'time':now()})
def main(mode):
 if mode=='entry':
  if not O.exists():
   E.mkdir(parents=True)
   save('workspace-entry.json',snap());save('git-entry.json',{'branch':run(['git','branch','--show-current']).strip(),'head':run(['git','rev-parse','HEAD']).strip(),'index_sha256':hashlib.sha256(run(['git','diff','--cached','--binary']).encode()).hexdigest(),'status':run(['git','status','--short']),'time':now()})
  else:preservation()
  check('rector-pre',['bash','scripts/verify-rector-governance.sh'])
  checks=[]
  for manifest in [COR/'ARTIFACT_SHA256.json']:
   for p,h in json.loads(manifest.read_text()).items():assert sha(R/p)==h,p;checks.append(p)
  for manifest in [R/'docs/phase6a/STEP_6A4/evidence/local-20261020/SHA256SUMS.txt',OLD/'SHA256SUMS.txt']:
   for line in manifest.read_text().splitlines():
    h,p=line.split(None,1);p=p.strip().lstrip('*')
    if sha(R/p)!=h:
     assert p in json.loads((COR/'ARTIFACT_SHA256.json').read_text()),p
     if p=='docs/governance/MASTER_EXECUTION_STATUS.md':
      before=(R/p).read_text().split('\n\n## STEP6A4 — corrección focalizada de referencias P3/P5, 2026-10-20\n')[0]
      assert hashlib.sha256(before.encode()).hexdigest()==h,p
     else:assert sha(COR/'entry-sources'/p)==h,p
    checks.append(p)
  sources=inputs();save('build-source-sha256.json',sources)
  old=json.loads((OLD/'build-source-sha256.json').read_text());delta={p:('NEW' if p not in old else 'MODIFIED') for p,h in sources.items() if old.get(p)!=h}
  allowed={'apps/frontend/src/business-origin-fields.tsx','apps/frontend/src/business-origin-fields.test.tsx','apps/frontend/src/business-form-fields.tsx','apps/frontend/src/business-forms.ts','apps/frontend/src/core-grc.tsx'}
  assert set(delta)<=allowed,delta;assert not set(old)-set(sources)
  assert not [p for p in sources if b'grc.tecdx.net' in (R/p).read_bytes()]
  forms=list(csv.DictReader((R/'docs/phase6a/STEP_6A4/FORM_INVENTORY.csv').open()));refs=list(csv.DictReader((R/'docs/phase6a/STEP_6A4/REFERENCE_INVENTORY.csv').open()))
  assert len(forms)==42 and len({x['FORM_ID'] for x in forms})==42 and len(refs)==95
  save('source-review.json',{'status':'PASS','delta_from_previous_qa':delta,'sealed_hashes_verified':len(checks),'forms':42,'references':95,'build_excludes_backend':'Dockerfile COPY frontend/contracts/shared-types/brand only','baseline':(R/'docs/rector/BASELINE_ID').read_text().strip(),'time':now()})
 elif mode=='preflight':
  preservation();assert inputs()==read('build-source-sha256.json')
  for name,host in [('frontend','192.168.2.46'),('backend','192.168.2.45')]:
   v=runtime('tcdx-grc-'+name,host);save(name+'-before.json',v);assert v['running'] and v['health']=='healthy' and v['qa_environment']
  assert read('frontend-before.json')['image_id']==json.loads((OLD/'BUILD_RESULT.json').read_text())['image_id'],'QA_IMAGE_DRIFT'
  p=(R/'scripts/phase6a4/qa-promote-frontend.py').read_text().replace('step6a4-ux-business-forms-20261020','step6a4-integral-p3-p5-20261020')
  (E/'promoter.py').write_text(p)
  v=json.loads(run(['ssh','tecdex@192.168.2.46','python3 - '+read('frontend-before.json')['image_id']+' --preflight-only'],input=p));save('runtime-preflight.json',v)
  save('PREDEPLOYMENT_GATE.json',{'PREDEPLOYMENT_GATE':'PASS','time':now(),'scope':'STEP6A4 frontend only; P3/P5 included','git_operations':'NONE','rollback_container':ROLL,'procedure':'scripts/phase6a4/qa-promote-frontend.py; only rollback/failed names adapted','authorization':'Current PO integral QA instruction; rector45/49/DR003','local_evidence':'97 tests/typecheck/lint/build verified sealed; corrective sources exact; fresh asset checks below','baseline':(R/'docs/rector/BASELINE_ID').read_text().strip()})
 elif mode=='checks':
  check('contract-assets',['node','scripts/foundations/generate-contract-assets.mjs','--check'])
  check('form-assets',['node','scripts/phase6a4/generate-form-assets.mjs','--check'])
  check('whitespace',['git','diff','--check'])
 elif mode=='build':
  assert read('PREDEPLOYMENT_GATE.json')['PREDEPLOYMENT_GATE']=='PASS';assert inputs()==read('build-source-sha256.json');preservation()
  a=['docker','build','--platform','linux/amd64','--file','apps/frontend/Dockerfile','--tag',TAG,'--iidfile',str(E/'image-id.txt'),'--label','net.tecdex.grc.slice=STEP6A4','--label','net.tecdex.grc.source-manifest-sha256='+sha(E/'build-source-sha256.json'),'--label','org.opencontainers.image.revision='+read('git-entry.json')['head'],'.']
  start=now()
  with (E/'docker-build.log').open('w') as f:p=subprocess.run(a,cwd=R,stdout=f,stderr=subprocess.STDOUT)
  save('build-attempt.json',{'command':a,'exit_code':p.returncode,'started_at':start,'ended_at':now()});assert p.returncode==0,'BUILD_FAILED'
  i=json.loads(run(['docker','image','inspect',TAG]))[0];assert i['Architecture']=='amd64' and i['Os']=='linux'
  save('BUILD_RESULT.json',{'status':'PASS','image_id':i['Id'],'repo_digests':i.get('RepoDigests',[]),'tag':TAG,'architecture':i['Architecture'],'time':now(),'source_manifest_sha256':sha(E/'build-source-sha256.json')})
 elif mode=='image':
  image=read('BUILD_RESULT.json')['image_id']
  script="const fs=require('fs');let p='/app/apps/frontend/dist';let h=fs.readFileSync(p+'/index.html','utf8');let a=h.match(/<script[^>]+src=\"([^\"]+\\.js)\"/)[1];process.stdout.write(JSON.stringify({html:h,asset:a,bundle:fs.readFileSync(p+a,'utf8')}));"
  a=json.loads(run(['docker','run','--rm','--platform','linux/amd64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',image,'node','-e',script]));bundle=a.pop('bundle').encode()
  assert b'grc.tecdx.net' not in bundle and b'https://grc.tecdex.net' in bundle
  for text in ['Tipo de origen','Selecciona un tipo de origen y un único registro de ese tipo.','evidenceRequestCreate','issueCreate']:
   assert text.encode() in bundle,repr(text)
  (E/'image-index.html').write_text(a['html']);save('image-verification.json',{'status':'PASS','image_id':image,'asset':a['asset'],'bundle_sha256':hashlib.sha256(bundle).hexdigest(),'bytes':len(bundle),'p3_p5_markers':True,'incorrect_domain':False,'time':now()})
 elif mode=='deploy':
  preservation();assert inputs()==read('build-source-sha256.json');v=read('image-verification.json');assert v['status']=='PASS';assert read('PREDEPLOYMENT_GATE.json')['PREDEPLOYMENT_GATE']=='PASS';assert not (E/'promotion.json').exists()
  assert runtime('tcdx-grc-frontend','192.168.2.46')==read('frontend-before.json'),'QA_RUNTIME_DRIFT'
  image=v['image_id'];archive=pathlib.Path('/private/tmp/step6a4-integral-p3-p5-20261020.tar');subprocess.run(['docker','save','-o',str(archive),image],check=True)
  with archive.open('rb') as f:p=subprocess.run(['ssh','tecdex@192.168.2.46','docker load'],stdin=f,capture_output=True,text=True,timeout=180)
  save('transport.json',{'exit_code':p.returncode,'output':p.stdout,'archive_sha256':sha(archive),'bytes':archive.stat().st_size,'time':now()});assert p.returncode==0
  promoter=(E/'promoter.py').read_text()
  for pre in [True,False]:
   start=now();p=subprocess.run(['ssh','tecdex@192.168.2.46','python3 - '+image+(' --preflight-only' if pre else '')],input=promoter,text=True,capture_output=True,timeout=100)
   v=json.loads(p.stdout);v.update(started_at=start,ended_at=now(),exit_code=p.returncode);save('candidate-preflight.json' if pre else 'promotion.json',v);assert p.returncode==0,v
 elif mode=='post':
  v=read('image-verification.json');r={}
  for name,host in [('frontend','192.168.2.46'),('backend','192.168.2.45')]:
   r[name]=runtime('tcdx-grc-'+name,host);assert r[name]['running'] and r[name]['health']=='healthy'
   if name=='backend':assert r[name]==read('backend-before.json'),'BACKEND_CHANGED'
   else:assert r[name]['image_id']==v['image_id'] and r[name]['restart_count']==0
  r['rollback']=runtime(ROLL,'192.168.2.46');assert r['rollback']['image_id']==read('frontend-before.json')['image_id'] and not r['rollback']['running']
  save('runtime-postdeploy.json',dict(status='PASS',time=now(),**r))
  public=[]
  for path in ['/','/health/ready',v['asset']]:
   with urllib.request.urlopen('https://grc.tecdex.net'+path,timeout=20) as response:
    data=response.read();assert response.status==200
   public.append({'url':'https://grc.tecdex.net'+path,'http':200,'sha256':hashlib.sha256(data).hexdigest(),'tls_verified':True})
   if path=='/':assert v['asset'].encode() in data
   if path==v['asset']:assert hashlib.sha256(data).hexdigest()==v['bundle_sha256'] and b'grc.tecdx.net' not in data
  save('public-parity.json',{'status':'PASS','time':now(),'checks':public})
  preservation();check('rector-final',['bash','scripts/verify-rector-governance.sh'])
 elif mode=='final-runtime':
  code='''import json,subprocess
def c(n):return json.loads(subprocess.check_output(['docker','inspect',n]))[0]
a=c('tcdx-grc-frontend');b=c(ROLL)
keys=['User','Cmd','Entrypoint','WorkingDir','ExposedPorts','Healthcheck','StopSignal']
diff=['Config.'+k for k in keys if a['Config'].get(k)!=b['Config'].get(k)]
env=lambda c:dict(x.split('=',1) for x in c['Config']['Env'])
if env(a)!=env(b):diff.append('Config.Env.values')
diff+=['HostConfig.'+k for k in set(a['HostConfig'])|set(b['HostConfig']) if a['HostConfig'].get(k)!=b['HostConfig'].get(k)]
def networks(c):return {n:sorted(x for x in v.get('Aliases',[]) if x not in [c['Id'],c['Id'][:12]]) for n,v in c['NetworkSettings']['Networks'].items()}
print(json.dumps({'unexpected_config_differences':diff,'current_networks':networks(a),'rollback_networks':networks(b),'allowed_changes':['image','source labels','generated hostname/container id','runtime start/health'],'status':'PASS' if not diff and networks(a)==networks(b) else 'BLOCKED'}))
'''
  v=json.loads(run(['ssh','tecdex@192.168.2.46','python3 -'],input='ROLL='+repr(ROLL)+'\n'+code));save('runtime-configuration-comparison.json',v);assert v['status']=='PASS',v
  check('secret-scan',['node','scripts/foundations/secret-scan.mjs'])
  preservation()
 elif mode=='preserve':preservation()
 print(mode+'=PASS')
if __name__=='__main__':main(sys.argv[1])
