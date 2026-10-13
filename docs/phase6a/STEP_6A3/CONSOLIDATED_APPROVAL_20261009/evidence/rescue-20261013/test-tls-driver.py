import ast,pathlib,copy,json,hashlib,subprocess,sys
p=pathlib.Path('docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/rescue-20261013');source=(p/'iana-qa30-tls-runtime-driver.py').read_text();tree=ast.parse(source)
funcs=ast.Module(body=[x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name in ['apply_tls_repair','body','compare','validate_source']],type_ignores=[])
spec=json.loads((p/'operational-specs.json').read_text())['specs']['tcdx-grc-backend'];old={'Id':'a'*64,'Image':spec['oldImage'],'Config':{'Hostname':'a'*12,'Domainname':'','Image':spec['oldImage'],'Env':['DATABASE_HOST=192.168.2.40','DATABASE_SSL_MODE=disable','UNRELATED=unchanged'],'Labels':{'compose-label':'unchanged'},'User':'node'},'HostConfig':{'Binds':['/protected:/run/secret:ro'],'ExtraHosts':None,'RestartPolicy':{'Name':'always'}},'Mounts':[{'Source':'/protected','Destination':'/run/secret','Type':'bind','RW':False,'Propagation':'rprivate'}],'NetworkSettings':{'Networks':{'test-network':{'Aliases':['tcdx-grc-backend'],'Links':None,'DriverOpts':None,'IPAMConfig':None}}}}
env={'NAME':'tcdx-grc-backend','SPEC':spec,'IMAGE':spec['imageId'],'copy':copy,'SOURCE_KEY':'org.opencontainers.image.source','SOURCE_VALUE':'https://github.com/Tecdex-SpA/tcdx-grc','validate_tls_repair':lambda x:None};exec(compile(funcs,'driver-functions','exec'),env)
b=env['body'](old);assert 'UNRELATED=unchanged' in b['Env'] and 'DATABASE_SSL_MODE=require' in b['Env'] and b['HostConfig']['ExtraHosts']==['db-tecdex:192.168.2.40'];assert b['HostConfig']['RestartPolicy']==old['HostConfig']['RestartPolicy']
new=copy.deepcopy(old);new['Id']='b'*64;new['Image']=spec['imageId'];new['Config']={k:v for k,v in b.items()if k not in ['HostConfig','NetworkingConfig']};new['Config']['Hostname']='b'*12;new['Config']['Domainname']='';new['Config']['Labels']['org.opencontainers.image.source']=env['SOURCE_VALUE'];new['HostConfig']=b['HostConfig'];new['Mounts'].append({'Source':spec['tlsRepair']['caHostFile'],'Destination':spec['tlsRepair']['caContainerFile'],'Type':'bind','RW':False,'Propagation':'rprivate'})
env['compare'](old,new);checks=['exact_tls_delta_accepted','unrelated_config_preserved']
for case,mutate in [('unexpected_env',lambda c:c['Config']['Env'].append('UNAPPROVED=value')),('missing_ca',lambda c:c['Mounts'].pop()),('wrong_db_address',lambda c:c['HostConfig'].update({'ExtraHosts':['db-tecdex:192.168.2.41']}))]:
 changed=copy.deepcopy(new);mutate(changed)
 try:env['compare'](old,changed);raise AssertionError('MUTATION_ACCEPTED')
 except RuntimeError as e:assert str(e)=='FAIL_RUNTIME_CONFIG_PRESERVATION'
 checks.append(case+'_rejected')
original=ast.parse((p/'iana-qa30-runtime-driver.py').read_text())
for name in ['restore','wait_healthy']:
 get=lambda t:ast.dump(next(x for x in t.body if isinstance(x,ast.FunctionDef) and x.name==name),include_attributes=False)
 assert get(tree)==get(original),name+'_CHANGED';checks.append(name+'_same_as_validated_recovery')
for action in ['deploy','rollback']:
 r=subprocess.run([sys.executable,str(p/'iana-qa30-tls-runtime-driver.py'),'{}',action],capture_output=True,text=True);assert r.returncode!=0 and 'QA_WRITE_DISABLED' in r.stderr;checks.append(action+'_requires_exact_GO')
(p/'tls-driver-delta-tests.json').write_text(json.dumps({'result':'PASS','checks':checks,'count':len(checks),'historicalRecoveryReused':'12 directed + 5 local Engine recovery PASS; functions unchanged','QA_mutations':0},indent=2)+'\n');print('TLS_DRIVER_DELTA_TESTS=PASS;'+str(len(checks))+' checks')
