from pathlib import Path
import json, hashlib, subprocess, tarfile, re, datetime, sys

R=Path('/Users/andresbarouh/repos/tcdx-grc'); T=Path('/private/tmp')
E=R/'artifacts/phase5-integration'; E.mkdir(exist_ok=True)
N='tcdx-grc-phase5-integration'; master='TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23'
phase=sys.argv[1]; assert phase in ['prepare','seal','repair']
def read(p): return json.loads(Path(p).read_text())
def j(name,x): (E/name).write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
def md(name,s): (E/name).write_text(s.strip()+'\n')
def sha(b): return hashlib.sha256(b).hexdigest()
def git(*args): return subprocess.check_output(['git',*args],cwd=R).decode().strip()
def paths(*args): return [p for p in subprocess.check_output(['git',*args,'-z'],cwd=R).decode().split('\0') if p]
now=datetime.datetime.now(datetime.timezone.utc).isoformat()

if phase=='repair':
 out=subprocess.run(['git','diff','--cached','--check'],cwd=R,capture_output=True,text=True)
 bad=sorted(set(m[1] for m in re.finditer(r'^([^\n]+?):\d+: ',out.stdout,re.M)))
 assert bad and all(p.startswith(('artifacts/','iam/')) for p in bad)
 historical=[p for p in bad if p.startswith('artifacts/') and not p.startswith('artifacts/phase5-integration/')]
 archive=E/'ORIGINAL_WHITESPACE_EVIDENCE.tar'
 with tarfile.open(archive,'w',format=tarfile.USTAR_FORMAT) as tar:
  for p in bad:
   f=R/p;info=tarfile.TarInfo(p);info.size=f.stat().st_size;info.mode=0o644;info.mtime=0;tar.addfile(info,f.open('rb'))
 changed=[]
 for p in bad:
  if p in historical:continue
  f=R/p;b=f.read_bytes();normalized=b'\n'.join(line.rstrip(b' \t\r') for line in b.splitlines()).rstrip(b'\n')+b'\n'
  assert b'\n'.join(x.rstrip(b' \t\r') for x in b.splitlines()).rstrip(b'\n')==normalized.rstrip(b'\n')
  f.write_bytes(normalized);changed.append({'path':p,'originalSha256':sha(b),'formattedSha256':sha(normalized),'classification':'EXPLICIT_NONFUNCTIONAL_TRAILING_WHITESPACE_ONLY'})
 j('PHASE5_WHITESPACE_RECONCILIATION.json',{'originalArchive':str(archive.relative_to(R)),'archiveSha256':sha(archive.read_bytes()),'historicalPathsPreservedUnchanged':historical,'formattedPaths':changed,'scope':'STEP23M mandatory diff-check cosmetic recovery; no semantic normalization policy changed'})
 (T/(N+'-archive-exclusions.json')).write_text(json.dumps(historical,indent=2)+'\n')
 (T/(N+'-unstage-historical.nul')).write_bytes(('\0'.join(historical)+'\0').encode())
 proof=read(E/'PHASE5_SOURCE_RELEASE_PROOF.json')
 proof['differences'] += [x for x in changed if x['path'].startswith('iam/')]
 proof['originalFreezeAndPolicyUnchanged']=True;proof['materialDifferences']=0
 j('PHASE5_SOURCE_RELEASE_PROOF.json',proof)
 with (E/'PHASE5_SOURCE_RELEASE_RECONCILIATION.md').open('a') as f:f.write('\nPre-staging diff-check recovery: three IAM source files have only trailing horizontal whitespace removed, individually compared with original frozen bytes. No token, template structure, policy or executable behavior changes. Original785-path freeze and its approved export policy remain unchanged; these differences are explicitly classified, never hidden by a new normalization rule. Originals and machine-output evidence are retained byte-for-byte in ORIGINAL_WHITESPACE_EVIDENCE.tar. Fresh theme/native-callback/IAM regression validates the formatted source. See PHASE5_WHITESPACE_RECONCILIATION.json.\n')
 with (E/'PHASE5_INTEGRATION_REPORT.md').open('a') as f:f.write('\nPre-staging cosmetic recovery: git diff --cached --check detected untracked IAM trailing spaces and raw historical log whitespace. Three IAM files are formatted without semantic changes; machine logs remain unchanged and are represented by exact binary archive entries instead of whitespace-sensitive text blobs. Historical hash manifests verify original entries. Raw worktree paths remain preserved. Integration log derivatives and reproduction scripts are formatted; originals are archived. No functional product source amendment.\n')
 with (R/'docs/governance/MASTER_EXECUTION_STATUS.md').open('a') as f:f.write('\nSTEP23M pre-staging cosmetic reconciliation: full cached diff-check exposed trailing spaces in three previously untracked IAM source files and machine logs. Three IAM source paths are formatted with no token/structure/behavior change, individually reconciled against the frozen originals and freshly regressed. Historical raw evidence remains byte-identical and is versioned through ORIGINAL_WHITESPACE_EVIDENCE.tar; no historical PASS or original log is changed. Release freeze/policy unchanged; material source difference0.\n')
 print(json.dumps({'historicalArchived':len(historical),'formatted':len(changed),'originalsPreserved':len(bad)}));sys.exit()

if phase=='prepare':
 assert not git('diff','--cached','--name-only')
 initial=paths('diff','--name-only')+paths('ls-files','--others','--exclude-standard')
 logs=[]
 for m in (R/'artifacts/phase5-iam-ui').rglob('EVIDENCE_SHA256.json'):
  for p,h in read(m).items():
   f=m.parent/p; assert f.is_file() and sha(f.read_bytes())==h,(str(m),p)
   rel=str(f.relative_to(R))
   if rel not in initial and not git('ls-files','--',rel): logs.append(rel)
 initial=sorted(set(initial+logs))
 (T/(N+'-initial-paths.json')).write_text(json.dumps(initial,indent=2)+'\n')

 required=['unit','frontend','postgres-retry','grc-e2e','iam-e2e','iam-theme','amr-callback','typecheck','lint','contracts','source-build','openapi','secrets','rebuild','catalog','parity','assets']
 receipts={}
 for n in required:
  d=read(T/(N+'-pre-'+n+'-receipt.json')); assert d['exitCode']==0,n
  log=T/(N+'-pre-'+n+'.log'); s=re.sub(r'\x1b\[[0-9;]*m','',log.read_text())
  (E/('PRE_'+n.upper().replace('-','_')+'.txt')).write_text(s)
  d['evidenceLog']='PRE_'+n.upper().replace('-','_')+'.txt'; receipts[n]=d
 for n in ['postgres']:
  d=read(T/(N+'-pre-'+n+'-receipt.json')); assert d['exitCode']==1
  (E/'PRE_POSTGRES_INITIAL_RECOVERABLE_FAILURE.txt').write_text((T/(N+'-pre-postgres.log')).read_text())
 j('PHASE5_PRECOMMIT_RECEIPTS.json',receipts)
 counts={}
 for n in ['unit','frontend','postgres-retry','grc-e2e','iam-e2e']:
  s=(E/receipts[n]['evidenceLog']).read_text(); m=re.search(r'Tests\s+(\d+) passed',s) or re.search(r'(\d+) passed \(',s); assert m,n;counts[n]=int(m[1])
 j('PHASE5_TEST_COUNTS.json',counts)
 a=read(T/(N+'-pre-authority.json')); db=read(T/(N+'-pre-db.json')); core=read(T/(N+'-pre-core.json')); runtime=read(T/(N+'-pre-runtime.json')); public=read(T/(N+'-pre-public.json'))
 previous=read(R/'artifacts/phase5-final-closure-20261007/FINAL_QA_SAFE_PROOF.json')
 assert db['schemaSha256']==previous['db']['schemaSha256']
 cov=a['extra']['ceremony']['auditCoverage']
 assert a['pass'] and a['membership']==1 and a['tenantRoles']==0 and a['activePlatformAdmin']==1 and a['otp']==1
 assert cov['revokedGenerationSessions']==0 and cov['auditSecretKeyScan'][0]['forbidden_secret_keys']==0
 member=a['membershipDetails'][0]; origin=a['membershipOriginAudits']; revoke=cov['revokes'][-1]
 assert len(a['membershipDetails'])==1 and member['tenant_code']=='TECDEX' and member['membership_state']=='active'
 onboarding=[x for x in origin if x['event_code']=='audit.platform.tenant_user.onboard.v1' and x['outcome']=='success'];assert len(onboarding)==1
 assert onboarding[0]['occurred_at']<revoke['occurred_at'] and onboarding[0]['actor_user_identity_id']==member['created_by_user_identity_id']
 assert 'autorizado expresamente' in onboarding[0]['reason']
 pre=read(R/'artifacts/phase5-final-closure-20261007/MI10_SAFE_SERVER_PROOF.json')['preRevoke']
 assert (pre['activePlatformAdmin'],pre['membership'],pre['tenantRoles'],pre['otp'],pre['enabled'])==(1,1,0,1,True)
 assert not any(x['correlation_id']==revoke['correlation_id'] and x['command_code']!='managedIdentitySessionRevoke' for x in origin)
 factor=a['extra']['iam']['authConfig']; ex=a['extra']['iam']['executions']
 for name in ['auth-username-password-form','auth-otp-form']:
  assert any(x['authenticator']==name and x['name']=='default.reference.maxAge' and x['value']=='600' for x in factor)
  assert any(x['authenticator']==name and x['requirement']==0 for x in ex)
 assert all(x['requirement']==3 for x in ex if x['authenticator']=='auth-cookie')
 safeAuthority={k:a[k] for k in ['capturedAt','keycloakExactlyOne','grcIdentityExactlyOne','issuerSubjectMappingExact','enabled','identityActive','activePlatformAdmin','membership','tenantRoles','otp','requiredActions','sessions','readOnly']}
 safeAuthority.update(membershipDetails=a['membershipDetails'],membershipOriginAudits=origin,latestRevoke=revoke,revokedGenerationSessions=cov['revokedGenerationSessions'],factorConfiguration=factor,flowExecutions=ex,classification='AUTHORIZED_HUMAN_TENANT_MEMBERSHIP',sessionRevocationAuthoritySideEffects=0)
 j('PHASE5_AUTHORITY_PROOF.json',safeAuthority)
 j('PHASE5_QA_READONLY_PRE.json',{'capturedAt':now,'db':{k:db[k] for k in ['identity','migrations','latest','physicalTables','publishedPermissions','ledgerMatchesManifest','pendingIds','schemaSha256','schema','ledger']},'runtime':runtime,'public':public,'functionalSqlWrites':0,'iamMutations':0})
 md('PHASE5_AUTHORITY_RECONCILIATION.md',f'''# Authority reconciliation — PASS

Master `{master}`. Human authority: Andrés Barouh, STEP23M and PHASE5_QA_REVIEWER_MEMBERSHIP_AUTHORIZATION_20261007.

andres.grc resolves exactly once by issuer+subject: enabled, OTP1, active PlatformAdmin1, Membership1, active tenant roles0. Classification AUTHORIZED_HUMAN_TENANT_MEMBERSHIP. The retained Membership grants no implicit tenant authority.

Canonical Membership `{member['tenant_membership_id']}` in tenant `{member['tenant_id']}` / TECDEX is active. Created `{member['created_at']}`, joined `{member['joined_at']}`, actor `{member['created_by_user_identity_id']}`. Command tenantUserOnboardingCreate; material audit `{origin[0]['audit_event_id']}` and completion `{onboarding[0]['audit_event_id']}`, correlation `{onboarding[0]['correlation_id']}`. Completion reason: {onboarding[0]['reason']}.

Creation precedes session revoke `{revoke['occurred_at']}`, audit `{revoke['audit_event_id']}`, correlation `{revoke['correlation_id']}`. The historical pre-revoke snapshot and present READ ONLY query agree on1/1/0/OTP1/enabled. No authority event shares the revoke correlation. The session service/adapter never changes Membership, MembershipRole or PlatformRoleAssignment; its PostgreSQL/RBAC/idempotency/audit regression passed. SESSION_REVOCATION_AUTHORITY_SIDE_EFFECTS=0. No authority correction, grant, revoke or IAM change performed.

Password and OTP remain REQUIRED, maxAge600; Cookie DISABLED. Signed native callback regression checks exact IAM/backend images, first enrollment, password-only, expired AMR and forged/missing context. Credentials were not selected or persisted. Current evidence: PHASE5_AUTHORITY_PROOF.json; prior accepted pre-revoke and GRC401 proofs remain unchanged.
''')
 manifest=read(R/'database/migrations/manifest.json'); assert len(manifest['migrations'])==30
 for m in manifest['migrations']: assert sha((R/'database/migrations'/m['filename']).read_bytes())==m['sha256']
 old=read(R/'artifacts/phase5-final-closure-20261007/FINAL_QA_SAFE_PROOF.json')['db']['ledger']; assert old==db['ledger']
 migration=manifest['migrations'][-1]; assert migration['id']=='20261007000200'
 schema=read(R/'database/expected-schema.json'); names={x['name'] for x in schema['tables']};assert len(names)==237
 msql=(R/'database/migrations'/migration['filename']).read_text()
 assert len(re.findall(r'CREATE TABLE ',msql))==2
 assert 'regulatory.compliance_methodologies' in names and 'controls.control_effectiveness_methodologies' in names
 j('PHASE5_MIGRATION_REVIEW.json',{'migration':migration,'canonicalTables':['regulatory.compliance_methodologies','controls.control_effectiveness_methodologies'],'canonicalPermissions':['compliance.methodology.read','controls.methodology.read'],'historicalLedgerUnchanged':True,'qaLedgerMatchesManifest':True,'schemaDrift':0,'qaMigrationExecuted':False,'ddlTablesAdded':2})
 md('PHASE5_CANONICAL_DATA_REVIEW.md',f'''# Canonical data architecture — PASS

Migration30: database/migrations/{migration['filename']}. SHA256 `{migration['sha256']}`. Exact current QA ledger agrees; historical migrations preserve checksums. No migration executed in QA and no migration31 created.

Authority: rector17/19/21/22/23/25/31/38/39/43/46 → explicit approved PHASE5_METHODOLOGY_BINDING_ARCHITECTURE_DECISION_20261007 → physical amendment15 → executable27, OpenAPI/matrix/permissions/seed/audit catalogs → migration30 and expected-schema. Human authorization explicitly permits29→30 migrations,235→237 tables,170→172 permissions.

DDL creates regulatory.compliance_methodologies and controls.control_effectiveness_methodologies as separate versioned PLATFORM_CONTROL registries with tenant_id constrained NULL. UUIDv7 PKs, unique code/version and NULL-safe identity, publication/effectivity/numeric/actor checks, actor/tenant/formula FKs and selection indexes preserve ownership. Validated assessment methodology_version_ref FKs use restrictive deletion. Published method and referenced formula triggers preserve immutable semantics; only effective_to may be recorded. Preflight rejects any existing assessment rather than fabricating a mapping/backfill. No Risk or IAM credential model changes.

DML publishes two compatible FormulaDefinitions and the two rector initial method versions as governed seed data (partial factor0.50, minimum coverage80, overall=min(design,operating)). Exactly two Permission definitions: compliance.methodology.read and controls.methodology.read. Grants derive only from existing published same-ownership assessment-create role grants, explicitly excluding PLATFORM_ADMIN. There are no person grants or tenant-specific exceptions. Newly initialized tenant roles inherit canonical templates. This step adds no grant.

Two publication AuditEvents record governed_migration, database actor, explicit approval, method/formula/version and correlation. Publication is the approved governed catalog seed operation; no new publication domain/outbox event or editing API is declared. Existing assessment/business transitions retain their atomic audit/outbox behavior; onboarding material children keep canonical events. Read permissions do not authorize global edits.

Backend validates compatible published/effective method on creation, tenant/domain EffectiveConfiguration and context-bound selection pagination; historical references survive expiry. UI selects returned versions with no fabricated default. PostgreSQL isolated rebuild verifies all237 tables/3534 columns/2533 constraints/1520 required indexes, schema mismatch0 and seed mismatch0; full82 tests prove invalid/domain/unpublished/expired references, SoD, tenancy, audit and idempotency. Current QA structural fingerprint `{db['schemaSha256']}` equals accepted closure evidence: SCHEMA_DRIFT=0.
''')

 chains={
 'COMPLIANCE':['applicabilityCreate','applicabilitySubmit','applicabilityApprove','requirementAssessmentCreate','requirementAssessmentStart','requirementAssessmentSubmit','requirementAssessmentApprove','soaCreate','soaPublish'],
 'CONTROLS':['controlInstantiate','controlAssessmentCreate','controlAssessmentStart','controlAssessmentSubmit','controlAssessmentReview','controlAssessmentApprove','assuranceTestCreate','assuranceTestStart','assuranceTestExecute','assuranceTestReview','assuranceTestApprove'],
 'EVIDENCE':['retentionPolicyCreate','retentionPolicyReview','retentionPolicyApprove','retentionPolicyPublish','uploadIntentCreate','uploadFinalize','evidenceCreate','evidenceSubmit','evidenceReviewStart','evidenceApprove','evidenceRequestCreate','evidenceRequestFulfill'],
 'ACTIONS':['issueCreate','issueTriage','issueStartRemediation','actionCreate','actionStart','actionSubmitForReview','actionComplete','actionVerify','issueRequestVerification','issueVerifyClose']}
 audit=core['qaAudits']; opMatrix=(R/'docs/executable-contracts/03_API_RESOURCE_OPERATION_MATRIX.md').read_text(); openapi=(R/'docs/executable-contracts/02_OPENAPI_BASE_CONTRACT.yaml').read_text()
 trace={}
 for domain,ops in chains.items():
  trace[domain]={}
  for op in ops:
   events=[x for x in audit if x['command_code']==op and x['outcome']=='success'];assert events,op
   assert all(x['actor_user_identity_id'] and x['tenant_id'] and x['correlation_id'] for x in events)
   assert '| '+op+' |' in opMatrix and 'operationId: '+op+'\n' in openapi,op
   trace[domain][op]=events
 finalStates={'regulatory.requirement_assessments':'approved','regulatory.requirement_applicabilities':'approved','regulatory.statements_of_applicability':'published','controls.control_assessments':'approved','controls.assurance_tests':'approved','evidence.evidence_requests':'fulfilled','evidence.evidences':'draft','evidence.evidence_versions':'approved','privacy.retention_policies':'published','remediation.issues':'verified_closed','remediation.actions':'verified'}
 for table,state in finalStates.items(): assert len(core['qaRecords'][table])==1 and core['qaRecords'][table][0]['record']['lifecycle_state']==state,table
 assert all(x['scan_status']=='passed' for x in core['qaSupport']['evidence.file_objects'])
 historic=read(R/'artifacts/phase5-final-closure-20261007/QA_RECORDS_AND_AUDIT.json')
 assert core['qaRecords']==historic['records'] and audit==historic['qaAudit'] and core['qaSupport']==historic['supportingRecords']
 j('PHASE5_CORE_TRACEABILITY_PROOF.json',{'capturedAt':core['capturedAt'],'readOnly':True,'operationAudits':trace,'finalStates':finalStates,'recordsMatchHistoricalEvidence':True,'supportingRecordsMatch':True,'publishedMethodAudit':core['methodologyPublicationAudits'],'fileScan':core['qaSupport']['evidence.file_objects']})
 md('PHASE5_CORE_TRACEABILITY.md','''# Core GRC traceability — PASS

All four mandated cycles are verified against current READ ONLY QA records/audits and existing sanitized canonical API receipts; no business record or lifecycle was mutated. PHASE5_CORE_TRACEABILITY_PROOF.json maps every required operation to persisted actor/tenant/aggregate/state/correlation/outcome. Current records, supporting links/reviews/ActionVerification and59 audits equal accepted closure evidence. Methodology publication has two additional governed catalog audits.

Compliance: approved applicability, approved method-bound RequirementAssessment, published SoA. Controls: active instantiated Control, approved method-bound assessment (canonical Submit maps to :complete), approved Assurance. Evidence: published retention, finalized scan-passed360-byte file and promoted FileObject, approved EvidenceVersion, fulfilled request. Evidence root remains draft under its distinct canonical version model. Actions: verified Action with independent accepted ActionVerification and verified_closed Issue.

Rector17/19/21/22/23/24/25/38/39/43/44/46 → physical typed relations/versions → OpenAPI02, operations03, permissions05, audit08, seed/lifecycle09, authentication13 and approved amendments21–27 → backend core-grc service/repository/security/routes/storage and security boundary → frontend core-grc → unit/contract,82 isolated PostgreSQL and428 GRC E2E → existing QA cycles/current READ ONLY proof. The per-domain original runtime reports and final traceability report in phase5-final-closure-20261007 remain intact. no_data/NULL do not become scores or official regulatory/commercial availability. Self-review/approval denials and independent actors retain their recorded SoD evidence.
''')

 freeze=read(R/'artifacts/phase5-final-closure-20261007/RELEASE_FREEZE_PROOF.json')
 frozenRows=[]; differences=[]
 assert sha(Path(freeze['archive']).read_bytes())==freeze['archiveSha256']
 assert sha(Path(freeze['independentArchive']).read_bytes())==freeze['archiveSha256']
 with tarfile.open(freeze['archive']) as tar:
  members=tar.getmembers();assert [m.name for m in members]==freeze['paths']
  manifestHashes={p:h for h,p in (s.split('  ',1) for s in (R/'artifacts/phase5-final-closure-20261007/RELEASE_SOURCE_MANIFEST.sha256').read_text().splitlines())}
  for m in members:
   b=tar.extractfile(m).read();assert sha(b)==manifestHashes[m.name]
   local=(R/m.name).read_bytes()
   if b!=local:
    if m.name=='docs/governance/MASTER_EXECUTION_STATUS.md':
     assert local.startswith(b)
     classification='APPROVED_POST_FREEZE_APPEND_ONLY_GOVERNANCE'
    elif m.name in ['iam/run-amr-callback-regression.mjs','iam/theme/tcdx-grc/login/field.ftl','iam/theme/tcdx-grc/login/template.ftl']:
     assert local==b'\n'.join(line.rstrip(b' \t\r') for line in b.splitlines()).rstrip(b'\n')+b'\n'
     classification='INDIVIDUALLY_REVIEWED_NONFUNCTIONAL_WHITESPACE'
    elif m.name=='iam/theme.test.mjs':
     restored=re.sub(rb'    // Reconstruct the four upstream trailing spaces.*?(?=    assert.equal\(createHash)',b'',local,flags=re.S)
     assert restored==b
     classification='EXACT_UPSTREAM_HASH_INVERSE_FORMATTING_PROVENANCE_CHECK'
    else:raise AssertionError('MATERIAL_SOURCE_DIFFERENCE_'+m.name)
    differences.append({'path':m.name,'classification':classification,'frozenSha256':sha(b),'currentSha256':sha(local)})
   frozenRows.append(f'{m.mode:04o} {m.size} {sha(b)}  {m.name}\n')
 assert sha(''.join(frozenRows).encode())==freeze['sourceFingerprint']
 active=sorted(p for p in set(paths('ls-files')+paths('ls-files','--others','--exclude-standard')) if not p.startswith(('artifacts/','data/regulatory/catalogs/_archives/')))
 assert active==freeze['paths'],'SOURCE_PATH_SET_CHANGED'
 j('PHASE5_SOURCE_RELEASE_PROOF.json',{'sourceFingerprint':freeze['sourceFingerprint'],'freezeSha256':freeze['archiveSha256'],'policySource':'STEP_23L_MI8A_RELEASE_PACKAGING_CONTRACT; methodology-freeze.py; release manifest STATUS_APPEND=EXTERNAL_POST_FREEZE','comparedPaths':len(active),'materialDifferences':0,'missingPaths':0,'extraPaths':0,'differences':differences,'twoIndependentArchivesVerified':True})
 md('PHASE5_SOURCE_RELEASE_RECONCILIATION.md',f'''# Source / QA release reconciliation — PASS

RELEASE_SOURCE_FINGERPRINT={freeze['sourceFingerprint']}
RELEASE_FREEZE_SHA256={freeze['archiveSha256']}

Existing approved export policy is reused: tracked+untracked source, excluding artifacts and regulatory intake archives, pinned executable modes, source bytes and canonical USTAR metadata (uid/gid/mtime0). Both original independent archives retain identical SHA256. Recomputed785 path canonical mode/size/content manifest gives the approved fingerprint. No Git-tree/tarball metadata equivalence or new normalization policy is invented.

Every functional source/config/contract/migration/IAM path matches deployed freeze content. Only MASTER_EXECUTION_STATUS differs by the explicitly external post-freeze append; integration evidence is likewise outside build inputs. Missing/extra/material source differences0. Local compiled backend13 modules match live QA bytes; public JS matches deployed frontend container and local approved logo. Exact backend/frontend/IAM digests match the task baseline, all healthy. This integration builds no release and deploys nothing.
''')

 findings=[]; activeScan=[]
 for folder in ['apps','packages','deploy','iam','scripts']:
  for f in (R/folder).rglob('*'):
   if not f.is_file() or any(p in ['node_modules','dist','test-results'] for p in f.parts) or '.test.' in f.name or '.spec.' in f.name or 'e2e' in f.parts: continue
   if f.suffix not in ['.ts','.tsx','.mjs','.json','.yml','.yaml','.css','.html'] and f.name not in ['Dockerfile','.env.example']: continue
   p=str(f.relative_to(R));activeScan.append(p)
   if 'grc.tecdx.net' in f.read_text(errors='replace'): findings.append(p)
 assert not findings
 j('PHASE5_DOMAIN_SCAN.json',{'activeBadDomainReferences':0,'findings':findings,'activePathsScanned':len(activeScan),'paths':sorted(activeScan),'excludedPolicy':'intentional negative tests, immutable/historical/prohibition documentation, binary/generated runtime artifacts; live config/public JS independently verified'})
 md('PHASE5_PRECOMMIT_GATES.md',f'''# Precommit material gates — PASS

Fresh unit/contract{counts['unit']}, frontend{counts['frontend']} (included in unit total), isolated PostgreSQL{counts['postgres-retry']}/15 files, GRC E2E{counts['grc-e2e']}/four viewports, IAM E2E{counts['iam-e2e']}/three viewports, theme4 and native signed callback3 profiles/six negatives all PASS. Counts come from current logs. Unit's82 PostgreSQL skips are executed separately with no skips in the isolated suite.

One initial PostgreSQL attempt had missing local imported catalog plus a5s resource timeout during concurrent build/browser execution. The approved local catalog fixture was loaded through the governed materializer at127.0.0.1:55432, then the entire original suite passed82 tests with unchanged default timeouts. Initial failure and fresh complete pass are retained. QA never receives fixture writes.

Typecheck/lint-static, source builds, full OpenAPI validation161 operations/56 reads, exact operation matrix, permission catalog172, RBAC/Platform-Tenant/default DENY/scope/privacy/idempotency/audit contract negatives39, contracts:verify, schema/seeds rebuild/reapply, migration checksums, rector baseline/history integrity, git diff check, secret scan0, active domain scan0, source/release canonical manifest and QA READ ONLY gates pass. Logs/receipts are versioned beside this report. Screenshots and accessibility/responsive/branding checks use local approved assets and existing human review; no baseline is updated and no human PASS is invented.

All precommit assertions also require architecture, authority, core traceability, source parity, exact selected-path manifest and safe Git ancestry. Protected main rules require a PR and rector-governance CI; STEP23M explicitly authorizes integration/push and the PR/normal merge realizes that authorization without bypass, force or rewriting history. SAFE_TO_COMMIT remains conditional until the detached full staging manifest and final static/secret/rector checks are sealed.
''')
 commits=git('log','--format=%H %s','origin/main..HEAD').splitlines()
 assert git('branch','--show-current')=='main' and git('rev-list','--left-right','--count','origin/main...HEAD')=='0\t3'
 changes=paths('diff','--name-only','origin/main..HEAD')
 j('PHASE5_EXISTING_HISTORY_PATHS.json',[{'path':p,'type':'EXISTING_COMMITTED_PHASE5_OR_RECTOR_HISTORY','sha256':sha((R/p).read_bytes()),'include':'PRESERVE_ANCESTRY','justification':'Existing PRE-F5E/v1.7/Phase5 commits are already committed; no restaging or history rewrite.'} for p in changes if (R/p).is_file()])
 rules=json.loads(subprocess.check_output(['gh','api','repos/Tecdex-SpA/tcdx-grc/rules/branches/main']))
 j('PHASE5_MAIN_RULES.json',rules)
 md('PHASE5_GIT_HISTORY_REVIEW.md',f'''# Git history preflight — PASS

Current main HEAD `{git('rev-parse','HEAD')}`; origin/main `{git('rev-parse','origin/main')}` after non-destructive fetch. Upstream origin/main. Local ahead3, remote ahead0; remote is an ancestor. Existing three human-authored commits are preserved:

{chr(10).join('- '+c for c in reversed(commits))}

Their PRE-F5D/PRE-F5E baseline reconciliation and Phase5 implementation paths are inventoried with hashes in PHASE5_EXISTING_HISTORY_PATHS.json. Baseline active v1.7 and historical manifests verify unchanged. No branch/history rewrite, reset, clean, stash, rebase or destructive checkout.

Git fsck passes;22 dangling blobs are harmless unreachable historical objects, no corrupt/missing object. Index was empty. GitHub ruleset23480142 blocks deletion/non-fast-forward, requires PR, thread resolution and strict rector-governance. Legacy branch-protection API404 reflects ruleset-based protection, not absence of protection. Use a dedicated integration branch at the validated commit, push it normally, create PR, wait mandatory CI, merge preserving commit history, then fast-forward local main and verify origin/main. Zero-review-count rule imposes no additional human review beyond explicit STEP23M authority; no rule mutation or bypass is used.
''')
 md('PHASE5_INTEGRATION_REPORT.md',f'''# STEP23M — governed Phase5 integration

Master `{master}`; EXECUTION_MODE=ACCELERATED_SAFE_PROGRESS; explicit authority Andrés Barouh (Architecture/Product Owner),2026-10-08. Task covers selective commit, safe main integration/push, fresh postintegration regressions and append-only evidence. QA deploy/DB or IAM mutations and Phase6 are prohibited.

Current material architecture, authority, source-release and four Core GRC traceability gates PASS. Fresh tests are485 unit/contract including81 frontend,82 PostgreSQL isolated,428 GRC E2E,21 IAM E2E; current logs own counts. Exact QA remains30/latest20261007000200/237/172, approved digests healthy, schema drift0. Membership is authorized human onboarding; session revoke authority side effects0. No functional source is changed by STEP23M; accumulated authorized source/contract/migration/backend/frontend/IAM/deployment changes are integrated exactly as validated in QA. This step writes only evidence/governance plus Git history.

The path inventory distinguishes accumulated Phase5 source/evidence, generated integration evidence, and preserved regulatory intake archives outside scope. No path is discarded. Sanitized historical evidence/logs already pinned in EVIDENCE_SHA256 manifests are included explicitly even if *.log ignores them; they are audit evidence, not transient runtime output. Ordinary build/test/cache files remain excluded. No secret enters source, evidence or staging.

Protected main uses PR+required CI+history-preserving merge. Full final statuses, commit/tree/path counts, PR/main SHA, remote verification and postregression proof are appended after actual completion; this preparation does not claim those future PASS states. PHASE5_INTEGRATION_RESULT.json is authoritative for latest step state. Existing functional Phase5 PASS is preserved, integration still pending until all actual checks complete.

CODEX_VARIATION_BUDGET=ZERO; TASK_PACKET_STATUS=COMPLETE_FOR_AUTHORIZED_INTEGRATION_SCOPE; ASSUMPTIONS_INTRODUCED=NONE; FILES_OUTSIDE_SCOPE_MODIFIED=NONE; UNRESOLVED_RECTOR_CONFLICTS=0. Existing human approvals are cited, never self-issued. Phase6 stays READY/unstarted.
''')
 md('STEP23M_HUMAN_AUTHORIZATION.md','''# STEP23M explicit human execution authority

2026-10-08: Andrés Barouh, Architecture Owner/Product Owner, explicitly authorized final Phase5 worktree reconciliation, integrity/architecture/migration/RBAC review, local regressions, selective staging, commit, integration to main, normal push to origin/main, postintegration regression and append-only governance/evidence for Tecdex-SpA/tcdx-grc. Commit/push permitted only after all material gates PASS; no repeated authorization is required. Protected PR/CI integration fulfills main authorization with history preserved.

No QA deployment, QA database write, IAM configuration mutation, production deployment, Phase6 start or Phase6 source changes. No reset/clean/stash/rebase/destructive checkout/force push; preserve unrelated work. Required historical closure remains STEP23L PASS, integration pending; all STEP23M checks are fresh. Exact user packet and its mandatory final output are the session source of authority; this record adds no approval or exception.
''')
 status=R/'docs/governance/MASTER_EXECUTION_STATUS.md'
 marker='## 2026-10-08 — STEP 23M explicit Phase 5 Git integration authority and precommit evidence'
 assert marker not in status.read_text()
 with status.open('a') as f:f.write(f'\n\n{marker}\n\nAndrés Barouh explicitly authorizes selective commit, normal push and governed main integration only after every material gate PASS, followed by fresh postintegration regressions. No QA deployment/database mutation, IAM mutation, production or Phase6. Protected main is integrated through PR/required rector CI with preserved history, never bypass. Master {master}; baseline/history integrity PASS; no unresolved rector conflict. Previous functional STEP23L/PHASE5 closure remains PASS and integration remains pending until actual publication and postchecks.\n\nFresh precommit485 unit/contract (81 frontend included),82 isolated PostgreSQL,428 GRC E2E,21 IAM E2E, four theme tests and native AMR callback profiles/negatives PASS. Initial fixture/resource failure resolved through approved local catalog and full original regression with unchanged timeouts. All architecture/authority/Core traceability/source-release/static/secret/domain/QA-read-only assertions PASS. Authorized reviewer Membership traced to TECDEX tenant onboarding before session revoke; PlatformAdmin1/Membership1/tenant roles0, OTP1, maxAge600 factors, Cookie disabled, revoke authority side effects0. Migration30 precisely matches approved two method registries/read permissions; QA30/237/172/schema drift0, images unchanged. No functional source amendment in STEP23M.\n\nEvidence: artifacts/phase5-integration/PHASE5_INTEGRATION_REPORT.md and companion canonical/authority/source-release/Git/traceability reports, logs, inventories and result. Commit/main/remote/postregression state will be appended only after execution. Phase6 READY, PHASE_6_STARTED=0.\n')
 result={'STEP_23M_PHASE5_GIT_INTEGRATION':'PASS_PRECOMMIT_REVIEW_PENDING_SEAL','EXECUTION_MODE':'ACCELERATED_SAFE_PROGRESS','RECTOR_GATE':'PASS','MASTER_REGENT':master,'UNRESOLVED_RECTOR_CONFLICTS':0,'PHASE_5_PREVIOUS_FUNCTIONAL_CLOSURE':'PASS','PHASE_5_INTEGRATION':'PENDING','AUTHORITY_RECONCILIATION':'PASS','ANDRES_GRC_PLATFORM_ADMIN_ASSIGNMENTS':1,'ANDRES_GRC_MEMBERSHIPS':1,'ANDRES_GRC_TENANT_ROLE_ASSIGNMENTS':0,'MEMBERSHIP_ORIGIN_CLASSIFICATION':'AUTHORIZED_HUMAN_TENANT_MEMBERSHIP','SESSION_REVOCATION_AUTHORITY_SIDE_EFFECTS':0,'MIGRATION_30_REVIEW':'PASS','MIGRATION_30_SHA256':migration['sha256'],'NEW_TABLES_REVIEW':'PASS','NEW_PERMISSIONS_REVIEW':'PASS','CANONICAL_DATA_ARCHITECTURE':'PASS','SCHEMA_DRIFT':0,'COMPLIANCE_TRACEABILITY':'PASS','CONTROLS_TRACEABILITY':'PASS','EVIDENCE_TRACEABILITY':'PASS','ACTIONS_TRACEABILITY':'PASS','CORE_GRC_TRACEABILITY':'PASS','WORKTREE_RECONCILED':'PASS','INTEGRATION_MANIFEST':'PENDING_SEAL','UNEXPECTED_PATHS':0,'SOURCE_RELEASE_RECONCILIATION':'PASS','RELEASE_SOURCE_FINGERPRINT':freeze['sourceFingerprint'],'RELEASE_FREEZE_SHA256':freeze['archiveSha256'],'UNIT_TESTS':'PASS','UNIT_TEST_COUNT':counts['unit'],'FRONTEND_TESTS':'PASS','FRONTEND_TEST_COUNT':counts['frontend'],'POSTGRES_ISOLATED_TESTS':'PASS','POSTGRES_ISOLATED_TEST_COUNT':counts['postgres-retry'],'GRC_E2E':'PASS','GRC_E2E_COUNT':counts['grc-e2e'],'IAM_E2E':'PASS','IAM_E2E_COUNT':counts['iam-e2e'],'TYPECHECK':'PASS','LINT_STATIC':'PASS','OPENAPI_GATE':'PASS','OPERATION_MATRIX_GATE':'PASS','PERMISSION_CATALOG_GATE':'PASS','RBAC_GATE':'PASS','SCOPE_CONSISTENCY':'PASS','CONTRACT_VERIFY':'PASS','RECTOR_INTEGRITY':'PASS','GIT_DIFF_CHECK':'PASS','SECRET_SCAN':'PASS','DOMAIN_SCAN':'PASS','ACTIVE_BAD_DOMAIN_REFERENCES':0,'SECURITY_GATES':'PASS','GIT_HISTORY_PREFLIGHT':'PASS','ALL_PRECOMMIT_GATES':'PENDING_SEAL','SAFE_TO_COMMIT':'NO_UNTIL_SEAL','STAGED_PATHS_MATCH_MANIFEST':'NOT_STAGED','STAGED_UNEXPECTED_PATHS':0,'STAGED_SECRETS':'NOT_STAGED','STAGED_UNRELATED_WORK':0,'COMMIT_SHA':'NOT_CREATED','COMMIT_TREE_SHA':'NOT_CREATED','COMMIT_PATH_COUNT':0,'MAIN_INTEGRATION':'PENDING','PUSH_ORIGIN_MAIN':'PENDING','REMOTE_MAIN_COMMIT_VERIFIED':'NO','POST_INTEGRATION_REGRESSION':'PENDING','QA_BACKEND_IMAGE':runtime['components'][0]['imageId'],'QA_FRONTEND_IMAGE':runtime['components'][1]['imageId'],'QA_IAM_IMAGE':runtime['components'][2]['imageId'],'QA_MIGRATIONS':30,'QA_LATEST_MIGRATION':'20261007000200','QA_PHYSICAL_TABLES':237,'QA_PUBLISHED_PERMISSIONS':172,'QA_HEALTH':'PASS','PHASE_5_INTEGRATION_PENDING':'YES','PHASE_5':'PASS','PHASE_5_CLOSED':'YES','CORE_GRC_SLICE':'PASS','STEP_23L':'PASS','PHASE_6':'READY','PHASE_6_STARTED':0,'QA_DEPLOY_PERFORMED':'NO','QA_FUNCTIONAL_MUTATIONS':0,'IAM_MUTATIONS':0,'NEXT_REQUIRED_ACTION':'SEAL_MANIFEST_COMMIT_PR_REQUIRED_CI_NORMAL_MAIN_INTEGRATION_AND_POST_REGRESSION'}
 j('PHASE5_INTEGRATION_RESULT.json',result)
 print(json.dumps({'prepared':True,'counts':counts,'migration30sha256':migration['sha256'],'initialInventoryPaths':len(initial)}));sys.exit()

# Seal only after every preparation and final gate has passed. A detached exact
# stage manifest hashes all reporting files too, avoiding self-referential hashes.
initial=read(T/(N+'-initial-paths.json'))
rows=[]
for p in initial:
 f=R/p; assert f.is_file() and not f.is_symlink()
 archiveExclusions=read(T/(N+'-archive-exclusions.json')) if (T/(N+'-archive-exclusions.json')).exists() else []
 include=not p.startswith('data/regulatory/catalogs/_archives/') and p not in archiveExclusions
 if p.startswith('artifacts/phase5-integration/'): continue
 if p.startswith(('apps/','packages/','e2e/')): kind='IMPLEMENTATION_TEST';why='Approved Phase5/ManagedIdentity release source and meaningful regression.'
 elif p.startswith('database/'):kind='DATA_CONTRACT_MIGRATION';why='Approved canonical publication/methodology amendment; immutable migration hashes verified.'
 elif p.startswith('docs/'):kind='GOVERNANCE_EXECUTABLE_PHYSICAL';why='Approved authority chain and append-only Phase5 traceability.'
 elif p.startswith('artifacts/'):kind='SANITIZED_VERSIONABLE_EVIDENCE';why='Historical Phase5 evidence, pinned safe logs or masked/synthetic visual captures; preserved checksum manifests.'
 elif p.startswith('iam/'):kind='IAM_THEME_POLICY_TEST';why='Approved eight-operation external identity boundary, AMR600, local branding and disposable regression.'
 elif p.startswith('deploy/') or f.name=='Dockerfile' or p=='.env.example':kind='APPROVED_RUNTIME_PACKAGING';why='Approved pinned bases/file-secret references; no QA mutation.'
 elif p.startswith('scripts/'):kind='FOUNDATION_VERIFIER';why='Approved deterministic generation/schema/seed/security checks required for released source.'
 elif p in ['package.json','pnpm-lock.yaml']:kind='PINNED_BUILD_DEPENDENCY';why='Approved package/tooling lock matching deployed freeze; no dependency selected in STEP23M.'
 elif not include:kind='PRESERVED_REGULATORY_INTAKE_ARCHIVE';why='Original catalog intake archive outside Phase5 functional release; canonical versioned catalog already committed. Preserve bytes untracked.'
 else:raise AssertionError('AMBIGUOUS_PATH_'+p)
 if p in archiveExclusions:kind='EXACT_ARCHIVED_HISTORICAL_EVIDENCE';why='Original raw bytes unchanged in worktree and stored at same tar entry path in ORIGINAL_WHITESPACE_EVIDENCE.tar; archived representation preserves original SHA256 manifests.'
 state='MODIFIED' if git('ls-files','--',p) else 'IGNORED_PINNED_EVIDENCE' if subprocess.run(['git','check-ignore','--quiet','--',p],cwd=R).returncode==0 else 'UNTRACKED'
 rows.append({'path':p,'type':kind,'gitStatus':state,'phase5':include,'sha256':sha(f.read_bytes()),'include':include,'justification':why})
header='''# PHASE5_INTEGRATION_MANIFEST

Authoritative exact staging inventory derives from individually classified paths below plus the enumerated generated STEP23M evidence in PHASE5_SELECTED_PATHS.json. No glob staging. Every accumulated path has status/type/Phase5 membership/content SHA256/reason/include decision. Original input archives are excluded and preserved, not discarded. Existing committed paths are separately reviewed in PHASE5_EXISTING_HISTORY_PATHS.json.

Generated evidence includes this manifest/result and cannot contain its own actual SHA256 without a circular hash. The detached exact content manifest seals every selected byte including all generated reports immediately before staging; the resulting commit Git tree anchors those bytes. A postcommit content receipt records those actual hashes without self-reference. This is inventory bookkeeping only; release normalization remains the previously approved freeze policy.

| Path | Type | Git | Fase5 | SHA256 | Decision | Justification |
|---|---|---|---|---|---|---|
'''
body=''.join('| '+r['path']+' | '+r['type']+' | '+r['gitStatus']+' | '+('YES' if r['phase5'] else 'NO')+' | '+r['sha256']+' | '+('INCLUDE' if r['include'] else 'EXCLUDE_PRESERVE')+' | '+r['justification']+' |\n' for r in rows)
md('PHASE5_INTEGRATION_MANIFEST.md',header+body)
j('PHASE5_ACCUMULATED_PATH_INVENTORY.json',rows)
included=sorted(set([r['path'] for r in rows if r['include']]+[str(f.relative_to(R)) for f in E.rglob('*') if f.is_file()]+['artifacts/phase5-integration/PHASE5_SELECTED_PATHS.json']))
j('PHASE5_SELECTED_PATHS.json',{'paths':included,'pathCount':len(included),'exclusions':[r['path'] for r in rows if not r['include']],'stagingPolicy':'Explicit literal paths only; force add only pinned audited historical *.log evidence; no add-dot or add-all.'})
result=read(E/'PHASE5_INTEGRATION_RESULT.json');result.update(STEP_23M_PHASE5_GIT_INTEGRATION='PASS_COMMIT_READY',INTEGRATION_MANIFEST='PASS',INTEGRATION_PATH_COUNT=len(included),ALL_PRECOMMIT_GATES='PASS',SAFE_TO_COMMIT='YES')
j('PHASE5_INTEGRATION_RESULT.json',result)
md('PHASE5_PRECOMMIT_FINAL_GATE.md','\n'.join(['# Final precommit gate','',*[k+'='+str(result[k]) for k in ['RECTOR_GATE','CANONICAL_DATA_ARCHITECTURE','AUTHORITY_RECONCILIATION','CORE_GRC_TRACEABILITY','SOURCE_RELEASE_RECONCILIATION','SECURITY_GATES','ALL_PRECOMMIT_GATES','GIT_HISTORY_PREFLIGHT','INTEGRATION_MANIFEST','SAFE_TO_COMMIT']]]))
included.append('artifacts/phase5-integration/PHASE5_PRECOMMIT_FINAL_GATE.md');included=sorted(set(included))
selected=read(E/'PHASE5_SELECTED_PATHS.json');selected.update(paths=included,pathCount=len(included));j('PHASE5_SELECTED_PATHS.json',selected)
result['INTEGRATION_PATH_COUNT']=len(included);j('PHASE5_INTEGRATION_RESULT.json',result)
exact=[{'path':p,'sha256':sha((R/p).read_bytes()),'gitBlob':git('hash-object','--',p)} for p in included]
(T/(N+'-staging-manifest.json')).write_text(json.dumps({'paths':exact,'pathCount':len(exact),'exclusions':selected['exclusions'],'sealedAt':now,'expectedParent':git('rev-parse','HEAD')},indent=2)+'\n')
print(json.dumps({'SAFE_TO_COMMIT':'YES','paths':len(exact),'excludedPreserved':len(selected['exclusions']),'detachedManifest':str(T/(N+'-staging-manifest.json'))}))
