import pathlib,subprocess,json,hashlib,tarfile,io
root=pathlib.Path('/Users/andresbarouh/repos/tcdx-grc');tmp=pathlib.Path('/tmp')
for gate in ['unit-regression','frontend-unit','postgres-regression','source-e2e','iam-e2e','typecheck','lint','contracts','source-build','secret-scan']:
 assert json.loads((tmp/f'tcdx-grc-mi-tenant-e2e-{gate}-receipt.json').read_text())['exitCode']==0,gate
log=(tmp/'tcdx-grc-mi-tenant-e2e-source-e2e.log').read_text();stats=json.JSONDecoder().raw_decode(log[log.index('{'):])[0]['stats'];assert stats['expected']==400 and all(stats[k]==0 for k in ['unexpected','skipped','flaky'])
assert json.loads((tmp/'tcdx-grc-mi-tenant-e2e-contract-gates.json').read_text())['openApiValidation']=='PASS'
assert json.loads((tmp/'tcdx-grc-mi-tenant-e2e-publication.json').read_text())['publication']=='PASS'
assert json.loads((tmp/'tcdx-grc-mi-tenant-e2e-final-checks.json').read_text())['activeBadDomainReferences']==0
start=json.loads((tmp/'tcdx-grc-mi-tenant-e2e-start.json').read_text());assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()==start['head'];assert subprocess.check_output(['git','ls-files','-s'],cwd=root).decode()==start['index']
subprocess.run(['git','diff','--check'],cwd=root,check=True)
def gitset(args):return set(p for p in subprocess.check_output(['git']+args+['-z'],cwd=root).decode().split('\0')if p)
tracked=gitset(['ls-files']);untracked=gitset(['ls-files','--others','--exclude-standard']);modified=gitset(['diff','--name-only'])
excluded={p for p in tracked|untracked if p.startswith(('artifacts/','data/regulatory/catalogs/_archives/'))}
paths=sorted((tracked|untracked)-excluded)
for p in paths:
 assert not pathlib.Path(p).is_absolute() and '..' not in pathlib.Path(p).parts
 assert not any(x in pathlib.Path(p).parts for x in ['.git','node_modules','dist','coverage','test-results','playwright-report','.secrets','__pycache__','.pnpm-store'])
 assert not pathlib.Path(p).name.startswith('.env') or p.endswith('.env.example') or p=='.env.example'
 assert (root/p).is_file() and not (root/p).is_symlink()
 for prefix in ['iam/','docs/ui/','docs/rector/baseline/']:
  if p.startswith(prefix):assert hashlib.sha256((root/p).read_bytes()).hexdigest()==start['hashes'][p],p
 if p.startswith('database/migrations/') and p in start['hashes'] and p.endswith('.sql'):assert hashlib.sha256((root/p).read_bytes()).hexdigest()==start['hashes'][p],p
index={}
for entry in subprocess.check_output(['git','ls-files','-s','-z'],cwd=root).split(b'\0'):
    if entry:
        meta,p=entry.decode().split('\t',1);index[p]=int(meta.split()[0],8)
def export(destination,independent=False):
    assert not destination.exists();destination.mkdir(mode=0o700)
    chosen=sorted((gitset(['ls-files'])|gitset(['ls-files','--others','--exclude-standard']))-excluded)if independent else paths
    assert chosen==paths
    rows=[]
    for p in chosen:
        data=(root/p).read_bytes();mode=0o755 if index.get(p,0o100644)&0o111 else 0o644
        dest=destination/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);dest.chmod(mode)
        rows.append((p,mode,len(data),hashlib.sha256(data).hexdigest()))
    body=''.join(f'{mode:04o} {size} {sha}  {p}\n'for p,mode,size,sha in rows)
    return rows,body,hashlib.sha256(body.encode()).hexdigest()
a=tmp/'tcdx-grc-mi-tenant-e2e-export-a';b=tmp/'tcdx-grc-mi-tenant-e2e-export-b'
rows,body,fp=export(a);rows2,body2,fp2=export(b,True);assert(rows,body,fp)==(rows2,body2,fp2)
def archive(path,source):
    assert not path.exists()
    with tarfile.open(path,'w',format=tarfile.USTAR_FORMAT)as tar:
        for p,mode,size,sha in rows:
            data=(source/p).read_bytes();assert hashlib.sha256(data).hexdigest()==sha
            info=tarfile.TarInfo(p);info.size=size;info.mode=mode;info.uid=info.gid=info.mtime=0;info.uname=info.gname='';tar.addfile(info,io.BytesIO(data))
    with tarfile.open(path)as tar:
        assert [m.name for m in tar.getmembers()]==paths
        for m,(p,mode,size,sha)in zip(tar.getmembers(),rows):assert m.isfile()and m.mode==mode and m.size==size and m.uid==m.gid==m.mtime==0 and hashlib.sha256(tar.extractfile(m).read()).hexdigest()==sha
    with path.open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
tar1=tmp/f'tcdx-grc-mi-tenant-e2e-{fp}.tar';tar2=tmp/f'tcdx-grc-mi-tenant-e2e-independent-{fp}.tar';sha=archive(tar1,a);assert sha==archive(tar2,b)
source=tmp/'tcdx-grc-mi-tenant-e2e-source';assert not source.exists();source.mkdir(mode=0o700)
with tarfile.open(tar1)as tar:tar.extractall(source,filter='data')
assert sorted(str(p.relative_to(source))for p in source.rglob('*')if p.is_file())==paths
for p,mode,size,h in rows:assert hashlib.sha256((source/p).read_bytes()).hexdigest()==h
assert len(json.loads((source/'database/migrations/manifest.json').read_text())['migrations'])==29
manifest=tmp/'tcdx-grc-mi-tenant-e2e-manifest.txt'
manifest.write_text('MASTER_REGENT=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23\nSTEP=23L-MANAGED-IDENTITY-TENANT-ONBOARDING-E2E\nSOURCE_FINGERPRINT='+fp+'\nPATH_COUNT='+str(len(paths))+'\nBUILD_COMPONENTS=backend,frontend\nREUSED_IAM=sha256:4ef4f816c60d05c3867c1fce9092a3b0d1539bf22683d3e2742c6c1d7ce25ea4\nDECISION_RECORD='+'docs/governance/DR_2026_10_07_MANAGED_IDENTITY_TENANT_ONBOARDING.md'+'\nCOMPLETION_STATUS_APPEND=EXTERNAL_POST_FREEZE\nFORMAT=mode size sha256 path\n'+body+'\nEXCLUDED_GENERATED_EVIDENCE_AND_INTAKE_PATHS\n'+'\n'.join(sorted(excluded))+'\n');manifest.chmod(0o600)
out={'source':str(source),'sourceFingerprint':fp,'archive':str(tar1),'archiveSha256':sha,'independentArchive':str(tar2),'manifest':str(manifest),'manifestSha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),'treePaths':len(paths),'paths':paths,'rows':rows,'exportsIdentical':True,'contamination':0,'missing':0,'extra':0,'mismatches':0,'buildComponents':['backend','frontend'],'sourceMatchesExecutedGates':True}
(tmp/'tcdx-grc-mi-tenant-e2e-freeze.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items()if k not in ['paths','rows']},indent=2))
