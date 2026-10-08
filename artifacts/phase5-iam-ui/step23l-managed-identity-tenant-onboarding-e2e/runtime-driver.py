# Derived from the reviewed P2C-R Docker Engine replacement/custody procedure.
# Receives only public immutable component metadata. Protected runtime stays in memory.
import re,copy,datetime,hashlib,http.client,json,os,socket,stat,subprocess,sys,time
SPEC=json.loads(sys.argv[1]);ACTION=sys.argv[2];NAME=SPEC['name'];OLD=SPEC['containerId'];OLD_IMAGE=SPEC['oldImage'];IMAGE=SPEC['imageId'];FINGERPRINT=SPEC['sourceFingerprint'];ROLLBACK=NAME+'-pre-mi-tenant-e2e-'+FINGERPRINT[:12]
class UnixHTTP(http.client.HTTPConnection):
 def connect(self):
  self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(90);self.sock.connect('/var/run/docker.sock')
def api(method,path,body=None):
 c=UnixHTTP('localhost',timeout=90);c.request(method,path,body=None if body is None else json.dumps(body),headers={'Content-Type':'application/json'});r=c.getresponse();data=r.read();status=r.status;c.close()
 if status>=400:raise RuntimeError('ENGINE_STATUS_'+str(status))
 return json.loads(data)if data else None
def inspect(name):return api('GET','/containers/'+name+'/json')
def checked(args):
 p=subprocess.run(args,capture_output=True,text=True)
 if p.returncode:raise RuntimeError('SAFE_COMMAND_FAILED')
 return p.stdout
def valid_file(path,restrict=True):
 s=os.lstat(path);assert stat.S_ISREG(s.st_mode)and not stat.S_ISLNK(s.st_mode)and s.st_size>0
 if restrict:assert s.st_uid==1000 and stat.S_IMODE(s.st_mode)in[0o400,0o600]
 return{'path':path,'regular':True,'nonempty':True,'uid':s.st_uid,'mode':format(stat.S_IMODE(s.st_mode),'04o'),'contentsRead':False}
def precheck():
 assert NAME in ['tcdx-grc-backend','tcdx-grc-frontend'] and OLD_IMAGE=={'tcdx-grc-backend':'sha256:798937c23bb25c99f45431536348c3271a6dfdab553c9f0624c524e644dcc67d','tcdx-grc-frontend':'sha256:22997516450d50657e2501ca5412ff36828578ec7b3d473dd0f5e4643757da66'}[NAME],'APPROVED_COMPONENT_BOUNDARY'
 old=inspect(NAME);assert old['Config']['Hostname']==old['Id'][:12] and not old['Config']['Domainname'],'UNAPPROVED_HOSTNAME_SEMANTICS';assert old['Id']==OLD and old['Image']==OLD_IMAGE and old['State']['Running']and old['State'].get('Health',{}).get('Status')=='healthy'and old['RestartCount']==0
 assert hashlib.sha256(json.dumps([old['Config'],old['HostConfig']],sort_keys=True).encode()).hexdigest()==SPEC['configurationFingerprint'],'PRE_DEPLOY_CONFIGURATION_DRIFT'
 assert checked(['docker','exec',NAME,'id','-u']).strip()=='1000'
 env=dict(x.split('=',1)for x in old['Config'].get('Env',[]));assert not any('grc.tecdx.net'in x for x in env.values())
 for m in old['Mounts']:
  assert m['Type']=='bind'and not m['RW'];valid_file(m['Source'],NAME!='tcdx-managed-identity'or m['Destination'].endswith('keycloak.conf'))
 if NAME=='tcdx-grc-backend':
  assert old['Config']['User']=='node';assert 'MANAGED_IDENTITY_OIDC_CLIENT_SECRET'not in env and 'MANAGED_IDENTITY_ADMIN_CLIENT_SECRET'not in env
  for suffix in ['oidc','admin']:
   source='/home/tecdex/.secrets/tcdx-grc-qa/managed-identity-'+suffix+'-client-secret';target='/run/secrets/managed_identity_'+suffix+'_client_secret';assert sum(m['Source']==source and m['Destination']==target and not m['RW']for m in old['Mounts'])==1;assert env['MANAGED_IDENTITY_'+suffix.upper()+'_CLIENT_SECRET_FILE']==target;valid_file(source)
  s=os.lstat('/home/tecdex/.secrets/tcdx-grc-qa');assert stat.S_ISDIR(s.st_mode)and s.st_uid==1000 and stat.S_IMODE(s.st_mode)==0o700
 if NAME=='tcdx-managed-identity':assert old['Config']['Cmd']==['start']and not any('--import-realm'in x for x in old['Config']['Cmd'])
 assert not any('/'+ROLLBACK in c['Names']for c in api('GET','/containers/json?all=1'))
 assert api('GET','/images/'+OLD_IMAGE+'/json')['Architecture']=='amd64'
 return old
def loaded():
 im=api('GET','/images/'+IMAGE+'/json');assert im['Id']==IMAGE and im['Architecture']=='amd64'and im['Os']=='linux','LOADED_IMAGE_MISMATCH';assert im['Config']['Labels']=={'org.opencontainers.image.source':'https://github.com/Tecdex-SpA/tcdx-grc'},'UNCLASSIFIED_IMAGE_METADATA'
 assert api('GET','/images/'+SPEC['tag']+'/json')['Id']==IMAGE,'LOADED_TAG_MISMATCH';validate_source(im['Config'].get('Labels'));return im
def body(old):
 c=copy.deepcopy(old['Config']);c['Image']=IMAGE;c.pop('Hostname',None);c.pop('Domainname',None);c['HostConfig']=copy.deepcopy(old['HostConfig']);endpoints={}
 for network,e in old['NetworkSettings']['Networks'].items():
  assert not e.get('IPAMConfig'),'STATIC_IP_REQUIRES_REVIEW';endpoints[network]={k:copy.deepcopy(e[k])for k in ['Aliases','Links','DriverOpts']if e.get(k)}
 c['NetworkingConfig']={'EndpointsConfig':endpoints};return c
def summary(c):
 return{'name':c['Name'].lstrip('/'),'containerId':c['Id'],'imageId':c['Image'],'imageRef':c['Config']['Image'],'running':c['State']['Running'],'health':c['State'].get('Health',{}).get('Status'),'restartCount':c['RestartCount'],'startedAt':c['State']['StartedAt'],'runtimeUid':1000,'mountMetadata':[{'source':m['Source'],'target':m['Destination'],'type':m['Type'],'readOnly':not m['RW']}for m in c['Mounts']]}
# Operational gate only. Human DR-STEP23L-TENANT-D2-RD-C2-OCI-SOURCE-2026-10-07.
SOURCE_KEY = 'org.opencontainers.image.source'
SOURCE_VALUE = 'https://github.com/Tecdex-SpA/tcdx-grc'
ALLOWLIST = (SOURCE_KEY,)
COMPARISON_RESULT = None
def validate_source(labels):
 if (labels or {}).get(SOURCE_KEY) != SOURCE_VALUE:
  raise RuntimeError('FAIL_METADATA_EXPOSURE')
 return {'key':SOURCE_KEY,'securityClassification':'SAFE_PUBLIC_PROVENANCE','valueValidity':'PASS','runtimeFunctionalImpact':'NONE_PROVEN','value':SOURCE_VALUE}
def compare(old,new):
 global COMPARISON_RESULT
 assert old['Config']['Hostname']==old['Id'][:12] and new['Config']['Hostname']==new['Id'][:12] and old['Config']['Domainname']==new['Config']['Domainname']=='','GENERATED_HOSTNAME_SEMANTICS_DRIFT'
 validate_source(new['Config'].get('Labels'))
 a=copy.deepcopy(old['Config']);b=copy.deepcopy(new['Config'])
 old_labels=a.get('Labels')or{};new_labels=b.get('Labels')or{}
 other_labels=[k for k in sorted(set(old_labels)|set(new_labels))if k!=SOURCE_KEY and (k not in old_labels or k not in new_labels or old_labels[k]!=new_labels[k])]
 for k in ['Image','Hostname','Domainname']:a.pop(k,None);b.pop(k,None)
 # Normalize this exact approved key only. Keep every other label and map field.
 for c in [a,b]:
  if isinstance(c.get('Labels'),dict):c['Labels'].pop(SOURCE_KEY,None)
 config_fields=[k for k in sorted(set(a)|set(b))if k not in a or k not in b or a[k]!=b[k]]
 host_fields=[k for k in sorted(set(old['HostConfig'])|set(new['HostConfig']))if k not in old['HostConfig']or k not in new['HostConfig']or old['HostConfig'][k]!=new['HostConfig'][k]]
 mounts=lambda c:sorted((m['Source'],m['Destination'],m['Type'],m['RW'],m.get('Propagation'))for m in c['Mounts'])
 network=lambda c:{k:{x:v.get(x)for x in ['Aliases','Links','DriverOpts','IPAMConfig']}for k,v in c['NetworkSettings']['Networks'].items()}
 extra=[]
 if mounts(old)!=mounts(new):extra.append('Mounts')
 if network(old)!=network(new):extra.append('Networks')
 differences=['Config.'+k for k in config_fields]+['HostConfig.'+k for k in host_fields]+extra
 COMPARISON_RESULT={'runtimeConfigEquality':'PASS'if not differences else'FAIL','runtimeFunctionalConfigComparison':'PASS'if not differences else'FAIL','ociProvenanceAllowlist':[SOURCE_KEY],'ociProvenanceAllowlistMatch':True,'ociSourceLabelDifference':'ALLOWED_PROVENANCE_METADATA','ociAllowedProvenanceDifferences':[{'key':SOURCE_KEY,'beforePresent':SOURCE_KEY in old_labels,'afterPresent':True,'classification':'SAFE_PUBLIC_PROVENANCE','value':SOURCE_VALUE}],'otherLabelDifferences':len(other_labels),'otherLabelDifferenceKeys':other_labels,'unapprovedConfigDifferences':len(differences),'unapprovedConfigDifferenceFields':differences,'allOtherLabelsComparedExactly':True,'rawEnvironmentEqualInMemory':a.get('Env')==b.get('Env'),'hostConfigurationExact':not host_fields,'mountsExact':'Mounts'not in extra,'networkSemanticsExact':'Networks'not in extra,'rawConfigurationPersisted':False}
 if differences:raise RuntimeError('FAIL_RUNTIME_CONFIG_PRESERVATION')
 return COMPARISON_RESULT

def capture_candidate(candidate_id,phase):
 c=inspect(candidate_id)
 if c['Id']==OLD or c['Image']!=IMAGE:raise RuntimeError('CANDIDATE_LOG_IMAGE_ID_MISMATCH')
 since=SPEC.get('deploymentStartedAt',c['Created']);env=dict(x.split('=',1)for x in c['Config'].get('Env',[])if '='in x)
 known=[v for k,v in env.items()if v and any(x in k for x in ['PASSWORD','TOKEN','SECRET','ACCESS_KEY','PRIVATE_KEY'])and not k.endswith(('_FILE','_HOST_FILE'))]
 p=subprocess.run(['docker','logs','--timestamps','--since',since,candidate_id],capture_output=True,text=True,timeout=25)
 if p.returncode:raise RuntimeError('CANDIDATE_LOG_CAPTURE_FAILED')
 lines=(p.stdout+'\n'+p.stderr).splitlines();safe=[];secret=http=sql=fatal=errors=warnings=0;private_block=False
 for line in lines:
  if not line.strip():continue
  if re.search(r'status(?:Code|_code)?["\s:=]+5\d\d\b|HTTP/\d(?:\.\d)?"\s+5\d\d\b',line,re.I):http+=1
  if re.search(r'(?:SQL|database|postgres|jdbc).*(?:error|fatal|exception)|(?:error|fatal).*(?:SQL|database|postgres|jdbc)|sqlstate|query failed|syntax error',line,re.I):sql+=1
  if re.search(r'\bFATAL\b|startup fatal|uncaught exception|unhandled rejection',line,re.I):fatal+=1
  if re.search(r'\bERROR\b',line,re.I):errors+=1
  if re.search(r'\bWARN(?:ING)?\b',line,re.I):warnings+=1
  payload=line.split(' ',1)[1]if ' 'in line else line
  try:
   item=json.loads(payload)
   if isinstance(item,dict)and isinstance(item.get('level'),int):
    if item['level']>=50:errors+=1
    if item['level']>=60:fatal+=1
  except(ValueError,TypeError):pass
  if '-----BEGIN 'in line and 'PRIVATE KEY-----'in line:private_block=True
  sensitive=private_block or any(v in line for v in known)or re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|eyJ[a-zA-Z0-9_-]{12,}\.eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}|(?:postgres(?:ql)?|mongodb|redis)://[^\s:@/]+:[^\s@/]+@|(?:password|client[_-]?secret|access[_-]?token|refresh[_-]?token|access[_-]?key|secret[_-]?key|authorization|cookie|private[_-]?key)\s*["\x27]?\s*[:=]\s*["\x27]?\S+|\bBearer\s+\S+',line,re.I)
  if sensitive:secret+=1;safe.append('[REDACTED_SENSITIVE_LOG_LINE]')
  else:safe.append(line)
  if '-----END 'in line and 'PRIVATE KEY-----'in line:private_block=False
 health=[{k:x.get(k)for k in ['Start','End','ExitCode']}for x in c['State'].get('Health',{}).get('Log',[])]
 now=datetime.datetime.now(datetime.timezone.utc).isoformat();ev=subprocess.run(['docker','events','--since',since,'--until',now,'--filter','container='+candidate_id,'--format','{{json .}}'],capture_output=True,text=True,timeout=15)
 if ev.returncode:raise RuntimeError('CANDIDATE_EVENT_CAPTURE_FAILED')
 events=[]
 for line in ev.stdout.splitlines():
  e=json.loads(line);action=e.get('Action')or e.get('status')or'';action=action if action.startswith('health_status:')else action.split(':',1)[0];events.append({'action':action,'timeNano':e.get('timeNano'),'containerId':e.get('Actor',{}).get('ID')})
 r={'policy':'MANDATORY','phase':phase,'candidateContainerId':c['Id'],'imageId':c['Image'],'windowStart':since,'windowEnd':now,'startedAt':c['State']['StartedAt'],'stoppedAt':c['State'].get('FinishedAt'),'health':c['State'].get('Health',{}).get('Status'),'healthChecks':health,'events':events,'restartCount':c['RestartCount'],'sanitizedStdoutStderr':safe,'nonemptyLogLines':len(safe),'warnings':warnings,'runtimeErrorRecords':errors,'http5xxUnexpected':http,'sqlErrorsUnexpected':sql,'fatalErrors':fatal,'secretFindings':secret,'rawLogsPersisted':False,'captureComplete':True,'capturedBeforeRemoval':True}
 path='/tmp/tcdx-grc-mi-tenant-e2e-candidate-logs-'+c['Id']+'.json'
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'w')as stream:json.dump(r,stream,indent=2);stream.write('\n');stream.flush();os.fsync(stream.fileno())
 r['durableRemoteEvidencePath']=path
 return r


def wait_healthy(name,seconds=240):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  c=inspect(name);s=c['State'];health=s.get('Health',{}).get('Status')
  if s['Running']and health=='healthy'and c['RestartCount']==0:return c
  if health=='unhealthy'or s['Status']in['exited','dead']or c['RestartCount']>0:raise RuntimeError('CANDIDATE_NOT_HEALTHY')
  time.sleep(2)
 raise RuntimeError('CANDIDATE_HEALTH_TIMEOUT')

def restore():
 old=inspect(OLD);assert old['Id']==OLD and old['Image']==OLD_IMAGE
 logs=None
 try:
  active=inspect(NAME)
  if active['Id']!=OLD:
   assert active['Image']==IMAGE,'ROLLBACK_FOREIGN_COMPONENT_BLOCKED'
   logs=capture_candidate(active['Id'],'BEFORE_ROLLBACK')
   api('POST','/containers/'+active['Id']+'/stop?t=30')
   logs=capture_candidate(active['Id'],'AFTER_STOP_BEFORE_RETENTION_RENAME')
   # Retain the stopped failed object and evidence; never DELETE the sole candidate evidence.
   api('POST','/containers/'+active['Id']+'/rename?name='+NAME+'-failed-mi-tenant-e2e-'+active['Id'][:12])
 except RuntimeError as e:
  if str(e)!='ENGINE_STATUS_404':raise
 old=inspect(OLD)
 if old['Name']!='/'+NAME:api('POST','/containers/'+OLD+'/rename?name='+NAME)
 if not old['State']['Running']:api('POST','/containers/'+OLD+'/start')
 return wait_healthy(NAME,240),logs
try:
 if ACTION=='custody':
  old=precheck();print(json.dumps({'custody':'PASS','rollbackReady':True,'rollbackName':ROLLBACK,'state':summary(old),'candidateLogCapturePolicy':'MANDATORY'}))
 elif ACTION=='preflight':
  old=precheck();loaded();print(json.dumps({'preflight':'PASS','rollbackReady':True,'rollbackName':ROLLBACK,'state':summary(old),'candidateLogCapturePolicy':'MANDATORY'}))
 elif ACTION=='loaded':
  im=loaded();print(json.dumps({'loadedImage':'PASS','imageId':im['Id'],'architecture':'linux/amd64','revision':FINGERPRINT,'sourceMetadata':validate_source(im['Config'].get('Labels'))}))
 elif ACTION=='deploy':
  old=precheck();loaded();c=body(old);started=datetime.datetime.now(datetime.timezone.utc).isoformat();SPEC['deploymentStartedAt']=started
  try:
   api('POST','/containers/'+OLD+'/stop?t=30');api('POST','/containers/'+OLD+'/rename?name='+ROLLBACK)
   new=api('POST','/containers/create?name='+NAME,c);api('POST','/containers/'+new['Id']+'/start')
   current=wait_healthy(NAME);assert current['Image']==IMAGE;proof=compare(old,current)
   assert checked(['docker','exec',NAME,'id','-u']).strip()=='1000'
   logs=capture_candidate(current['Id'],'POST_DEPLOY_HEALTH_CONFIG')
   assert not any(logs[k]for k in ['http5xxUnexpected','sqlErrorsUnexpected','fatalErrors','runtimeErrorRecords','secretFindings','restartCount']),'RUNTIME_LOG_SECURITY_GATE_FAILED'
   print(json.dumps({'deploy':'PASS','deploymentStartedAt':started,'rollbackTriggered':False,'rollbackRetainedName':ROLLBACK,'state':summary(current),'configurationProof':proof,'candidateLogs':logs}))
  except Exception as e:
   restored,logs=restore()
   print(json.dumps({'deploy':'FAIL','deploymentStartedAt':started,'safeFailure':str(e)if isinstance(e,RuntimeError)else'ASSERTION_GATE_FAILED','configurationProof':COMPARISON_RESULT,'rollbackTriggered':True,'rollbackResult':'PASS','restored':summary(restored),'candidateLogs':logs}));sys.exit(1)
 elif ACTION=='post-config':
  old=inspect(OLD);current=inspect(NAME);assert old['Image']==OLD_IMAGE and not old['State']['Running']and current['Image']==IMAGE
  loaded();print(json.dumps({'configurationProof':compare(old,current),'state':summary(current),'rollbackStillRetained':True}))
 elif ACTION=='capture-logs':
  current=inspect(NAME);assert current['Image']==IMAGE;print(json.dumps({'candidateLogs':capture_candidate(current['Id'],'COMPLETE_POSTCHECK_WINDOW')}))
 elif ACTION=='rollback':
  restored,logs=restore();print(json.dumps({'rollbackTriggered':True,'rollbackResult':'PASS','restored':summary(restored),'candidateLogs':logs}))
 else:raise RuntimeError('UNKNOWN_ACTION')
except Exception as e:
 print(json.dumps({'operation':ACTION,'result':'FAIL','safeFailure':str(e)if isinstance(e,RuntimeError)else'ASSERTION_GATE_FAILED'}));sys.exit(1)
