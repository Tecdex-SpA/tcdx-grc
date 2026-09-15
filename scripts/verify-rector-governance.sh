#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "RECTOR_GATE=BLOCKED"
  echo "REASON=$1"
  exit 1
}

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

MASTER_ID="TCDX_GRC_MASTER_REGENT_BASELINE_v1.4_2026-09-15"
BASELINE_DIR="docs/rector/baseline"
MASTER_STATUS="docs/governance/MASTER_EXECUTION_STATUS.md"

required=(
  "AGENTS.md"
  "docs/governance/CODEX_RECTOR_ENFORCEMENT.md"
  "docs/rector/BASELINE_STATUS"
  "docs/rector/BASELINE_ID"
  "$MASTER_STATUS"
)

for f in "${required[@]}"; do
  [[ -f "$f" ]] || fail "missing required governance file: $f"
done

status="$(tr -d '[:space:]' < docs/rector/BASELINE_STATUS)"

case "$status" in
  PENDING)
    fail "master rector baseline must be ACTIVE before governed development"
    ;;
  ACTIVE)
    ;;
  *)
    fail "invalid BASELINE_STATUS '$status'; expected ACTIVE"
    ;;
esac

baseline_id="$(tr -d '\r\n' < docs/rector/BASELINE_ID)"
[[ "$baseline_id" == "$MASTER_ID" ]] || fail "unexpected BASELINE_ID '$baseline_id'; expected '$MASTER_ID'"

[[ -d "$BASELINE_DIR" ]] || fail "missing immutable master baseline directory"
[[ -f "$BASELINE_DIR/SHA256SUMS.txt" ]] || fail "missing baseline SHA256SUMS.txt"
[[ -f "$BASELINE_DIR/46_REGENTE_MAESTRO_DEL_DESARROLLO.md" ]] || fail "missing master regent entry point"
[[ -f "$BASELINE_DIR/47_APROBACION_Y_ACTIVACION_BASELINE.md" ]] || fail "missing human activation contract"
[[ -f "$BASELINE_DIR/PRE_IMPLEMENTATION_GATE_REPORT.md" ]] || fail "missing pre-implementation gate report"

if find "$BASELINE_DIR" -type l -print -quit | grep -q .; then
  fail "symlinks are forbidden inside the immutable rector baseline"
fi

expected="$(mktemp)"
actual="$(mktemp)"
trap 'rm -f "$expected" "$actual"' EXIT

awk '{f=$2; sub(/^\.\//,"",f); if (f != "") print f}' "$BASELINE_DIR/SHA256SUMS.txt" | LC_ALL=C sort > "$expected"
echo "SHA256SUMS.txt" >> "$expected"
LC_ALL=C sort -o "$expected" "$expected"

# Portable on GNU/Linux and macOS/BSD find: strip the directory prefix with sed
# instead of relying on GNU find -printf.
find "$BASELINE_DIR" -mindepth 1 -maxdepth 1 -type f -print \
  | sed "s#^$BASELINE_DIR/##" \
  | LC_ALL=C sort > "$actual"

if ! cmp -s "$expected" "$actual"; then
  echo "--- expected baseline inventory ---"
  cat "$expected"
  echo "--- actual baseline inventory ---"
  cat "$actual"
  fail "rector baseline inventory differs from immutable manifest"
fi

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$BASELINE_DIR" && sha256sum -c SHA256SUMS.txt) \
    || fail "master rector baseline SHA-256 validation failed"
elif command -v shasum >/dev/null 2>&1; then
  while read -r hash file; do
    [[ -n "$hash" && -n "$file" ]] || continue
    file="${file#./}"
    actual_hash="$(shasum -a 256 "$BASELINE_DIR/$file" | awk '{print $1}')"
    [[ "$actual_hash" == "$hash" ]] || fail "hash mismatch: $BASELINE_DIR/$file"
  done < "$BASELINE_DIR/SHA256SUMS.txt"
else
  fail "no SHA-256 verification tool available"
fi

# Current authorized phase is physical model DESIGN only. Migrations and
# functional implementation remain blocked until their human-approved gates pass.
if grep -q '^`MIGRATIONS=BLOCKED`$' "$MASTER_STATUS" 2>/dev/null || grep -q 'MIGRATIONS=BLOCKED' "$MASTER_STATUS"; then
  if [[ -d migrations || -d db/migrations || -d database/migrations ]]; then
    fail "migration artifacts are forbidden while MIGRATIONS=BLOCKED"
  fi
fi

if grep -q '^`FUNCTIONAL_DEVELOPMENT=BLOCKED`$' "$MASTER_STATUS" 2>/dev/null || grep -q 'FUNCTIONAL_DEVELOPMENT=BLOCKED' "$MASTER_STATUS"; then
  for p in backend frontend apps api services; do
    if [[ -e "$p" ]]; then
      fail "functional path '$p' is forbidden while FUNCTIONAL_DEVELOPMENT=BLOCKED"
    fi
  done
fi

echo "RECTOR_GATE=PASS"
echo "BASELINE_STATUS=ACTIVE"
echo "BASELINE_ID=$baseline_id"
echo "RECTOR_BASELINE_INTEGRITY=PASS"
echo "CODEX_VARIATION_BUDGET=ZERO"
echo "PHYSICAL_MODEL_DESIGN=AUTHORIZED"
echo "MIGRATIONS=BLOCKED"
echo "FUNCTIONAL_DEVELOPMENT=BLOCKED"
