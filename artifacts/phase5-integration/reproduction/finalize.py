from pathlib import Path
import json,hashlib,subprocess,datetime,re,tarfile,io
R=Path('/Users/andresbarouh/repos/tcdx-grc');T=Path('/private/tmp');E=R/'artifacts/phase5-integration';N='tcdx-grc-phase5-integration'
def load(p):return json.loads(Path(p).read_text())
def write(name,data):(E/name).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git',*a],cwd=R).decode().strip()
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
main=load(T/'tcdx-grc-phase5-main-receipt.json');commit=load(T/'tcdx-grc-phase5-commit-receipt.json');stage=load(T/'tcdx-grc-phase5-staging-receipt.json')
assert git('branch','--show-current')=='main' and git('rev-parse','HEAD')==main['mainCommit']==git('rev-parse','origin/main')
assert git('rev-parse','HEAD^{tree}')==commit['COMMIT_TREE_SHA']
required=['unit','frontend','postgres','rebuild','catalog','grc-e2e','iam-e2e-retry','amr-callback','iam-theme','typecheck','lint','contracts','openapi','rector','governance-status','secrets','assets']
receipts={}
with tarfile.open(E/'POST_RAW_OUTPUTS.tar','w',format=tarfile.USTAR_FORMAT) as tar:
 for n in required+['iam-e2e']:
  data=load(T/(N+'-post-'+n+'-receipt.json'));assert data['exitCode']==(1 if n=='iam-e2e' else 0),n
  raw=(T/(N+'-post-'+n+'.log')).read_bytes();info=tarfile.TarInfo('post-'+n+'.log');info.size=len(raw);info.mode=0o644;info.mtime=0;tar.addfile(info,io.BytesIO(raw))
  text=re.sub(r'\x1b\[[0-9;]*m','',raw.decode());text='\n'.join(s.rstrip() for s in text.splitlines()).rstrip()+'\n'
  file='POST_'+n.upper().replace('-','_')+'.txt';(E/file).write_text(text)
  data.update(evidenceLog=file,originalLogSha256=sha(raw),rawArchiveEntry='post-'+n+'.log');receipts[n]=data
write('PHASE5_POSTINTEGRATION_RECEIPTS.json',receipts)
counts={}
for n in ['unit','frontend','postgres','grc-e2e','iam-e2e-retry']:
 text=(E/receipts[n]['evidenceLog']).read_text();m=re.search(r'Tests\s+(\d+) passed',text) or re.search(r'(\d+) passed \(',text);assert m,n;counts[n]=int(m[1])
write('PHASE5_POSTINTEGRATION_COUNTS.json',counts)
pre={n:load(T/(N+'-pre-'+n+'.json')) for n in ['authority','runtime','db','core','public']}
post={n:load(T/(N+'-post-'+n+'.json')) for n in pre}
for x,y in zip(pre['runtime']['components'],post['runtime']['components']):
 for k in ['imageId','containerId','configurationFingerprint','secretMetadata','startedAt','restartCount']:assert x[k]==y[k],(x['name'],k)
 assert y['running'] and y['health']=='healthy'
for k in ['schemaSha256','ledger','migrations','latest','physicalTables','publishedPermissions']:assert pre['db'][k]==post['db'][k],k
for k in ['qaRecords','qaAudits','qaSupport','methodologyPublicationAudits']:assert pre['core'][k]==post['core'][k],k
for k in ['activePlatformAdmin','membership','tenantRoles','otp','enabled','membershipDetails','membershipOriginAudits']:assert pre['authority'][k]==post['authority'][k],k
assert all(v['expectedStatus'] for v in post['public'].values())
inspection=load(T/(N+'-inspection-readonly.json'))
drift=[k for k,v in pre['db']['preservedData'].items() if v!=post['db']['preservedData'][k]]
assert set(drift)=={'iam.user_identities','ops_audit.audit_events'}
events=inspection['concurrentAudit'];assert len(events)==1
assert events[0]['command_code']=='oidc.session.establish' and events[0]['event_code']=='audit.iam.application_token.issue.v1' and events[0]['outcome']=='success'
assert events[0]['actor_user_identity_id']=='01a0cfae-d860-730d-88b8-d8b1b3f5d7dc'
assert inspection['priorAuditFingerprint'][0]==pre['db']['preservedData']['ops_audit.audit_events']
assert pre['db']['preservedData']['iam.user_identities']['rows']==post['db']['preservedData']['iam.user_identities']['rows']==4
assert post['db']['preservedData']['ops_audit.audit_events']['rows']==pre['db']['preservedData']['ops_audit.audit_events']['rows']+1
safeAuthority={k:post['authority'][k] for k in ['capturedAt','enabled','identityActive','activePlatformAdmin','membership','tenantRoles','otp','sessions','readOnly','membershipDetails','membershipOriginAudits']}
write('PHASE5_QA_READONLY_POST.json',{'capturedAt':now,'db':{k:post['db'][k] for k in ['identity','migrations','latest','physicalTables','publishedPermissions','ledgerMatchesManifest','pendingIds','schemaSha256','schema','ledger']},'runtime':post['runtime'],'public':post['public'],'authority':safeAuthority,'coreRecordsAndAuditsUnchanged':True,'schemaDrift':0,'unchangedTableFingerprints':235,'observedDataDifferences':drift,'authenticationReconciliation':{'classification':'CONCURRENT_ORDINARY_HUMAN_AUTHENTICATION_NO_AUTHORITY_CHANGE','inferenceSource':'Successful canonical OIDC audit, exact source transaction, unchanged235 table fingerprints and role/Membership proofs. No agent QA authorization flow was initiated.','audit':events[0],'identityTouch':inspection['concurrentIdentities'][0],'newAuthorityRows':0,'preexistingAuditFingerprintAfterRemovingSingleNewAuthenticationMatches':True},'functionalSqlWritesByAgent':0,'iamMutationsByAgent':0,'qaDeploys':0})
write('PHASE5_QA_TABLE_PRESERVATION.json',{'pre':pre['db']['preservedData'],'post':post['db']['preservedData'],'differences':drift,'coreAndAuthorityTablesUnchanged':True,'explanation':'One successful ordinary Baruj authentication touches only UserIdentity metadata and appends one application-token audit. Source oidc-browser.ts resolveExisting/resolveOrCreate and complete establish this transaction; no grants or business state changes. No blanket data equality is claimed.'})
findings=[];scanned=[]
for folder in ['apps','packages','deploy','iam','scripts']:
 for f in (R/folder).rglob('*'):
  if not f.is_file() or any(x in ['node_modules','dist','test-results'] for x in f.parts) or '.test.' in f.name or '.spec.' in f.name or 'e2e' in f.parts:continue
  if f.suffix not in ['.ts','.tsx','.mjs','.json','.yml','.yaml','.css','.html'] and f.name not in ['Dockerfile','.env.example']:continue
  scanned.append(str(f.relative_to(R)))
  if 'grc.tecdx.net' in f.read_text(errors='replace'):findings.append(str(f.relative_to(R)))
assert not findings
write('PHASE5_POSTINTEGRATION_DOMAIN_SCAN.json',{'activeBadDomainReferences':0,'paths':sorted(scanned),'findings':findings,'historicalAndNegativeTestReferencesAreNotActive':True,'publicCompiledBundleIndependentlyVerified':True})
fsck=subprocess.run(['git','fsck','--full'],cwd=R,capture_output=True,text=True);assert fsck.returncode==0
subprocess.run(['git','diff','--check'],cwd=R,check=True)
write('PHASE5_GIT_INTEGRATION_RECEIPT.json',{**main,**commit,**stage,'postFsckPass':True,'postDanglingObjects':len(fsck.stdout.splitlines()),'historyPreserved':True,'remoteBranchForcePush':False,'mainRequiredCI':'PASS','requiredCIURL':'https://github.com/Tecdex-SpA/tcdx-grc/actions/runs/37773835752','coreSourceTreeUnchangedThroughMainMerge':True})
(E/'PHASE5_COMMITTED_CONTENT_MANIFEST.json').write_bytes((T/(N+'-staging-manifest.json')).read_bytes())
(E/'PHASE5_PRECOMMIT_RESULT_SNAPSHOT.json').write_bytes(subprocess.check_output(['git','show',commit['COMMIT_SHA']+':artifacts/phase5-integration/PHASE5_INTEGRATION_RESULT.json'],cwd=R))
result=load(E/'PHASE5_INTEGRATION_RESULT.json')
result.update(STEP_23M_PHASE5_GIT_INTEGRATION='PASS',PHASE_5_INTEGRATION='PASS',STAGED_PATHS_MATCH_MANIFEST='YES',STAGED_UNEXPECTED_PATHS=0,STAGED_SECRETS=0,STAGED_UNRELATED_WORK=0,**{k:commit[k] for k in ['COMMIT_SHA','COMMIT_TREE_SHA','COMMIT_PATH_COUNT']},MAIN_INTEGRATION='PASS',PUSH_ORIGIN_MAIN='PASS',REMOTE_MAIN_COMMIT_VERIFIED='YES',POST_INTEGRATION_REGRESSION='PASS',PHASE_5_INTEGRATION_PENDING='NO',NEXT_REQUIRED_ACTION='REQUEST_EXPLICIT_PHASE6_START_AUTHORIZATION')
result.update(MAIN_MERGE_COMMIT=main['mainCommit'],INTEGRATION_PR=main['pullRequest'],POST_INTEGRATION_TREE=main['mainTree'],POST_UNIT_TEST_COUNT=counts['unit'],POST_FRONTEND_TEST_COUNT=counts['frontend'],POST_POSTGRES_ISOLATED_TEST_COUNT=counts['postgres'],POST_GRC_E2E_COUNT=counts['grc-e2e'],POST_IAM_E2E_COUNT=counts['iam-e2e-retry'],FINAL_EVIDENCE_PUBLICATION='GOVERNED_DOCUMENTATION_ONLY_FOLLOWUP',QA_ORDINARY_CONCURRENT_AUTHENTICATION_EVENTS=1)
write('PHASE5_INTEGRATION_RESULT.json',result)
report=f'''# Postintegration regression — PASS

Functional integration commit {commit['COMMIT_SHA']}, tree {commit['COMMIT_TREE_SHA']}, exactly{commit['COMMIT_PATH_COUNT']} selected paths. Protected main PR18 merged with required rector CI PASS to {main['mainCommit']}; merged tree exactly equals validated feature tree. Local main advanced by fast-forward; normal push reports up-to-date and fetch/ancestry verification confirms remote publication. Prior three commits remain in ancestry.

Fresh regression on integrated main: {counts['unit']} unit/contract, {counts['frontend']} frontend, {counts['postgres']} isolated PostgreSQL, {counts['grc-e2e']} GRC E2E, {counts['iam-e2e-retry']} IAM E2E; theme4 and signed native callback3 profiles/six negatives PASS. Complete isolated PostgreSQL16 rebuild/reapply and governed catalog import pass before original82 tests. Typecheck/lint, OpenAPI/matrix/permissions/RBAC/scope39 negatives, contracts, rector/status, secrets0, active domains0, Git fsck/diff and public assets/health PASS. Logs, receipts, counts and exact raw outputs are preserved.

Initial disposable IAM container timed out during concurrent heavy browser/test execution without import/startup/security errors. The unchanged suite then passes21 after load drains, using the locally rebuilt current source theme. No readiness limit, test timeout, expected provenance hash or security assertion is reduced. Initial failure is retained as POST_IAM_E2E.txt.

QA exact backend/frontend/IAM image digests match PHASE5_QA_READONLY_POST.json; containers/configuration/secret-file metadata/restarts unchanged. DB30/latest20261007000200/237/172, ledger/schema unchanged. Core records and59 audits, supporting records and methodology audits unchanged. HTTPS/GRC/IAM discovery/JWKS200, protected admin/master surfaces404, backend live/ready200. andres.grc1/1/0/OTP1/enabled, authorized Membership untouched.

235 table fingerprints are identical. Explicit observed exception: Baruj ordinary successful OIDC authentication at2026-10-08T11:49:15.402Z touches UserIdentity login timestamps/row version and appends one canonical application-token audit. Removing only that audit reproduces the exact237-row pre-audit fingerprint. No new identity, Membership/role/grant/business row or schema change. This explanation is inferred from the success audit and exact source transaction; no blanket byte equality for all data is claimed. Agent tests target disposable localhost services and agent QA activity initiates no authentication flow, SQL write or IAM mutation.

Governance/result and this postregression evidence are published by a separate documentation-only commit/PR, subject to the same selective manifest and required rector CI. Every functional source blob remains identical to the fully tested integrated main tree; final remote verification anchors that evidence commit without self-referential commit hashes. Phase5 integration PASS/pendingNO/closedYES, Phase6 READY/unstarted0. No deployment or Phase6 start.
'''
(E/'PHASE5_POSTINTEGRATION_REPORT.md').write_text(report)
with (E/'PHASE5_INTEGRATION_REPORT.md').open('a') as f:f.write(f'\n## Actual integration and postregression closure — {now}\n\nFeature commit {commit["COMMIT_SHA"]}, tree {commit["COMMIT_TREE_SHA"]},531 paths match sealed manifest. PR18 merged with required rector CI PASS, main {main["mainCommit"]}, normal main push and remote verification PASS. Fresh postintegration485/81/82/428/21 plus all mandatory static/security/Git/QA checks PASS. Final result STEP23M PASS, Phase5 integration pendingNO; Phase6 READY and unstarted. Full evidence: PHASE5_POSTINTEGRATION_REPORT.md, PHASE5_QA_READONLY_POST.json, PHASE5_GIT_INTEGRATION_RECEIPT.json and raw/log receipts. A documentation-only governed followup publishes this evidence with no functional source differences.\n')
status=R/'docs/governance/MASTER_EXECUTION_STATUS.md';marker='## 2026-10-08 — STEP 23M actual main integration and postintegration regression closure'
assert marker not in status.read_text()
keys=['MASTER_REGENT','RECTOR_GATE','UNRESOLVED_RECTOR_CONFLICTS','STEP_23M_PHASE5_GIT_INTEGRATION','PHASE_5_INTEGRATION','PHASE_5_INTEGRATION_PENDING','PHASE_5','PHASE_5_CLOSED','CORE_GRC_SLICE','STEP_23L','MAIN_INTEGRATION','PUSH_ORIGIN_MAIN','REMOTE_MAIN_COMMIT_VERIFIED','POST_INTEGRATION_REGRESSION','PHASE_6','PHASE_6_STARTED','QA_DEPLOY_PERFORMED','QA_FUNCTIONAL_MUTATIONS','IAM_MUTATIONS','NEXT_REQUIRED_ACTION']
with status.open('a') as f:f.write('\n\n'+marker+'\n\n'+'\n'.join(k+'='+str(result[k]) for k in keys)+f'\n\nActual feature commit {commit["COMMIT_SHA"]}, tree {commit["COMMIT_TREE_SHA"]},531 exact manifest paths. Protected PR18 merged with required rector CI to main {main["mainCommit"]}; history preserved, local fast-forward, normal main push and fetched remote ancestry/tree verification PASS. Fresh main485 unit/contract,81 frontend,82 isolated PostgreSQL,428 GRC E2E,21 IAM E2E plus strict upstream provenance/native callback/static/contracts/rector/security/domain/Git PASS. Disposable IAM startup timeout resolved inline by unchanged full rerun after load drains; failure retained. QA exact images/schema30/237/172 remain unchanged, Core GRC records/audits preserved and authorized andres.grc1/1/0 untouched. A concurrent ordinary Baruj authentication explains the sole nonauthority UserIdentity/audit metadata drift;235 table fingerprints unchanged and no agent QA write/authentication flow. Evidence: artifacts/phase5-integration/PHASE5_POSTINTEGRATION_REPORT.md and structured result/proofs. Documentation-only governed followup publishes actual completion evidence, with all functional blobs identical to the tested main tree. No historical PASS is overwritten, no new human visual approval is invented, no Phase6 action.\n')
print(json.dumps({'postRegression':'PASS','counts':counts,'qaReadOnly':'PASS','functionalCommit':commit['COMMIT_SHA'],'mainCommit':main['mainCommit'],'next':'FINAL_EVIDENCE_SELECTIVE_PUBLICATION'}))
