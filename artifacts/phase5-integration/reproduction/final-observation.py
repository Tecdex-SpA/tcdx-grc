from pathlib import Path
import json,subprocess,hashlib,datetime,re,tarfile,io
R=Path('/Users/andresbarouh/repos/tcdx-grc');E=R/'artifacts/phase5-integration';T=Path('/private/tmp');N='tcdx-grc-phase5-integration'
load=lambda p:json.loads(Path(p).read_text());sha=lambda b:hashlib.sha256(b).hexdigest();now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def git(*a):return subprocess.check_output(['git',*a],cwd=R).decode().strip()
def write(p,d):p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
assert git('branch','--show-current')=='main' and git('rev-parse','HEAD')==git('rev-parse','origin/main')=='7225f1ee607c0c9be5c810976f66c3c27a40e06c'
required=['unit','frontend','postgres','grc-e2e-retry','grc-affected','iam-e2e','typecheck','lint','contracts','openapi','rector','secrets']
receipts={};codeLogs={}
with tarfile.open(E/'FINAL_MAIN_OBSERVATION_RAW_OUTPUTS.tar','w',format=tarfile.USTAR_FORMAT) as tar:
 for n in required+['grc-e2e','public-last','assets-retry','assets-check']:
  d=load(T/(N+'-final-main-'+n+'-receipt.json'));assert d['exitCode']==0 if n in required+['assets-retry'] else d['exitCode']==1,n
  b=(T/(N+'-final-main-'+n+'.log')).read_bytes();info=tarfile.TarInfo('final-main-'+n+'.log');info.mode=0o644;info.mtime=0;info.size=len(b);tar.addfile(info,io.BytesIO(b));d['rawOutputSha256']=sha(b);receipts[n]=d
  if n in required:codeLogs[n]=b.decode()
counts={}
for n in ['unit','frontend','postgres','grc-e2e-retry','iam-e2e']:
 m=re.search(r'Tests\s+(\d+) passed',codeLogs[n]) or re.search(r'(\d+) passed \(',codeLogs[n]);assert m,n;counts[n]=int(m[1])
assert counts=={'unit':485,'frontend':81,'postgres':82,'grc-e2e-retry':428,'iam-e2e':21}
subprocess.run(['git','fsck','--full','--no-dangling'],check=True,cwd=R)
assert not git('diff','--name-only') and not git('diff','--cached','--name-only')
changed=git('diff','--name-only','3735794392b663ed3ce9e39bee248b2937ee7158..HEAD').splitlines();assert len(changed)==38 and all(p.startswith('artifacts/phase5-integration/') or p=='docs/governance/MASTER_EXECUTION_STATUS.md' for p in changed)
peer=load(T/(N+'-public-peer.json'));assert peer['canonicalURLsOnly'] and all(x['returnCode']==7 for x in peer['results'].values())
db=load(T/(N+'-qa-postdeploy.json'));runtime=load(T/(N+'-runtime-after.json'));authority=load(T/(N+'-authority-post.json'));core=load(T/(N+'-core-state.json'));historic=load(E/'PHASE5_QA_READONLY_POST.json')
assert (db['migrations'],db['latest'],db['physicalTables'],db['publishedPermissions'])==(30,'20261007000200',237,172)
assert db['schemaSha256']==historic['db']['schemaSha256'] and db['ledger']==historic['db']['ledger'] and db['identity']['read_only']=='on'
assert (authority['activePlatformAdmin'],authority['membership'],authority['tenantRoles'],authority['otp'])==(1,1,0,1)
for c,h in zip(runtime['components'],historic['runtime']['components']):
 assert c['running'] and c['health']=='healthy'
 for k in ['imageId','containerId','configurationFingerprint','startedAt','restartCount']:assert c[k]==h[k]
write(E/'PHASE5_FINAL_MAIN_CODE_REGRESSION.json',{'capturedAt':now,'mainCommit':git('rev-parse','HEAD'),'mainTree':git('rev-parse','HEAD^{tree}'),'functionalSourceUnchanged':True,'counts':counts,'requiredCodeGates':'PASS','receipts':receipts,'initialFinalTreeE2ETimeout':'Preserved427 pass/1 timeout; affected original case passed12 repeated viewport executions and complete original428 suite passed with unchanged limits. No source or test assertion changed.','gitIntegrity':'PASS','rawArchiveSha256':sha((E/'FINAL_MAIN_OBSERVATION_RAW_OUTPUTS.tar').read_bytes())})
result=load(E/'PHASE5_INTEGRATION_RESULT.json');result.update(STEP_23M_PHASE5_GIT_INTEGRATION='BLOCKED',RECTOR_GATE='BLOCKED',PHASE_5_INTEGRATION='BLOCKED',QA_HEALTH='BLOCKED_CANONICAL_PUBLIC_HTTPS_CONNECTION',SAFE_TO_COMMIT='NO',PHASE_5_INTEGRATION_PENDING='YES',NEXT_REQUIRED_ACTION='RESTORE_STABLE_CANONICAL_HTTPS_CONNECTIVITY_AND_REPEAT_FINAL_READONLY_QA_GATE')
result.update(FINAL_MAIN_COMMIT=git('rev-parse','HEAD'),FINAL_MAIN_TREE=git('rev-parse','HEAD^{tree}'),EVIDENCE_COMMIT='ac5692c6c5d566a773adfa051aaa7a43c8d9d4c5',EVIDENCE_PR='https://github.com/Tecdex-SpA/tcdx-grc/pull/19',FINAL_MAIN_CODE_REGRESSION='PASS',PRECOMMIT_GATES_AT_AUTHORIZED_COMMIT='PASS',SAFE_TO_COMMIT_AT_AUTHORIZED_COMMIT='YES',FIRST_POSTINTEGRATION_QA_HEALTH='PASS',FINAL_READONLY_QA_GATE='BLOCKED',CURRENT_BLOCKER='Connection refusal on canonical public IPv4 from Mac and QA VM; a transient GRC200/assets parity was observed after owner restoration notice but subsequent final probes fail again. Caddy proxy SSH diagnostic timed out; cause unestablished.',PENDING_LOCAL_INCIDENT_PUBLICATION='NOT_STAGED_NO_COMMIT_WHILE_FINAL_MATERIAL_GATE_BLOCKED')
write(E/'PHASE5_FINAL_READONLY_INCIDENT_RESULT.json',result)
write(E/'PHASE5_FINAL_QA_OBSERVATION.json',{'capturedAt':now,'publicPeerProbe':peer,'localPublicProbe':receipts['public-last'],'transientPublicGRC200AndAssetsParity':receipts['assets-retry'],'subsequentPublicAssetsFailure':receipts['assets-check'],'dnsRecordsUnchanged':True,'proxySSHReadOnlyDiagnostic':'TIMEOUT192.168.2.4:22; no state or root cause inferred','database':{k:db[k] for k in ['capturedAt','migrations','latest','physicalTables','publishedPermissions','schemaSha256','ledgerMatchesManifest','pendingIds']},'runtime':runtime,'authority':{k:authority[k] for k in ['capturedAt','enabled','activePlatformAdmin','membership','tenantRoles','otp','readOnly']},'noAgentFunctionalSQLWrites':True,'noIAMMutation':True,'noDeploy':True})
(E/'PHASE5_FINAL_READONLY_INCIDENT.md').write_text(f'''# Final QA read-only gate — BLOCKED

Observed {now}. Main is already integrated and published at7225f1ee607c0c9be5c810976f66c3c27a40e06c via protected PR18 and19, both rector CI PASS. Feature commit ae051f81d429a5eba371972b1e958976fa7f8857 exactly531 paths; documentation evidence commit ac5692c6c5d566a773adfa051aaa7a43c8d9d4c5 exactly38 paths. No history is rewritten.

All current final-main code regressions PASS:485 unit/contract,81 frontend,82 PostgreSQL isolated,428 GRC E2E,21 IAM E2E; typecheck/lint, OpenAPI/matrix/permissions/RBAC/scope/contract/rector integrity, secret/domain/Git checks. One additional GRC case timed out on initial final-tree run; the unchanged original case passes12 repeated viewport executions and the unchanged complete suite passes428. No source, assertion or timeout is modified for recovery.

First postintegration QA READ ONLY and public HTTPS/OIDC/JWKS checks passed and remain preserved in committed evidence. Later final public probes fail from Mac and the QA frontend VM at unchanged canonical DNS181.212.166.187. The owner reported URL restoration; one fresh GRC200/assets parity then passed, but subsequent GRC and IAM canonical public probes again refuse connections (curl7/no HTTP response). Approved Caddy host192.168.2.4 SSH-only status diagnostic timed out. No claim about global availability, Caddy service state or root cause is made.

Current QA three images/configurations/container identities/restarts remain exact and healthy; DB30/latest20261007000200/237/172, ledger/schema unchanged, andres.grc1/1/0/OTP1/enabled. Public transport is the sole final material blocker. No agent QA deploy, SQL write, IAM change, DNS/alias/fallback or Phase6 work occurred. All original PASS records remain historical observations; this new later incident blocks declaring current STEP23M complete.

Latest result: PHASE5_FINAL_READONLY_INCIDENT_RESULT.json. Main integration/push/remote verification and code regression stay PASS; final QA gate and overall STEP23M BLOCKED; integration closure pendingYES. This incident and append are local and unstaged: no new commit or push while the final material gate is blocked. Next: restore stable canonical HTTPS connectivity, rerun the final read-only QA gate, then publish the new observed closure evidence through the authorized normal governed procedure. No runtime correction is authorized by STEP23M.
''')
marker='## 2026-10-08 — STEP 23M later final QA transport incident after main evidence integration'
status=R/'docs/governance/MASTER_EXECUTION_STATUS.md';assert marker not in status.read_text()
with status.open('a') as f:f.write('\n\n'+marker+'\n\n'+ '\n'.join(k+'='+str(result[k]) for k in ['STEP_23M_PHASE5_GIT_INTEGRATION','RECTOR_GATE','UNRESOLVED_RECTOR_CONFLICTS','PHASE_5_INTEGRATION','PHASE_5_INTEGRATION_PENDING','MAIN_INTEGRATION','PUSH_ORIGIN_MAIN','REMOTE_MAIN_COMMIT_VERIFIED','POST_INTEGRATION_REGRESSION','QA_HEALTH','SAFE_TO_COMMIT','PHASE_6','PHASE_6_STARTED','QA_DEPLOY_PERFORMED','QA_FUNCTIONAL_MUTATIONS','IAM_MUTATIONS','NEXT_REQUIRED_ACTION'])+'\n\nMain7225f1e and protected PR18/19 remain published, source preserved and current final-main485/81/82/428/21 code regressions PASS. First postintegration QA/public checks PASS remain historical records. A later canonical public connection outage persists in agent and QA-peer probes despite a transient fresh GRC200/assets success after owner restoration notice. No HTTP response in latest probes; proxy SSH status diagnostic timed out, cause unestablished. QA images/config/container health and DB30/237/172/schema/authority remain unchanged. Overall final gate is BLOCKED only by current HTTPS/OIDC/JWKS transport evidence. Preserve all earlier observations; no new commit/push until material final gate PASS. Local unstaged evidence: artifacts/phase5-integration/PHASE5_FINAL_READONLY_INCIDENT.md and companion latest result/QA/code proofs. No agent runtime or authority mutation, no Phase6.\n')
new=sorted([str(p.relative_to(R)) for p in E.glob('PHASE5_FINAL_*') if not subprocess.check_output(['git','ls-files','--',str(p.relative_to(R))],cwd=R).strip()]+['artifacts/phase5-integration/FINAL_MAIN_OBSERVATION_RAW_OUTPUTS.tar','docs/governance/MASTER_EXECUTION_STATUS.md'])
write(T/'tcdx-grc-phase5-integration-local-incident-manifest.json',{'paths':[{'path':p,'sha256':sha((R/p).read_bytes()),'scope':'LATEST_READONLY_OBSERVATION_OR_APPEND','staged':False} for p in new],'reason':'Final material public QA gate blocked; no new Git publication authorized until PASS.'})
print(json.dumps({'main':result['FINAL_MAIN_COMMIT'],'codeRegression':'PASS','qaFinalGate':'BLOCKED','latestResult':'artifacts/phase5-integration/PHASE5_FINAL_READONLY_INCIDENT_RESULT.json','pendingLocalIncidentPaths':len(new)}))
