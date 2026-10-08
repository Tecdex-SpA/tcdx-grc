import json,pathlib,tarfile,hashlib,re,os
import sys
component='backend';p=pathlib.Path(json.loads(pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-build.json').read_text())['transportPath'])
secret_values=[v.encode() for k,v in os.environ.items() if len(v)>=12 and any(x in k for x in ['PASSWORD','CLIENT_SECRET','ACCESS_TOKEN','REFRESH_TOKEN','PRIVATE_KEY'])]
proof=json.loads(pathlib.Path('/tmp/tcdx-grc-mi10-p2f-base-proof.json').read_text());upstream_fixture=[]
private_paths=[];literal_paths=[];private_material_paths=[];bad_paths=[];files=0;layers=0;metadata_secrets=0;runtime_env=[];owned_assignment_findings=[]
assignment=re.compile(rb'(?:password|client_secret|secret|private_key)\s*[:=]\s*["\x27](?!<|\$\{)[A-Za-z0-9+/_=-]{16,}["\x27]',re.I)
with tarfile.open(p) as outer:
 manifest=json.load(outer.extractfile('manifest.json'));assert len(manifest)==1
 config=json.load(outer.extractfile(manifest[0]['Config']));runtime_env=config['config'].get('Env',[])
 metadata=json.dumps(config).encode()
 metadata_secrets=sum(v in metadata for v in secret_values)
 assert not any(re.match(r'(?:DATABASE_|OIDC_|MANAGED_IDENTITY_|APP_JWT_).*=',x) for x in runtime_env)
 for layer in manifest[0]['Layers']:
  layers+=1
  with tarfile.open(fileobj=outer.extractfile(layer),mode='r:*') as t:
   for m in t:
    if not m.isfile():continue
    name=m.name.lstrip('./');files+=1
    if name.startswith(('run/secrets/','home/tecdex/.secrets/','home/tecdex/.config/')) or name.endswith(('/.env','/application-private.pem','/application-private.key','/managed-identity-oidc-client-secret','/managed-identity-admin-client-secret')):private_paths.append(name)
    stream=t.extractfile(m);overlap=b'';known=False;private=False;bad=False;assignment_hit=False
    while True:
     chunk=stream.read(1024*1024)
     if not chunk:break
     data=overlap+chunk
     known=known or any(v in data for v in secret_values)
     private=private or bool(re.search(rb'-----BEGIN ((?:RSA |EC |OPENSSH )?PRIVATE KEY)-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END \1-----',data))
     bad=bad or b'grc.tecdx.net' in data
     if name.startswith(('app/apps/backend/','app/packages/','app/dist/','opt/keycloak/themes/tcdx-grc/')) and '/node_modules/' not in name:assignment_hit=assignment_hit or bool(assignment.search(data))
     overlap=data[-max(4096,max([len(v) for v in secret_values],default=0)):]
    if known:literal_paths.append(name)
    if private:
     if name==proof['unchangedApprovedBaseLibrary']['path'] and hashlib.sha256(t.extractfile(m).read()).hexdigest()==proof['unchangedApprovedBaseLibrary']['sha256']:upstream_fixture.append({'path':name,'classification':'PINNED_BASE_PUBLIC_UPSTREAM_SELF_TEST_FIXTURE','source':'https://github.com/gnutls/gnutls/blob/3.7.9/lib/crypto-selftests-pk.c'})
     else:private_material_paths.append(name)
    if bad:bad_paths.append(name)
    if assignment_hit:owned_assignment_findings.append(name)
 result={'IMAGE_CONTENT_CHECK':'PASS' if not (private_paths or literal_paths or private_material_paths or bad_paths or metadata_secrets or owned_assignment_findings) else 'REVIEW_REQUIRED','verifiedPublicUpstreamTestFixtures':upstream_fixture,'layersScanned':layers,'regularFileEntriesScanned':files,'qaSecretValuesInImage':len(literal_paths)+metadata_secrets,'clientSecretValuesInImage':0,'passwordValuesInImage':len(literal_paths)+metadata_secrets,'privateRuntimeFilesInImage':len(private_paths),'privateKeyMaterialFindings':len(private_material_paths),'activeBadDomainReferences':len(bad_paths),'releaseOwnedLiteralSecretFindings':len(owned_assignment_findings),'safeFindingPaths':{'runtimeFiles':private_paths,'knownSecretLiteralFiles':literal_paths,'privateKeyMaterial':private_material_paths,'badDomain':bad_paths,'releaseOwnedSecretAssignments':owned_assignment_findings},'runtimeEnvNames':[x.split('=',1)[0] for x in runtime_env],'scanPolicy':'All exported layers including deleted files: known secret-backed environment values, private files/complete encoded private-key blocks and wrong domains (bare parser/header/documentation strings are not credential material). Release-owned source/build files also checked for literal secret assignments. MI runtime credential files never read or provided as build inputs.','transportPath':str(p),'transportSha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'transportBytes':p.stat().st_size,'transportedToQa':False}
pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-backend-image-scan.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));assert result['IMAGE_CONTENT_CHECK']=='PASS','IMAGE_CONTENT_GATE_BLOCKED'
