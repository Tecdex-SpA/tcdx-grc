import json,subprocess,sys,pathlib
ssh=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UpdateHostKeys=no','-o','ConnectTimeout=6']
remote=r'''import json,subprocess,hashlib,os,stat,sys
names=json.loads(sys.argv[1]);components=[]
public={'NODE_ENV','PORT','FRONTEND_ORIGIN','DATABASE_HOST','DATABASE_PORT','DATABASE_NAME','DATABASE_SSL_MODE','MANAGED_IDENTITY_OIDC_ISSUER','MANAGED_IDENTITY_OIDC_CLIENT_ID','MANAGED_IDENTITY_OIDC_REDIRECT_URI','MANAGED_IDENTITY_ADMIN_BASE_URL','MANAGED_IDENTITY_ADMIN_CLIENT_ID','KC_HOSTNAME','KC_DB','KC_HEALTH_ENABLED','KC_PROXY_HEADERS'}
for name in names:
 c=json.loads(subprocess.check_output(['docker','inspect',name]))[0];im=json.loads(subprocess.check_output(['docker','image','inspect',c['Image']]))[0]
 env=dict(x.split('=',1)for x in c['Config'].get('Env',[]));safe={k:(v if k in public or k.endswith('_FILE')or k.endswith('_HOST_FILE')else '[REDACTED_RUNTIME_VALUE]')for k,v in env.items()}
 assert not any('grc.tecdx.net'in value for value in env.values())
 mounts=[{'source':m['Source'],'target':m['Destination'],'type':m['Type'],'readOnly':not m['RW'],'propagation':m.get('Propagation')}for m in c['Mounts']]
 cfg={'environment':safe,'entrypoint':c['Config'].get('Entrypoint'),'command':c['Config'].get('Cmd'),'user':c['Config'].get('User'),'workingDir':c['Config'].get('WorkingDir'),'healthcheck':c['Config'].get('Healthcheck'),'mounts':mounts,'networkMode':c['HostConfig']['NetworkMode'],'networks':{k:{'aliases':v.get('Aliases'),'links':v.get('Links'),'driverOpts':v.get('DriverOpts'),'ipamConfig':v.get('IPAMConfig')}for k,v in c['NetworkSettings']['Networks'].items()},'portBindings':c['HostConfig'].get('PortBindings'),'restartPolicy':c['HostConfig'].get('RestartPolicy'),'securityOpt':c['HostConfig'].get('SecurityOpt'),'capDrop':c['HostConfig'].get('CapDrop'),'capAdd':c['HostConfig'].get('CapAdd'),'memory':c['HostConfig'].get('Memory'),'nanoCpus':c['HostConfig'].get('NanoCpus'),'readonlyRootfs':c['HostConfig'].get('ReadonlyRootfs')}
 metadata=[]
 if name=='tcdx-grc-backend':
  for kind in ['oidc','admin']:
   p='/home/tecdex/.secrets/tcdx-grc-qa/managed-identity-'+kind+'-client-secret';s=os.lstat(p)
   assert stat.S_ISREG(s.st_mode)and s.st_size>0 and s.st_uid==1000 and stat.S_IMODE(s.st_mode)in[0o400,0o600]
   assert sum(m['source']==p and m['target']=='/run/secrets/managed_identity_'+kind+'_client_secret'and m['readOnly']for m in mounts)==1
   target='/run/secrets/managed_identity_'+kind+'_client_secret';assert env['MANAGED_IDENTITY_'+kind.upper()+'_CLIENT_SECRET_FILE']==target;subprocess.check_call(['docker','exec',name,'test','-r',target]);parent=os.lstat('/home/tecdex/.secrets/tcdx-grc-qa');assert stat.S_ISDIR(parent.st_mode)and parent.st_uid==1000 and stat.S_IMODE(parent.st_mode)==0o700
   metadata.append({'path':p,'uid':s.st_uid,'mode':format(stat.S_IMODE(s.st_mode),'04o'),'regular':True,'nonempty':True,'contentsRead':False,'readableByRuntime':True,'parentMode':'0700','parentUid':1000})
 if name=='tcdx-managed-identity':
  assert not any('--import-realm'in x for x in (c['Config'].get('Cmd')or[]))
  for m in mounts:
   if m['target'].endswith('/keycloak.conf'):
    s=os.lstat(m['source']);assert stat.S_ISREG(s.st_mode)and stat.S_IMODE(s.st_mode)in[0o400,0o600]and m['readOnly']
    metadata.append({'path':m['source'],'uid':s.st_uid,'mode':format(stat.S_IMODE(s.st_mode),'04o'),'regular':True,'nonempty':s.st_size>0,'contentsCaptured':False})
 assert c['State']['Running']and c['RestartCount']==0 and im['Architecture']=='amd64'and im['Os']=='linux'
 components.append({'name':name,'containerId':c['Id'],'imageId':c['Image'],'imageRef':c['Config']['Image'],'architecture':'linux/amd64','running':True,'health':c['State'].get('Health',{}).get('Status'),'restartCount':c['RestartCount'],'startedAt':c['State']['StartedAt'],'sanitizedRuntime':cfg,'configurationFingerprint':hashlib.sha256(json.dumps([c['Config'],c['HostConfig']],sort_keys=True).encode()).hexdigest(),'secretMetadata':metadata,'imageAvailableForRollback':True,'secretValuesCaptured':False,'containerLabels':c['Config'].get('Labels',{}),'imageLabels':im['Config'].get('Labels',{}),'actualUid':subprocess.check_output(['docker','exec',name,'id','-u']).decode().strip()})
print(json.dumps({'components':components,'rawEnvironmentPrinted':False}))'''
phase=sys.argv[1];assert phase in ['before','after','rollback'];out=[]
for host,names in [('192.168.2.45',['tcdx-grc-backend']),('192.168.2.46',['tcdx-grc-frontend','tcdx-managed-identity'])]:
 p=subprocess.run(ssh+['tecdex@'+host,'python3 - '+"'"+json.dumps(names)+"'"],input=remote,capture_output=True,text=True)
 if p.returncode:raise RuntimeError('READ_ONLY_RUNTIME_CAPTURE_FAILED_'+host)
 out+=json.loads(p.stdout)['components']
expected={'tcdx-grc-backend':'sha256:7c69fd4acc4301579e86d001001a207232d6e880157e8ad3156a27f0436af5f1','tcdx-grc-frontend':'sha256:22997516450d50657e2501ca5412ff36828578ec7b3d473dd0f5e4643757da66','tcdx-managed-identity':'sha256:4ef4f816c60d05c3867c1fce9092a3b0d1539bf22683d3e2742c6c1d7ce25ea4'}
if phase=='before':expected['tcdx-grc-backend']='sha256:798937c23bb25c99f45431536348c3271a6dfdab553c9f0624c524e644dcc67d'
if phase=='after':expected.update({'tcdx-grc-backend':'sha256:394ad8fadf279dfd9ada3ebeeb2161c3890ee8ca0458db1aa6194952f0a1ee59','tcdx-grc-frontend':'sha256:1d34a78b51eeed798620adc4375a39242d6d7009f4155e126de9850cf4de3973'})
assert all(c['imageId']==expected[c['name']]for c in out),'BLOCKED_QA_DRIFT'
pathlib.Path('/tmp/tcdx-grc-mi-tenant-e2e-runtime-'+phase+'.json').write_text(json.dumps({'components':out,'secretValuesCaptured':False},indent=2)+'\n')
print(json.dumps({'phase':phase,'components':[{k:c[k]for k in ['name','containerId','imageId','running','health','restartCount']}for c in out]}))
