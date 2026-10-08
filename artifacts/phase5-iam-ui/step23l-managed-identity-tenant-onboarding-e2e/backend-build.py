import os,json,pathlib,subprocess
f=json.loads(pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-freeze.json').read_text());tag='tcdx-grc-backend:mi-tenant-e2e-'+f['sourceFingerprint'][:12]
env={k:v for k,v in os.environ.items() if not any(x in k for x in ['PASSWORD','CLIENT_SECRET','ACCESS_TOKEN','REFRESH_TOKEN','PRIVATE_KEY']) and not k.startswith(('DATABASE_','MANAGED_IDENTITY_','OIDC_','APP_JWT_','OBJECT_STORAGE_','TCDX_'))}
args=['docker','buildx','build','--platform','linux/amd64','--load','--provenance=false','--metadata-file','/tmp/tcdx-grc-mi-tenant-e2e-backend-buildkit.json','--iidfile','/tmp/tcdx-grc-mi-tenant-e2e-backend-iid.txt','--label','org.opencontainers.image.source=https://github.com/Tecdex-SpA/tcdx-grc','-t',tag,'-f',f['source']+'/apps/backend/Dockerfile',f['source']]
with open('/tmp/tcdx-grc-mi-tenant-e2e-backend-build.log','w') as log:p=subprocess.run(args,env=env,stdout=log,stderr=subprocess.STDOUT)
assert p.returncode==0,'BACKEND_BUILD_FAILED_SEE_SANITIZED_LOG'
im=json.loads(subprocess.check_output(['docker','image','inspect',tag],env=env))[0]
base='node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9'
b=json.loads(subprocess.check_output(['docker','image','inspect','--platform','linux/amd64',base],env=env))[0]
assert im['Architecture']=='amd64' and im['Os']=='linux'
assert im['RootFS']['Layers'][:len(b['RootFS']['Layers'])]==b['RootFS']['Layers']
r={'build':'PASS','imageId':im['Id'],'tag':tag,'architecture':'linux/amd64','base':base,'baseLayerPrefixMatches':True,'baseLayerCount':len(b['RootFS']['Layers']),'buildSource':f['source'],'sourceFingerprint':f['sourceFingerprint'],'buildSecrets':'NONE','componentsBuilt':['backend'],'qaTransport':False}
pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-build.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))

import tarfile,hashlib
transport=pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-'+f['sourceFingerprint'][:12]+'.tar');assert not transport.exists();subprocess.run(['docker','image','save','--output',str(transport),tag],env=env,check=True);transport.chmod(0o600)
with transport.open('rb')as stream:sha=hashlib.file_digest(stream,'sha256').hexdigest()
with tarfile.open(transport)as tar:
 m=json.load(tar.extractfile('manifest.json'));assert len(m)==1 and m[0]['RepoTags']==[tag];cfg=tar.extractfile(m[0]['Config']).read();configId='sha256:'+hashlib.sha256(cfg).hexdigest();assert configId==im['Id'] or im['Id'].removeprefix('sha256:')in json.dumps(json.load(tar.extractfile('index.json')))
r.update(transportPath=str(transport),transportSha256=sha,transportVerify='PASS',transportConfigDigest=configId)
pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-build.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
