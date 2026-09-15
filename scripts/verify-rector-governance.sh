#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "RECTOR_GATE=BLOCKED"
  echo "REASON=$1"
  exit 1
}

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

required=(
  "AGENTS.md"
  "docs/governance/CODEX_RECTOR_ENFORCEMENT.md"
  "docs/rector/BASELINE_STATUS"
)

for f in "${required[@]}"; do
  [[ -f "$f" ]] || fail "missing required governance file: $f"
done

status="$(tr -d '[:space:]' < docs/rector/BASELINE_STATUS)"

case "$status" in
  PENDING)
    # During rector review there must be no functional implementation.
    forbidden=(
      "backend"
      "frontend"
      "db"
      "database"
      "migrations"
      "prisma"
      "api"
      "services"
      "apps"
    )

    for p in "${forbidden[@]}"; do
      if [[ -e "$p" ]]; then
        fail "functional path '$p' is not authorized while BASELINE_STATUS=PENDING"
      fi
    done

    # Executable SQL is also forbidden outside governance/docs while pending.
    if find . -type f \( -name '*.sql' -o -name '*.psql' \) \
      ! -path './.git/*' -print -quit | grep -q .; then
      fail "executable database artifacts are not authorized while BASELINE_STATUS=PENDING"
    fi

    echo "RECTOR_GATE=PASS"
    echo "BASELINE_STATUS=PENDING"
    echo "PROJECT_MODE=BOOTSTRAP_GOVERNED"
    ;;

  ACTIVE)
    [[ -f docs/rector/BASELINE_ID ]] || fail "ACTIVE baseline requires docs/rector/BASELINE_ID"
    [[ -s docs/rector/BASELINE_ID ]] || fail "BASELINE_ID is empty"
    [[ -f docs/rector/RECTOR_MANIFEST.sha256 ]] || fail "ACTIVE baseline requires RECTOR_MANIFEST.sha256"
    [[ -d docs/rector/baseline ]] || fail "ACTIVE baseline requires docs/rector/baseline/"

    if command -v sha256sum >/dev/null 2>&1; then
      (cd docs/rector && sha256sum -c RECTOR_MANIFEST.sha256) \
        || fail "rector baseline SHA-256 integrity validation failed"
    elif command -v shasum >/dev/null 2>&1; then
      while read -r hash file; do
        [[ -n "$hash" && -n "$file" ]] || continue
        actual="$(cd docs/rector && shasum -a 256 "$file" | awk '{print $1}')"
        [[ "$actual" == "$hash" ]] || fail "hash mismatch: docs/rector/$file"
      done < docs/rector/RECTOR_MANIFEST.sha256
    else
      fail "no SHA-256 verification tool available"
    fi

    echo "RECTOR_GATE=PASS"
    echo "BASELINE_STATUS=ACTIVE"
    echo "BASELINE_ID=$(tr -d '\r\n' < docs/rector/BASELINE_ID)"
    ;;

  *)
    fail "invalid BASELINE_STATUS '$status'; expected PENDING or ACTIVE"
    ;;
esac
