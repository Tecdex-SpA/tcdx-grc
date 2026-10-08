import pathlib,subprocess,json,os,hashlib,time,urllib.request,re,tarfile
tmp=pathlib.Path('/tmp');f=json.loads((tmp/'tcdx-grc-mi-tenant-e2e-freeze.json').read_text());source=pathlib.Path(f['source'])
env={k:v for k,v in os.environ.items()if not any(x in k for x in ['PASSWORD','CLIENT_SECRET','ACCESS_TOKEN','REFRESH_TOKEN','PRIVATE_KEY'])and not k.startswith(('DATABASE_','MANAGED_IDENTITY_','OIDC_','APP_JWT_','OBJECT_STORAGE_','TCDX_','VITE_'))}
tag='tcdx-grc-frontend:mi-tenant-e2e-'+f['sourceFingerprint'][:12]
base='node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9'
args=['docker','buildx','build','--platform','linux/amd64','--load','--provenance=false','--metadata-file',str(tmp/'tcdx-grc-mi-tenant-e2e-buildkit.json'),'--iidfile',str(tmp/'tcdx-grc-mi-tenant-e2e-iid.txt'),'--label','org.opencontainers.image.source=https://github.com/Tecdex-SpA/tcdx-grc','--build-arg','VITE_API_ORIGIN=https://grc.tecdex.net','-t',tag,'-f',str(source/'apps/frontend/Dockerfile'),str(source)]
with(tmp/'tcdx-grc-mi-tenant-e2e-build.log').open('w')as log:r=subprocess.run(args,env=env,stdout=log,stderr=subprocess.STDOUT)
assert r.returncode==0,'FRONTEND_BUILD_FAILED'
im=json.loads(subprocess.check_output(['docker','image','inspect',tag],env=env))[0]
b=json.loads(subprocess.check_output(['docker','image','inspect','--platform','linux/amd64',base],env=env))[0]
assert im['Architecture']=='amd64'and im['Os']=='linux'and im['Config']['User']=='node'
assert im['RootFS']['Layers'][:len(b['RootFS']['Layers'])]==b['RootFS']['Layers']
assert im['Config']['Labels']=={'org.opencontainers.image.source':'https://github.com/Tecdex-SpA/tcdx-grc'},'UNCLASSIFIED_NEW_LABEL'
name='tcdx-grc-mi-tenant-e2e-local-'+f['sourceFingerprint'][:12]
cid=subprocess.check_output(['docker','run','--platform','linux/amd64','-d','--name',name,'--publish','127.0.0.1:4197:8080','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--health-cmd',"node -e \"fetch('http://127.0.0.1:8080/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\"",'--health-interval','2s','--health-timeout','2s','--health-retries','5',im['Id']],env=env).decode().strip()
for i in range(120):
    c=json.loads(subprocess.check_output(['docker','inspect',cid],env=env))[0]
    if c['State']['Running']and c['State'].get('Health',{}).get('Status')=='healthy':break
    assert c['State']['Status']not in ['exited','dead']
    time.sleep(.25)
else:raise RuntimeError('LOCAL_FRONTEND_HEALTH_FAILED')
def get(path):
    with urllib.request.urlopen('http://127.0.0.1:4197'+path,timeout=4)as r:
        assert r.status==200;return r.read(),dict(r.headers)
html,headers=get('/');assert b'<title>Tecdex GRC</title>'in html
assert get('/configuraciones/empresas')[0]==html and get('/configuraciones/usuarios')[0]==html
logo,lheaders=get('/tecdex-logo-light.svg');assert lheaders['Content-Type']=='image/svg+xml'and logo==(source/'docs/ui/assets/brand/tecdex-logo-light.svg').read_bytes()
assets=re.findall(rb'(?:src|href)="(/assets/[^"]+)"',html);assert len(assets)==2
bundle=b''.join(get(a.decode())[0]for a in assets)
required=['Tecdex GRC','Tecdex Managed Identity','Agregar usuario','Administrador inicial','/api/v1/user-identities','/api/v1/platform/tenants:initial-onboarding','/api/v1/memberships','/api/v1/roles','https://grc.tecdex.net','Acceso a empresas','Roles de esta empresa','Sin asociar a empresa','users:onboard','Invitación con identidad corporativa Zoho']
assert all(s.encode()in bundle for s in required),'RELEASE_BUNDLE_MISSING_CENTRAL_ONBOARDING'
assert not re.search(rb'(?:iam\.)?grc\.tecdx\.net',bundle,re.I)
uid=subprocess.check_output(['docker','exec',cid,'id','-u'],env=env).decode().strip();assert uid=='1000'
logs=subprocess.check_output(['docker','logs',cid],env=env,stderr=subprocess.STDOUT).decode();assert not re.search(r'\bfatal\b|uncaught|unhandled',logs,re.I)
transport=tmp/f'tcdx-grc-mi-tenant-e2e-frontend-{f["sourceFingerprint"][:12]}.tar';assert not transport.exists()
subprocess.run(['docker','image','save','--output',str(transport),tag],env=env,check=True);transport.chmod(0o600)
with transport.open('rb')as stream:transport_sha=hashlib.file_digest(stream,'sha256').hexdigest()
with tarfile.open(transport)as tar:
    manifests=json.load(tar.extractfile('manifest.json'));assert len(manifests)==1 and manifests[0]['RepoTags']==[tag]
    config=tar.extractfile(manifests[0]['Config']).read();config_id='sha256:'+hashlib.sha256(config).hexdigest()
    image_config=json.loads(config);assert image_config['architecture']=='amd64'and image_config['os']=='linux'
    assert image_config['config']['Labels']==im['Config']['Labels']
    transport_identity={'manifestConfigDigest':config_id,'engineImageId':im['Id'],'manifest':manifests[0],'index':json.load(tar.extractfile('index.json'))if'index.json'in tar.getnames()else None}
    assert config_id==im['Id']or(im['Id'].removeprefix('sha256:')in json.dumps(transport_identity['index'])),'TRANSPORT_IMAGE_ID_MISMATCH'
result={'build':'PASS','imageId':im['Id'],'tag':tag,'architecture':'linux/amd64','base':base,'baseLayerPrefixMatches':True,'baseLayerCount':len(b['RootFS']['Layers']),'buildSource':f['source'],'sourceFingerprint':f['sourceFingerprint'],'buildSecrets':'NONE','componentsBuilt':['frontend'],'ociSourceLabelSecurityClassification':'SAFE_PUBLIC_PROVENANCE','otherUnclassifiedNewLabels':0,'localSmoke':'PASS','localContainerId':cid,'localContainerName':name,'localPort':4197,'runtimeUid':uid,'logoSha256':hashlib.sha256(logo).hexdigest(),'bundleAssets':[a.decode()for a in assets],'bundleRequiredFeaturesVerified':required,'bundleSha256':hashlib.sha256(bundle).hexdigest(),'transportPath':str(transport),'transportSha256':transport_sha,'transportVerify':'PASS','transportIdentity':transport_identity,'qaDeployPerformed':False}
(tmp/'tcdx-grc-mi-tenant-e2e-frontend-build.json').write_text(json.dumps(result,indent=2)+'\n');(tmp/'tcdx-grc-mi-tenant-e2e-frontend-build.json').chmod(0o600)
print(json.dumps({k:v for k,v in result.items()if k!='transportIdentity'},indent=2))
