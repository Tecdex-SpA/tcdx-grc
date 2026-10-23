#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/normative-library/generate-contract-assets.mjs --check
pnpm --filter @tcdx-grc/contracts build
pg_bin="${TCDX_LOCAL_PG16_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
task_dir="$(mktemp -d /private/tmp/tcdx-regulatory-pipeline.XXXXXX)"
task_port="${TCDX_REGULATORY_TEST_PORT:-55559}"
[[ "$task_port" =~ ^[0-9]+$ ]] && (( task_port > 0 && task_port < 65536 ))
export DATABASE_HOST=127.0.0.1 DATABASE_HOSTADDR= DATABASE_PORT="$task_port" DATABASE_NAME=tcdx-grc
export DATABASE_USER="$(id -un)" DATABASE_PASSWORD= DATABASE_SSL_MODE=disable
export TCDX_ISOLATED_REBUILD=true TCDX_REGULATORY_PIPELINE_INTEGRATION=true
export TCDX_REGULATORY_TEST_CLUSTER="$task_dir/data"
cleanup() {
  task_result=$?
  trap - EXIT
  if [[ -f "$task_dir/data/postmaster.pid" ]]; then
    "$pg_bin/pg_ctl" -D "$task_dir/data" -m fast -w stop || exit 1
  fi
  exit "$task_result"
}
trap cleanup EXIT
"$pg_bin/initdb" --version | rg '16\.' >/dev/null
"$pg_bin/initdb" -D "$task_dir/data" --auth=trust --encoding=UTF8 --locale=C >"$task_dir/initdb.log"
"$pg_bin/pg_ctl" -D "$task_dir/data" -l "$task_dir/server.log" -o "-h 127.0.0.1 -p $task_port -k $task_dir" -w start
"$pg_bin/createdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
node --experimental-strip-types scripts/foundations/migrate.ts apply
node --experimental-strip-types scripts/foundations/verify-schema.ts
pnpm exec vitest run --config vitest.integration.config.ts apps/backend/src/regulatory/pipeline.postgres.test.ts --no-file-parallelism
printf 'ISOLATED_CLUSTER=%s\n' "$task_dir"
