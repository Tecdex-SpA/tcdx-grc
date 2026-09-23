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
EXPECTED_SCHEMA="database/expected-schema.json"
CANDIDATE_DIR="docs/rector/candidates/TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23"
EXPECTED_PRE_F5E_MIGRATION_SHA="4ee0b3d24c7d7aa6ea87a8e9a6618cd2a7b164aedf1e3990590c3cf1b512ea82"
EXPECTED_SCHEMA_SHA="ffebb478943cdbdedbb38bd0b64829651f7f6a0f9d0fbd17863b861141a291c6"
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
  "BASELINE_ID=TCDX_GRC_MASTER_REGENT_BASELINE_v1.6_2026-09-23" \
  "PROTECTED_V1_5_INTEGRITY=PASS" \
  "PRE_F5C_QA_MIGRATION_EXECUTED=1" \
  "PRE_F5E_QA_MIGRATION_EXECUTED=0" \
  "DATABASE_TABLES_ACTIVE_QA=229" \
  "DATABASE_TABLES_TARGET_CANONICAL=230" \
  "PRE_F5E=PASS" \
  "PHASE_5_RUNTIME_CLOSURE=PENDING" \
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

[[ "$(sha256_file "$EXPECTED_SCHEMA")" == "$EXPECTED_SCHEMA_SHA" ]] \
  || fail "PRE-F5E expected schema changed"

[[ "$(sha256_file "$CANDIDATE_DIR/CANDIDATE_MANIFEST.sha256")" == "$EXPECTED_CANDIDATE_MANIFEST_SHA" ]] \
  || fail "v1.6 candidate manifest changed"

while read -r hash file; do
  [[ -n "$hash" && -n "$file" ]] || continue
  file="${file#./}"
  [[ "$(sha256_file "$CANDIDATE_DIR/$file")" == "$hash" ]] \
    || fail "v1.6 candidate entry changed: $file"
done < "$CANDIDATE_DIR/CANDIDATE_MANIFEST.sha256"

echo "RECTOR_STATUS_TEST=PASS"
