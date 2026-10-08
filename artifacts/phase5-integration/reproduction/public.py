import subprocess,json,socket,sys
from pathlib import Path
edge=socket.gethostbyname('grc.tecdex.net');assert edge!='127.0.0.1'
for host in ['grc.tecdex.net','iam.grc.tecdex.net']:
 dns=subprocess.check_output(['dig','+short',host,'A'],text=True).strip().splitlines();assert dns==[edge],'PUBLIC_DNS_INCONSISTENT'
urls={'grc':'https://grc.tecdex.net/','discovery':'https://iam.grc.tecdex.net/realms/tcdx-managed-identity/.well-known/openid-configuration','jwks':'https://iam.grc.tecdex.net/realms/tcdx-managed-identity/protocol/openid-connect/certs','admin_root':'https://iam.grc.tecdex.net/admin','admin_console':'https://iam.grc.tecdex.net/admin/master/console/','admin_rest':'https://iam.grc.tecdex.net/admin/realms','master_root':'https://iam.grc.tecdex.net/realms/master','master_discovery':'https://iam.grc.tecdex.net/realms/master/.well-known/openid-configuration','master_auth':'https://iam.grc.tecdex.net/realms/master/protocol/openid-connect/auth'};out={}
for key,url in urls.items():
 host=url.split('/')[2];p=subprocess.run(['curl','--silent','--show-error','--max-time','15','--resolve',host+':443:'+edge,'--write-out','\n%{http_code}',url],capture_output=True,text=True) if key!='onboarding_route' else subprocess.run(['curl','--silent','--show-error','--max-time','15','--resolve',host+':443:'+edge,'--request','POST','--header','Content-Type: application/json','--data','{}','--write-out','\n%{http_code}',url],capture_output=True,text=True);assert not p.returncode
 body,status=p.stdout.rsplit('\n',1);out[key]={'status':int(status),'public_edge':edge,'tls_verified':True}
 if key=='discovery':
  out[key]['issuer']=json.loads(body)['issuer'];assert out[key]['issuer']=='https://iam.grc.tecdex.net/realms/tcdx-managed-identity'
 if key=='jwks':
  out[key]['key_count']=len(json.loads(body)['keys']);assert out[key]['key_count']>0
 if key in ['discovery_route','onboarding_route']:out[key]['problemCode']=json.loads(body)['code'];assert out[key]['problemCode']=='TCDX.AUTHENTICATION.REQUIRED'
 out[key]['expectedStatus']=int(status)==(200 if key in ['grc','discovery','jwks'] else 401 if key in ['discovery_route','onboarding_route'] else 404)
 assert out[key]['expectedStatus']
Path('/tmp/tcdx-grc-phase5-integration-public-'+sys.argv[1]+'.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
