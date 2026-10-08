from pathlib import Path
import datetime, hashlib, json, subprocess

R = Path('/Users/andresbarouh/repos/tcdx-grc')
E = R / 'artifacts/phase5-integration'
T = Path('/private/tmp')
N = 'tcdx-grc-phase5-integration-'
load = lambda p: json.loads(Path(p).read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=R).decode().strip()
def write(name, data):
    (E / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

now = datetime.datetime.now(datetime.timezone.utc).isoformat()
main = '7225f1ee607c0c9be5c810976f66c3c27a40e06c'
assert git('branch', '--show-current') == 'main'
assert git('rev-parse', 'HEAD') == git('rev-parse', 'origin/main') == main
assert not git('diff', '--cached', '--name-only')
assert git('diff', '--name-only') == 'docs/governance/MASTER_EXECUTION_STATUS.md'
current = {k: load(T / (N + 'post-' + k + '.json')) for k in ['authority', 'runtime', 'db', 'core', 'public']}
historical = load(E / 'PHASE5_QA_READONLY_POST.json')
db = current['db']; authority = current['authority']; runtime = current['runtime']
assert (db['migrations'], db['latest'], db['physicalTables'], db['publishedPermissions']) == (30, '20261007000200', 237, 172)
assert db['ledgerMatchesManifest'] and not db['pendingIds'] and db['identity']['read_only'] == 'on'
for key in ['schemaSha256', 'ledger']:
    assert db[key] == historical['db'][key], key
assert db['preservedData'] == load(E / 'PHASE5_QA_TABLE_PRESERVATION.json')['post']
for actual, expected in zip(runtime['components'], historical['runtime']['components']):
    assert actual['running'] and actual['health'] == 'healthy'
    for key in ['imageId', 'containerId', 'configurationFingerprint', 'secretMetadata', 'startedAt', 'restartCount']:
        assert actual[key] == expected[key], (actual['name'], key)
assert (authority['activePlatformAdmin'], authority['membership'], authority['tenantRoles'], authority['otp']) == (1, 1, 0, 1)
assert authority['readOnly'] and authority['enabled'] and authority['issuerSubjectMappingExact']
for key in ['membershipDetails', 'membershipOriginAudits']:
    assert authority[key] == historical['authority'][key]
iam = authority['extra']['iam']
assert iam == load(T / (N + 'pre-authority.json'))['extra']['iam']
for authenticator in ['auth-username-password-form', 'auth-otp-form']:
    assert any(x['authenticator'] == authenticator and x['name'] == 'default.reference.maxAge' and x['value'] == '600' for x in iam['authConfig'])
    assert any(x['authenticator'] == authenticator and x['requirement'] == 0 for x in iam['executions'])
assert any(x['authenticator'] == 'auth-cookie' and x['requirement'] == 3 for x in iam['executions'])
assert not iam['forbiddenRoles']
for key in ['qaRecords', 'qaAudits', 'qaSupport', 'methodologyPublicationAudits']:
    assert current['core'][key] == load(T / (N + 'pre-core.json'))[key], key
assert all(x['expectedStatus'] and x['tls_verified'] for x in current['public'].values())
peer = load(T / (N + 'public-peer.json'))
assert peer['canonicalURLsOnly'] and peer['writes'] == 0
for key, value in peer['results'].items():
    assert value['returnCode'] == 0 and value['tlsVerified']
    assert value['status'] == (200 if key in ['grc', 'discovery', 'jwks'] else 404)
assert peer['results']['discovery']['issuer'] == 'https://iam.grc.tecdex.net/realms/tcdx-managed-identity'
assert peer['results']['jwks']['key_count'] > 0
assets = load(T / (N + 'restored-final-assets-receipt.json'))
assert assets['exitCode'] == 0
code = load(E / 'PHASE5_FINAL_MAIN_CODE_REGRESSION.json')
assert code['mainCommit'] == main and code['requiredCodeGates'] == 'PASS'
assert all(code['receipts'][key]['exitCode'] == 0 for key in ['unit', 'frontend', 'postgres', 'grc-e2e-retry', 'iam-e2e', 'typecheck', 'lint', 'contracts', 'openapi', 'rector', 'secrets'])
assert code['counts'] == {'unit': 485, 'frontend': 81, 'postgres': 82, 'grc-e2e-retry': 428, 'iam-e2e': 21}
changed = git('diff', '--name-only', 'ae051f81d429a5eba371972b1e958976fa7f8857..HEAD').splitlines()
assert all(p.startswith('artifacts/phase5-integration/') or p == 'docs/governance/MASTER_EXECUTION_STATUS.md' for p in changed)

write('PHASE5_FINAL_QA_RECOVERY_PROOF.json', {
    'capturedAt': now, 'testedMainCommit': main, 'health': 'PASS',
    'rootCauseReportedByOwner': 'Caddy machine incident; owner explicitly reports restoration',
    'rootCauseEvidenceScope': 'Human report; agent verifies restored canonical transport and exact application state',
    'proxySSHDiagnostic': 'Host is reachable again but configured tecdex SSH principal is denied. No administrative access or mutation is needed for the required public/application gates.',
    'publicFromAgent': current['public'], 'publicFromQAFrontendPeer': peer,
    'runtime': runtime,
    'database': {k: db[k] for k in ['capturedAt', 'identity', 'migrations', 'latest', 'physicalTables', 'publishedPermissions', 'schemaSha256', 'ledgerMatchesManifest', 'pendingIds', 'ledger']},
    'all237TableFingerprintsEqualFirstPostintegrationObservation': True,
    'authority': {k: authority[k] for k in ['capturedAt', 'enabled', 'identityActive', 'activePlatformAdmin', 'membership', 'tenantRoles', 'otp', 'readOnly', 'membershipDetails', 'membershipOriginAudits']},
    'iamPolicy': {'passwordMaxAge': 600, 'otpMaxAge': 600, 'mfa': 'REQUIRED', 'cookie': 'DISABLED', 'allIAMConfigurationsEqualPrecommit': True},
    'coreRecordsSupportAndAuditsUnchanged': True,
    'publicAssetsReceipt': assets,
    'publicAssetsLogSha256': sha((T / (N + 'restored-final-assets.log')).read_bytes()),
    'functionalCodeRegression': 'PHASE5_FINAL_MAIN_CODE_REGRESSION.json',
    'qaDeploys': 0, 'qaFunctionalWrites': 0, 'iamMutations': 0, 'phase6Started': 0,
})
# Preserve the exact later BLOCKED observation and append its observed resolution.
incident = E / 'PHASE5_FINAL_READONLY_INCIDENT.md'
marker = '## Verified recovery and resolution'
assert marker not in incident.read_text()
with incident.open('a') as f:
    f.write(f'\n{marker} — {now}\n\nThe owner identified the Caddy machine incident and reported restoration. Fresh canonical GRC HTTPS, issuer discovery and JWKS return200 from the agent and the QA frontend VM with valid TLS. All six public admin/master deny probes return404. Backend live/ready/providers return200; public bundle/logo match the exact deployed container and approved brand asset; active wrong-domain references0. These are independent read-only observations, not an inferred PASS from the owner report.\n\nAll three application image/container/configuration/start/restart/secret-metadata fingerprints, schema/ledger30/237/172 and all237 table fingerprints equal the first successful postintegration observation. The reviewer authority is unchanged1/1/0/OTP1; mandatory MFA/600-second AMR and CookieDISABLED remain exact. Core records and audits are unchanged. No agent runtime write/restart/deploy/IAM change occurred. Caddy SSH is reachable but the configured principal is denied; no Caddy administration is required or attempted. The required public and application gates PASS.\n\nThe earlier incident JSON remains an immutable historical snapshot of the failed observation. Current result: PHASE5_INTEGRATION_RESULT.json, with PHASE5_FINAL_QA_RECOVERY_PROOF.json. Current final QA gate PASS; incident RESOLVED; integration pendingNO; Phase5 PASS/closedYES; Phase6 READY/unstarted. Recovery evidence and status append are selected for the authorized documentation-only protected-main publication.\n')
result = load(E / 'PHASE5_INTEGRATION_RESULT.json')
result.update(
    STEP_23M_PHASE5_GIT_INTEGRATION='PASS', RECTOR_GATE='PASS', PHASE_5_INTEGRATION='PASS',
    PHASE_5_INTEGRATION_PENDING='NO', QA_HEALTH='PASS', SAFE_TO_COMMIT='YES',
    FINAL_READONLY_QA_GATE='PASS', FINAL_READONLY_INCIDENT='RESOLVED', CURRENT_BLOCKERS=0,
    FINAL_MAIN_CODE_REGRESSION='PASS', FINAL_CODE_TESTED_MAIN_COMMIT=main,
    EVIDENCE_COMMIT='ac5692c6c5d566a773adfa051aaa7a43c8d9d4c5',
    EVIDENCE_PR='https://github.com/Tecdex-SpA/tcdx-grc/pull/19',
    FINAL_QA_RECOVERY_PROOF='PHASE5_FINAL_QA_RECOVERY_PROOF.json',
    FINAL_EVIDENCE_PUBLICATION='GOVERNED_DOCUMENTATION_ONLY_RECOVERY_CLOSURE',
    NEXT_REQUIRED_ACTION='REQUEST_EXPLICIT_PHASE6_START_AUTHORIZATION',
)
write('PHASE5_INTEGRATION_RESULT.json', result)
report = f'''# Final main regression and QA recovery closure — PASS

Observed {now}. Functional commit ae051f81d429a5eba371972b1e958976fa7f8857 and evidence commit ac5692c6c5d566a773adfa051aaa7a43c8d9d4c5 are preserved through protected PR18/19 in main {main}. Both required CI checks and main rector CI PASS. History and exact manifest trees are preserved; no force push or bypass.

Fresh complete regression on the final main tree:485 unit/contract (including81 frontend), separately81 frontend,82 PostgreSQL isolated,428 GRC E2E,21 IAM E2E, typecheck/lint/OpenAPI/matrix/permissions/RBAC/scope/contracts/rector/secret/domain/Git PASS. Original resource timeout, unchanged repeated affected test12 passes and complete428 suite recovery are preserved in FINAL_MAIN_OBSERVATION_RAW_OUTPUTS.tar. All functional blobs are unchanged from the fully tested integrated feature; this publication contains only evidence and append-only governance.

The later public transport outage is retained as a historical observation. After the owner's Caddy restoration report, fresh independent HTTPS/OIDC/JWKS from both the agent and QA VM pass; six public admin/master surfaces deny404. Public bundle/logo and backend health GETs match the validated release. All application containers/images/configurations/restarts, schema/ledger30/latest20261007000200/237/172, authority and Core GRC records/audits remain unchanged. All237 table fingerprints equal the first successful postintegration observation; the previously explained concurrent human login remains historical. QA activity is read-only throughout.

Current rector/material gates PASS, unresolved rector conflicts0, incident RESOLVED, Phase5 integration pendingNO/closedYES, Phase6 READY/unstarted0. No QA deploy, SQL write, IAM mutation, production or Phase6 work. Preserve two unrelated regulatory archives and the original archived raw snapshot in the worktree. Current full output: PHASE5_INTEGRATION_RESULT.json. Traceability: PHASE5_CORE_TRACEABILITY.md, canonical/authority/source reports and current PHASE5_FINAL_QA_RECOVERY_PROOF.json.
'''
assert (E / 'PHASE5_CORE_TRACEABILITY.md').exists()
(E / 'PHASE5_FINAL_RECOVERY_CLOSURE.md').write_text(report)
with (E / 'PHASE5_INTEGRATION_REPORT.md').open('a') as f:
    f.write(f'\n## Final independent QA recovery closure — {now}\n\nThe later Caddy incident is preserved and resolved by fresh canonical HTTPS/OIDC/JWKS/QA-peer/asset/health readings PASS. Final main485/81/82/428/21 and all material gates PASS; source unchanged, authority/data/schema/release exact. Current result Phase5 integration PASS/pendingNO/closedYES; Phase6 READY/unstarted0. Detailed closure: PHASE5_FINAL_RECOVERY_CLOSURE.md and PHASE5_FINAL_QA_RECOVERY_PROOF.json. The evidence followup changes documentation only and preserves the earlier incident and PASS records.\n')
status = R / 'docs/governance/MASTER_EXECUTION_STATUS.md'
statusMarker = '## 2026-10-08 — STEP 23M final Caddy recovery verification and integration closure'
assert statusMarker not in status.read_text()
keys = ['MASTER_REGENT', 'RECTOR_GATE', 'UNRESOLVED_RECTOR_CONFLICTS', 'STEP_23M_PHASE5_GIT_INTEGRATION', 'PHASE_5_INTEGRATION', 'PHASE_5_INTEGRATION_PENDING', 'PHASE_5', 'PHASE_5_CLOSED', 'CORE_GRC_SLICE', 'STEP_23L', 'MAIN_INTEGRATION', 'PUSH_ORIGIN_MAIN', 'REMOTE_MAIN_COMMIT_VERIFIED', 'POST_INTEGRATION_REGRESSION', 'FINAL_READONLY_QA_GATE', 'FINAL_READONLY_INCIDENT', 'CURRENT_BLOCKERS', 'ALL_PRECOMMIT_GATES', 'SAFE_TO_COMMIT', 'QA_HEALTH', 'PHASE_6', 'PHASE_6_STARTED', 'QA_DEPLOY_PERFORMED', 'QA_FUNCTIONAL_MUTATIONS', 'IAM_MUTATIONS', 'NEXT_REQUIRED_ACTION']
with status.open('a') as f:
    f.write('\n\n' + statusMarker + '\n\n' + '\n'.join(k + '=' + str(result[k]) for k in keys) + '\n\nThe owner reports the Caddy machine restored. Fresh independent canonical public HTTPS/OIDC/JWKS/deny surfaces pass from agent and QA frontend VM, with release bundle/logo parity and backend health PASS. All application images/configuration/container identities/restarts, DB30/237/172/schema/ledger, all237 current table fingerprints, authorized andres.grc1/1/0/OTP1, exact MFA/maxAge600/CookieDISABLED and Core records/audits are unchanged. Fresh final main7225f1e485/81/82/428/21 and mandatory code/static/security/Git regressions PASS. The sole later transport incident is RESOLVED; preserve its earlier blocked observation and prior PASS history. Documentation-only recovery followup publishes these facts through protected PR/required rector CI with preserved source/history. No agent QA SQL write/deploy/IAM mutation and no Phase6. Evidence: artifacts/phase5-integration/PHASE5_FINAL_RECOVERY_CLOSURE.md, PHASE5_FINAL_MAIN_CODE_REGRESSION.json, PHASE5_FINAL_QA_RECOVERY_PROOF.json and current full PHASE5_INTEGRATION_RESULT.json.\n')
print(json.dumps({'recovery': 'PASS', 'qa': 'PASS', 'finalMainCode': 'PASS', 'all237TablesUnchanged': True, 'incident': 'RESOLVED', 'safeToCommit': 'YES'}))
