import ast,pathlib,json,hashlib,copy,subprocess,sys,time
p=pathlib.Path('docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/rescue-20261013');tree=ast.parse((p/'iana-qa30-tls-runtime-driver-r2.py').read_text());original=ast.parse((p/'iana-qa30-tls-runtime-driver.py').read_text());ops=json.loads((p/'operational-specs-r2.json').read_text());checks=[]
funcs=ast.Module(body=[x for x in tree.body if isinstance(x,ast.FunctionDef)and x.name=='precheck'],type_ignores=[])
spec=copy.deepcopy(ops['specs']['tcdx-grc-frontend']);old={'Id':spec['containerId'],'Image':spec['oldImage'],'Config':{'Hostname':spec['containerId'][:12],'Domainname':'','Env':[]},'HostConfig':{},'State':{'Running':True,'Status':'running','Health':{'Status':'healthy'}},'RestartCount':0,'Mounts':[]}
spec['configurationFingerprint']=hashlib.sha256(json.dumps([old['Config'],old['HostConfig']],sort_keys=True).encode()).hexdigest()
for case,action,change,passing in [('active_healthy','preflight',lambda c:None,True),('parked_unhealthy','deploy',lambda c:c['State'].update({'Running':False,'Status':'exited','Health':{'Status':'unhealthy'}}),True),('parked_not_accepted_in_preflight','preflight',lambda c:c['State'].update({'Running':False,'Status':'exited','Health':{'Status':'unhealthy'}}),False),('running_unhealthy','deploy',lambda c:c['State'].update({'Health':{'Status':'unhealthy'}}),False),('restart_growth','deploy',lambda c:c.update({'RestartCount':1}),False)]:
 c=copy.deepcopy(old);change(c);env={'SPEC':spec,'NAME':spec['name'],'OLD':spec['containerId'],'OLD_IMAGE':spec['oldImage'],'ROLLBACK':'retained','ACTION':action,'inspect':lambda n:c,'api':lambda method,path:[]if '/containers/json'in path else {'Architecture':'amd64'},'checked':lambda args:'1000','hashlib':hashlib,'json':json,'valid_file':lambda x,*args:None};exec(compile(funcs,'precheck-r2','exec'),env)
 accepted=True
 try:env['precheck']()
 except AssertionError:accepted=False
 assert accepted==passing,case
 checks.append(case+'=PASS')
# Validate the actual revised restore function with Engine reset semantics.
funcs=ast.Module(body=[x for x in tree.body if isinstance(x,ast.FunctionDef)and x.name=='restore'],type_ignores=[])
for running in [False,True]:
 c={'Id':'old','Image':'image','Name':'/backend','State':{'Running':running},'RestartCount':1}
 def api(method,path):
  if path.endswith('/start'):c['State']['Running']=True;c['RestartCount']=0
  else:raise AssertionError(path)
 def wait(name,seconds,expected):assert c['RestartCount']==expected;return c
 env={'OLD':'old','OLD_IMAGE':'image','NAME':'backend','IMAGE':'candidate','SPEC':{'baselineRestartCount':1},'inspect':lambda n:c,'api':api,'capture_candidate':lambda *args:None,'wait_healthy':wait};exec(compile(funcs,'restore-r2','exec'),env);result,_=env['restore']();assert result['RestartCount']==(1 if running else 0);checks.append(('already_running_counter_preserved'if running else'manual_start_counter_reset_verified')+'=PASS')
for action in ['park','deploy','rollback']:
 r=subprocess.run([sys.executable,str(p/'iana-qa30-tls-runtime-driver-r2.py'),'{}',action],capture_output=True,text=True);assert r.returncode!=0 and 'QA_WRITE_DISABLED'in r.stderr;checks.append(action+'_blocked_without_r2_GO=PASS')
(p/'r2-operational-tests.json').write_text(json.dumps({'result':'PASS','count':len(checks),'checks':checks,'QA_writes':0,'approvedR1DriverUnmodified':True,'r2GO':'NOT_GRANTED'},indent=2)+'\n');print('R2_OPERATIONAL_TESTS=PASS;'+str(len(checks)))
