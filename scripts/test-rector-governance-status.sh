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

echo "RECTOR_STATUS_TEST=PASS"
