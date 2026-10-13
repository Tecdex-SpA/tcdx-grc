import subprocess,json,re,pathlib,hashlib
image='sha256:3be791953c806bbb24556526f06adfa73b364f374856a4f8102e5db9521d3cee'
code="""import {buildApp} from '/app/apps/backend/dist/app.js';import {UnavailableFileStoragePort} from '/app/apps/backend/dist/ports/file-storage.js';const app=buildApp(async()=>false,{database:{},identityVerifier:{verifyBearerToken:async()=>{throw Error('NO_CREDENTIAL')}},fileStorage:new UnavailableFileStoragePort()});await app.ready();const statuses={};for(const p of ['/api/v1/auth/me/authorization','/api/v2/auth/me/authorization','/api/v1/auth/providers'])statuses[p]=(await app.inject(p)).statusCode;console.log(JSON.stringify({statuses,routes:app.printRoutes({commonPrefix:false})}));await app.close();"""
p=subprocess.run(['docker','run','--rm','--platform','linux/amd64','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','-w','/app/apps/backend',image,'node','--input-type=module','-e',code],capture_output=True,text=True,timeout=30);assert p.returncode==0,'CANDIDATE_RUNTIME_FAILED';j=json.loads(next(s for s in p.stdout.splitlines()if s.startswith('{')and'"statuses"'in s));previous=pathlib.Path('/tmp/tcdx-integral-20261013/previous-route-tree.txt').read_text();saved=pathlib.Path('/tmp/tcdx-integral-20261013/candidate-route-tree.txt').read_text()
def rows(tree):return {re.sub(r'^[│ ├─└]+','',x).strip()for x in tree.splitlines()if '('in x}
a=rows(previous);b=rows(j['routes']);removed=a-b;added=b-a
assert removed=={'/api/v1/auth/me/authorization (GET, HEAD)'},removed
assert added=={'/api/v2/auth/me/authorization (GET, HEAD)'},added
assert b==rows(saved),'CANDIDATE_ROUTE_EVIDENCE_CHANGED'
assert list(j['statuses'].values())==[404,401,200],j['statuses']
result={'image':image,'OTHER_V1_ROUTE_CHANGED':'CLOSED_PASS','allOtherRegisteredMethodPaths':'PASS_IDENTICAL','removed':sorted(removed),'added':sorted(added),'statuses':j['statuses'],'network':'none','databaseQueries':0,'historicalRouteTreeSHA':hashlib.sha256(previous.encode()).hexdigest(),'currentRouteTreeSHA':hashlib.sha256(j['routes'].encode()).hexdigest()}
out=pathlib.Path('docs/phase6a/STEP_6A3/CONSOLIDATED_APPROVAL_20261009/evidence/rescue-20261013/final-route-proof.json');out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
