#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "RECTOR_STATUS_TEST=FAIL"
  echo "REASON=$1"
  exit 1
}

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

MASTER_STATUS="docs/governance/MASTER_EXECUTION_STATUS.md"
PRE_F5E_MIGRATION="database/migrations/20260923000100_pre_f5e_platform_authority.sql"
HISTORICAL_PRE_F5C_MIGRATION="database/migrations/20260921000100_pre_f5c_executable_physical_reconciliation.sql"
EXPECTED_SCHEMA="database/expected-schema.json"
CANDIDATE_DIR="docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23"
EXPECTED_PRE_F5E_MIGRATION_SHA="4ee0b3d24c7d7aa6ea87a8e9a6618cd2a7b164aedf1e3990590c3cf1b512ea82"
EXPECTED_HISTORICAL_PRE_F5C_MIGRATION_SHA="1181d7ab26718927124de880e351fbaba3f2daaca41267a1ef66d28ac2021680"
EXPECTED_CANDIDATE_MANIFEST_SHA="8c0a0ca1aab37c668c138597cbba7385481e6aef0abda0b08b9678ac4ce62d48"

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    fail "no SHA-256 verification tool available"
  fi
}

[[ -f "$MASTER_STATUS" ]] \
  || fail "missing $MASTER_STATUS"

expected="$(
  awk '
    /^## Current authorized phase[[:space:]]*$/ {
      in_section=1
      next
    }

    in_section && /^## / {
      exit
    }

    in_section && /^`[A-Z0-9_]+=.*`$/ {
      line=$0
      sub(/^`/, "", line)
      sub(/`$/, "", line)
      print line
    }
  ' "$MASTER_STATUS"
)"

[[ -n "$expected" ]] \
  || fail "Current authorized phase has no machine-readable assignments"

output="$(bash ./scripts/verify-rector-governance.sh)"

grep -Fxq "RECTOR_GATE=PASS" <<< "$output" \
  || fail "rector gate did not pass"

grep -Fxq "EXECUTION_STATUS_SOURCE=$MASTER_STATUS" <<< "$output" \
  || fail "execution status source not reported"

for required in \
  "BASELINE_STATUS=ACTIVE" \
  "BASELINE_ID=TCDX_GRC_MASTER_REGENT_BASELINE_v1.7_2026-09-23" \
  "PROTECTED_V1_5_INTEGRITY=PASS" \
  "PROTECTED_V1_6_INTEGRITY=PASS" \
  "PRE_F5C_QA_MIGRATION_EXECUTED=1" \
  "PRE_F5E_QA_MIGRATION_EXECUTED=1" \
  "DATABASE_TABLES_ACTIVE_QA=235" \
  "DATABASE_TABLES_TARGET_CANONICAL=235" \
  "PHASE_5_FINAL_QA_MIGRATION_EXECUTED=1" \
  "PHASE_5_SUBSCRIPTION_CATALOG_QA_MIGRATION_EXECUTED=1" \
  "PHASE_5_RETENTION_POLICY_QA_MIGRATION_EXECUTED=1" \
  "PRE_F5E=PASS" \
  "PHASE_5_MEMBERSHIP_INVITATION_DECISION=HUMAN_APPROVED_2026_09_24" \
  "PHASE_5_MEMBERSHIP_INVITATION_LOCAL_CANDIDATE=PASS_ISOLATED_REBUILD_AND_SECURITY_INTEGRATION" \
  "PHASE_5_MEMBERSHIP_INVITATION_QA_MIGRATION_EXECUTED=1" \
  "PHASE_5_MEMBERSHIP_INVITATION_AUTHORITY_RECONCILIATION_QA_EXECUTED=1" \
  "PHASE_5_ADMINISTRATIVE_READ_DECISION=HUMAN_APPROVED_2026_09_28" \
  "PHASE_5_ADMINISTRATIVE_READ_QA_MIGRATION_EXECUTED=1" \
  "PHASE_5_MEMBERSHIP_ROLE_REVOKE_DECISION=HUMAN_APPROVED_2026_09_28" \
  "PHASE_5_MEMBERSHIP_ROLE_REVOKE_LOCAL_CANDIDATE=PASS_20_MIGRATIONS_64_E2E" \
  "PHASE_5_MEMBERSHIP_ROLE_REVOKE_QA_MIGRATION_EXECUTED=1" \
  "PHASE_5_QA_MIGRATIONS=25" \
  "PHASE_5_QA_PERMISSION_ROWS=163" \
  "PHASE_5_QA_LATEST_MIGRATION=20260929000300" \
  "PHASE5_PLUS_SUBJECT_VALIDATION_DECISION=HUMAN_APPROVED_2026_09_29" \
  "PHASE5_PLUS_SUBJECT_VALIDATION_LOCAL_CANDIDATE=PASS_25_MIGRATIONS_235_TABLES_163_PERMISSIONS_92_E2E" \
  "PHASE5_PLUS_SUBJECT_VALIDATION_QA_APPLIED=YES" \
  "PHASE5_PLUS_QA_APPLY_REQUIRED=NO" \
  "PHASE5_PLUS_QA_APPLIED=YES" \
  "PHASE5_PLUS_TECDEX_SUBJECT_QA=CREATED_ORGANIZATION_TECDEX" \
  "PHASE5_PLUS_TECDEX_ACCOUNT_CLASSIFICATION_QA=test" \
  "PHASE5_PLUS_ISO_9001_2026_VALIDATION_PROVENANCE_QA=CREATED" \
  "PHASE5_PLUS_VALIDATION_ACCESS_COUNT_QA=0" \
  "PHASE5_PLUS_22J_CANDIDATE_READ_LOCAL_IMPLEMENTATION=PASS" \
  "PHASE5_PLUS_22J_CANDIDATE_READ_QA_DEPLOYED=NO" \
  "PHASE5_PLUS_22K_CREATE_UI_LOCAL_IMPLEMENTATION=PASS" \
  "PHASE5_PLUS_22K_CREATE_UI_QA_DEPLOYED=NO" \
  "PHASE_5_ROLE_REVOKE_QA_INTEGRITY=PASS" \
  "PHASE_5_SECOND_REAL_HUMAN=PASS" \
  "PHASE_5_STORAGE_ADAPTER_QA=PASS_PRESIGNED_SCAN_PROMOTE_GET_MALWARE_DENY_ZERO_RESIDUE" \
  "PHASE_5_BROWSER_UPLOAD_GATE=HUMAN_APPROVED_PRIVATE_MINIO_GRC_HTTPS_LOCAL_CANDIDATE_PENDING_QA" \
  "PHASE_5_FILE_DOWNLOAD_API=HUMAN_APPROVED_GRC_HTTPS_LOCAL_CANDIDATE_PENDING_QA" \
  "PHASE_5_RETENTION_READ_UPDATE_API=HUMAN_APPROVED_LOCAL_CANDIDATE_PENDING_QA" \
  "PHASE_5_CONTROL_ASSESSMENT_START=HUMAN_APPROVED_TENANT_CONTROL_OWNER_LOCAL_MIGRATION_PENDING_QA" \
  "PHASE_5_SOURCE_RUNTIME_PARITY=PENDING_22J_22K_QA_DEPLOYMENT" \
  "PHASE_5_BACKEND_QA_IMAGE=sha256:bf2c8b28e18f43ee8c09f0053400b136038a5b848f8185fb4b3438732e516bec" \
  "PHASE_5_FRONTEND_QA_IMAGE=sha256:2f23bd8a7b7bc634d98243f2d092acf162d8a5b2f38256de8a5df82b2bcb1713" \
  "PHASE_5_FINAL_LOCAL_GATES=PASS_21_MIGRATIONS_68_E2E_TECHNICAL_CANDIDATE" \
  "PHASE_5_ADMINISTRATIVE_READ_QA_OWNER_GATE=PASS_CANONICAL_RUNNER_APPLIED" \
  "PHASE_5_RUNTIME_CLOSURE=PENDING_22J_22K_QA_DEPLOYMENT_REAL_SOD_AND_HUMAN_UI" \
  "PHASE_5=AUTHORIZED" \
  "HUMAN_UI_REVIEW=PENDING" \
  "PHASE_6_STARTED=0" \
  "PHASE_6=BLOCKED"
do
  grep -Fxq "$required" <<< "$output" \
    || fail "required contextual status missing from verifier output: $required"
done

if grep -Eq '^QA_MIGRATION_EXECUTED=' <<< "$expected" \
   || grep -Eq '^QA_MIGRATION_EXECUTED=' <<< "$output"; then
  fail "ambiguous global QA_MIGRATION_EXECUTED leaked into current status"
fi

if grep -Eq '^DATABASE_TABLES=' <<< "$expected" \
   || grep -Eq '^DATABASE_TABLES=' <<< "$output"; then
  fail "ambiguous global DATABASE_TABLES leaked into current status"
fi

while IFS= read -r line; do
  [[ -n "$line" ]] || continue

  grep -Fxq "$line" <<< "$output" \
    || fail "current execution status missing from verifier output: $line"
done <<< "$expected"

for stale in \
  "MIGRATIONS=BLOCKED" \
  "FUNCTIONAL_DEVELOPMENT=BLOCKED"
do
  if ! grep -Fxq "$stale" <<< "$expected" \
     && grep -Fxq "$stale" <<< "$output"; then
    fail "historical state leaked into verifier output: $stale"
  fi
done

for decision in 001 002 003 004 005 006 007; do
  grep -Eq "^\`F5D_${decision}_[A-Z0-9_]+=CLOSED\`$" "$MASTER_STATUS" \
    || fail "F5D-$decision is not closed in mutable execution status"
done

[[ "$(sha256_file "$PRE_F5E_MIGRATION")" == "$EXPECTED_PRE_F5E_MIGRATION_SHA" ]] \
  || fail "PRE-F5E migration changed"

[[ "$(sha256_file "$HISTORICAL_PRE_F5C_MIGRATION")" == "$EXPECTED_HISTORICAL_PRE_F5C_MIGRATION_SHA" ]] \
  || fail "historical PRE-F5C migration changed"

[[ -f "$EXPECTED_SCHEMA" ]] \
  || fail "authorized expected schema missing"
node scripts/foundations/generate-contract-assets.mjs --check >/dev/null \
  || fail "authorized expected schema differs from canonical generated assets"

[[ "$(sha256_file "$CANDIDATE_DIR/CANDIDATE_MANIFEST.sha256")" == "$EXPECTED_CANDIDATE_MANIFEST_SHA" ]] \
  || fail "v1.6 candidate manifest changed"

while read -r hash file; do
  [[ -n "$hash" && -n "$file" ]] || continue
  file="${file#./}"
  [[ "$(sha256_file "$CANDIDATE_DIR/$file")" == "$hash" ]] \
    || fail "v1.6 candidate entry changed: $file"
done < "$CANDIDATE_DIR/CANDIDATE_MANIFEST.sha256"

echo "RECTOR_STATUS_TEST=PASS"
