import os,subprocess,json,pathlib,hashlib
p=pathlib.Path('/tmp');repo=pathlib.Path('/Users/andresbarouh/repos/tcdx-grc');node='/tmp/tcdx-grc-npm-cache/_npx/5dad66f2cb301fc2/node_modules/node/bin/node'
def read(name):return json.loads((p/('tcdx-grc-mi-tenant-e2e-'+name+'.json')).read_text())
def run(args):
 r=subprocess.run(args,cwd=repo,capture_output=True,text=True)
 if r.returncode:raise RuntimeError('SAFE_PREFLIGHT_COMMAND_FAILED_'+pathlib.Path(args[0]).name)
 return r.stdout
for gate in ['unit-regression','frontend-unit','postgres-regression','source-e2e','iam-e2e','typecheck','lint','contracts','source-build','secret-scan']:assert read(gate+'-receipt')['exitCode']==0,gate
log=(p/'tcdx-grc-mi-tenant-e2e-source-e2e.log').read_text();stats=json.JSONDecoder().raw_decode(log[log.index('{'):])[0]['stats'];assert stats['expected']==400 and all(stats[k]==0 for k in ['unexpected','skipped','flaky'])
assert read('contract-gates')['openApiValidation']=='PASS'
assert os.environ['DATABASE_HOST']=='192.168.2.40' and os.environ['DATABASE_NAME']=='tcdx-grc'
run([node,str(p/'tcdx-grc-mi-tenant-e2e-snapshot.mjs'),'preapply'])
for kind,script in [('authority','authority.py'),('runtime','runtime-capture.py'),('public','public.py')]:
 run(['python3',str(p/('tcdx-grc-mi-tenant-e2e-'+script)),'after']);(p/('tcdx-grc-mi-tenant-e2e-'+kind+'-preapply.json')).write_bytes((p/('tcdx-grc-mi-tenant-e2e-'+kind+'-after.json')).read_bytes())
before=read('qa-preapply');initial=read('qa-before')
for key in ['migrations','latest','physicalTables','publishedPermissions','schema','schemaSha256','ledger','preservedData','acme','permission','grants','instanceMatch','priorPermission','priorGrants']:assert before[key]==initial[key],'MATERIAL_QA_DRIFT_'+key
assert before['migrations']==28 and before['latest']=='20261006000200' and before['physicalTables']==235 and before['publishedPermissions']==169 and before['pendingIds']==['20261007000100'] and before['ledgerMatchesManifest'] and before['newPermission']==before['newGrants']==[]
for key,value in read('authority-before').items():
 if key!='capturedAt':assert read('authority-preapply')[key]==value,'HUMAN_AUTHORITY_DRIFT'
a,b=read('runtime-preapply'),read('runtime-before')
for runtime in [a,b]:
 for component in runtime['components']:component['sanitizedRuntime']['mounts'].sort(key=lambda row:(row['source'],row['target']))
assert a==b,'RUNTIME_BASELINE_DRIFT'
manifest=json.loads((repo/'database/migrations/manifest.json').read_text());last=manifest['migrations'][-1];assert last['id']=='20261007000100';assert hashlib.sha256((repo/'database/migrations'/last['filename']).read_bytes()).hexdigest()==last['sha256']
result=subprocess.run([node,'--experimental-strip-types','scripts/foundations/migrate.ts','apply'],cwd=repo,capture_output=True,text=True)
(p/'tcdx-grc-mi-tenant-e2e-migration-runner.log').write_text(result.stdout+result.stderr);assert result.returncode==0,'CANONICAL_MIGRATION_RUNNER_FAILED'
run([node,str(p/'tcdx-grc-mi-tenant-e2e-snapshot.mjs'),'postapply']);after=read('qa-postapply')
assert after['migrations']==29 and after['latest']==last['id'] and after['physicalTables']==235 and after['publishedPermissions']==170 and after['pendingIds']==[] and after['ledgerMatchesManifest']
assert after['ledger'][:-1]==before['ledger'] and after['ledger'][-1]['content_sha256']==last['sha256']
for key in ['schema','schemaSha256','acme','permission','grants','instanceMatch','priorPermission','priorGrants']:assert before[key]==after[key],'UNAUTHORIZED_DATABASE_CHANGE_'+key
expected=[{'permission_code':'platform.tenant_user.onboard','domain_code':'platform','resource_code':'tenant_user','action_code':'onboard','lifecycle_state':'published'}]
assert [{k:v for k,v in row.items()if k!='permission_id'}for row in after['newPermission']]==expected
assert len(after['newGrants'])==1 and after['newGrants'][0]['role_code']=='PLATFORM_ADMIN' and after['newGrants'][0]['is_baseline'] and after['newGrants'][0]['ownership_class']==after['newGrants'][0]['role_ownership']=='PLATFORM_CONTROL' and after['newGrants'][0]['tenant_id'] is None and after['newGrants'][0]['role_tenant'] is None and after['newGrants'][0]['lifecycle_state']=='published'
assert after['preservedBaseData']==before['preservedData'],'PREEXISTING_DATA_MUTATED'
for table,state in before['preservedData'].items():
 if table not in ['iam.permissions','iam.role_permissions']:assert state==after['preservedData'][table],'FUNCTIONAL_DATA_CHANGED_'+table
for table in ['iam.permissions','iam.role_permissions']:assert after['preservedData'][table]['rows']==before['preservedData'][table]['rows']+1
run(['python3',str(p/'tcdx-grc-mi-tenant-e2e-authority.py'),'after'])
for key,value in read('authority-preapply').items():
 if key!='capturedAt':assert read('authority-after')[key]==value,'HUMAN_IDENTITY_CHANGED'
out={'publication':'PASS','migrationId':last['id'],'migrationSha256':last['sha256'],'canonicalRunner':True,'ddl':0,'migrationsBefore':28,'migrationsAfter':29,'tablesBefore':235,'tablesAfter':235,'permissionsBefore':169,'permissionsAfter':170,'schemaUnchanged':True,'schemaSha256':after['schemaSha256'],'newPermissions':1,'newGrants':1,'unauthorizedGrants':0,'functionalQaMutations':0,'acmePreserved':True,'andresPreserved':True}
(p/'tcdx-grc-mi-tenant-e2e-publication.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
