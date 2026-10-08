from pathlib import Path
import subprocess, json, sys, concurrent.futures

T=Path('/private/tmp')
N='tcdx-grc-phase5-integration'
phase=sys.argv[1]
if phase=='inspect':
 import datetime
 stamp=json.loads((T/(N+'-pre-db.json')).read_text())['capturedAt']
 base=(T/(N+'-authority.mjs')).read_text()
 query=' const concurrentAudit=await gq(`SELECT audit_event_id,event_code,command_code,aggregate_id,actor_user_identity_id,tenant_id,correlation_id,occurred_at,outcome,after_payload->>\'issuer\' AS issuer,after_payload->>\'provider\' AS provider FROM ops_audit.audit_events WHERE occurred_at>$1::timestamptz ORDER BY occurred_at`,['+json.dumps(stamp)+']);\n const concurrentIdentities=await gq(`SELECT user_identity_id,lifecycle_state,last_authenticated_at,updated_at,row_version FROM iam.user_identities ORDER BY user_identity_id`);\n'
 query += ' const priorLogin=await gq(`SELECT max(occurred_at) AS previous_at FROM ops_audit.audit_events WHERE command_code=\'oidc.session.establish\' AND actor_user_identity_id=\'01a0cfae-d860-730d-88b8-d8b1b3f5d7dc\' AND occurred_at<=$1::timestamptz`,['+json.dumps(stamp)+']);\n'
 query += ''' const authColumns=(await gq("SELECT column_name FROM information_schema.columns WHERE table_schema='iam' AND table_name='user_identities'")).filter(x=>/password|secret|token|credential|identity_key|request_hash|response_hash|idempotency_key|payload|nonce|verifier|session/i.test(x.column_name)).map(x=>x.column_name);
 const auditColumns=(await gq("SELECT column_name FROM information_schema.columns WHERE table_schema='ops_audit' AND table_name='audit_events'")).filter(x=>/password|secret|token|credential|identity_key|request_hash|response_hash|idempotency_key|payload|nonce|verifier|session/i.test(x.column_name)).map(x=>x.column_name);
 const priorIdentityFingerprint=await gq(`WITH rows AS(SELECT CASE WHEN user_identity_id='01a0cfae-d860-730d-88b8-d8b1b3f5d7dc' THEN to_jsonb(t)||jsonb_build_object('last_authenticated_at',$2::timestamptz,'updated_at',$2::timestamptz,'row_version',row_version-1) ELSE to_jsonb(t) END-$1::text[] AS row FROM iam.user_identities t) SELECT count(*)::int AS rows,md5(coalesce(string_agg(md5(row::text),'' ORDER BY md5(row::text)),'')) AS nonsecret_fingerprint FROM rows`,[authColumns,priorLogin[0].previous_at]);
 const priorAuditFingerprint=await gq(`SELECT count(*)::int AS rows,md5(coalesce(string_agg(md5((to_jsonb(t)-$1::text[])::text),'' ORDER BY md5((to_jsonb(t)-$1::text[])::text)),'')) AS nonsecret_fingerprint FROM ops_audit.audit_events t WHERE occurred_at<=$2::timestamptz`,[auditColumns,''' +json.dumps(stamp)+''']);\n'''
 base=base.replace(' const result={membershipDetails',query+' const result={priorIdentityFingerprint,priorAuditFingerprint,priorLogin,concurrentAudit,concurrentIdentities,membershipDetails')
 (T/(N+'-inspection.mjs')).write_text(base)
 py=(T/(N+'-authority.py')).read_text().replace(N+'-authority.mjs',N+'-inspection.mjs').replace(N+'-authority-',N+'-inspection-')
 (T/(N+'-inspection.py')).write_text(py)
 subprocess.run(['python3',str(T/(N+'-inspection.py')),'readonly'],check=True)
 result=json.loads((T/(N+'-inspection-readonly.json')).read_text())
 print(json.dumps({k:result[k] for k in ['concurrentAudit','concurrentIdentities']}));sys.exit()
assert phase in ['pre','post']
for source,target in [
 ('tcdx-grc-phase5-final-authority.py',N+'-authority.py'),
 ('tcdx-grc-phase5-final-authority.mjs',N+'-authority.mjs'),
 ('tcdx-grc-phase5-methodology-runtime-capture.py',N+'-runtime-capture.py'),
 ('tcdx-grc-phase5-final-snapshot.mjs',N+'-snapshot.mjs'),
 ('tcdx-grc-phase5-recovery-core-state.mjs',N+'-core-state.mjs'),
 ('tcdx-grc-phase5-final-public.py',N+'-public.py')]:
 s=(T/source).read_text()
 s=s.replace('tcdx-grc-phase5-final-',N+'-').replace('tcdx-grc-phase5-methodology-runtime-',N+'-runtime-').replace('tcdx-grc-phase5-recovery-core-state',N+'-core-state')
 if target.endswith('-authority.mjs'):
  extra="""
 const membershipDetails=await gq(`SELECT m.tenant_membership_id,m.tenant_id,t.tenant_code,m.membership_state,m.joined_at,m.ended_at,m.created_at,m.created_by_user_identity_id FROM iam.tenant_memberships m JOIN platform.tenants t USING(tenant_id) WHERE m.user_identity_id=$1`,[id]);
 const membershipOriginAudits=await gq(`SELECT audit_event_id,event_code,command_code,aggregate_id,actor_user_identity_id,tenant_id,correlation_id,occurred_at,outcome,after_payload->>'reason' AS reason FROM ops_audit.audit_events WHERE aggregate_id IN(SELECT tenant_membership_id FROM iam.tenant_memberships WHERE user_identity_id=$1) OR (after_payload->>'user_identity_id'=$1::text AND command_code IN('tenantUserOnboardingCreate','membershipInvitationCreate','membershipInvitationAccept')) ORDER BY occurred_at`,[id]);
 """
  s=s.replace(' const result={extra,keycloakExactlyOne:',extra+' const result={membershipDetails,membershipOriginAudits,extra,keycloakExactlyOne:')
 (T/target).write_text(s)

node='/tmp/tcdx-grc-npm-cache/_npx/5dad66f2cb301fc2/node_modules/node/bin/node'
commands=[
 ['python3',str(T/(N+'-authority.py')),phase],
 ['python3',str(T/(N+'-runtime-capture.py')),'after'],
 [node,str(T/(N+'-snapshot.mjs')),'postdeploy'],
 [node,str(T/(N+'-core-state.mjs'))],
 ['python3',str(T/(N+'-public.py')),phase]
]
def run(cmd):
 p=subprocess.run(cmd,capture_output=True,text=True)
 if p.returncode:
  print(json.dumps({'readOnlyCheck':'BLOCKED','script':Path(cmd[1]).name,'sanitizedOutput':p.stdout[-900:]}))
  raise RuntimeError('READ_ONLY_CHECK_FAILED_'+Path(cmd[1]).name)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
 for f in [ex.submit(run,c) for c in commands]: f.result()
out={}
for name,file in [('authority','authority-'+phase),('runtime','runtime-after'),('db','qa-postdeploy'),('core','core-state'),('public','public-'+phase)]:
 d=json.loads((T/(N+'-'+file+'.json')).read_text())
 (T/(N+'-'+phase+'-'+name+'.json')).write_text(json.dumps(d,indent=2)+'\n')
 out[name]=d
a=out['authority'];db=out['db'];r=out['runtime']
assert a['pass'] and a['otp']==1 and a['requiredActions']==[]
assert db['identity']['read_only']=='on' and db['ledgerMatchesManifest'] and not db['pendingIds']
assert (db['migrations'],db['latest'],db['physicalTables'],db['publishedPermissions'])==(30,'20261007000200',237,172)
assert all(c['running'] and c['health']=='healthy' for c in r['components'])
assert all(v['expectedStatus'] for v in out['public'].values())
print(json.dumps({'phase':phase,'qaReadOnly':'PASS','membership':a['membership'],'tenantRoles':a['tenantRoles'],'platformAdmin':a['activePlatformAdmin'],'membershipDetails':a['membershipDetails'],'membershipOriginAudits':a['membershipOriginAudits'],'schemaSha256':db['schemaSha256'],'migrations':db['migrations'],'latest':db['latest'],'tables':db['physicalTables'],'permissions':db['publishedPermissions']}))
