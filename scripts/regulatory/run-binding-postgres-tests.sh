#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
profile="${1:-runtime}"
[[ "$profile" == schema || "$profile" == runtime ]] || exit 2
pg_bin="${TCDX_LOCAL_PG16_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
task_dir="$(mktemp -d /private/tmp/tcdx-runtime-bindings.XXXXXX)"
export DATABASE_HOST=127.0.0.1 DATABASE_HOSTADDR= DATABASE_PORT=55561 DATABASE_NAME=tcdx-grc
export DATABASE_USER="$(id -un)" DATABASE_PASSWORD= DATABASE_SSL_MODE=disable TCDX_ISOLATED_REBUILD=true
export TCDX_RUNTIME_BINDINGS_TEST_CLUSTER="$task_dir/data"
cleanup(){
 task_result=$?
 trap - EXIT
 if [[ -f "$task_dir/data/postmaster.pid" ]]; then "$pg_bin/pg_ctl" -D "$task_dir/data" -m fast -w stop || exit 1; fi
 exit "$task_result"
}
trap cleanup EXIT
"$pg_bin/initdb" --version | rg '16\.' >/dev/null
"$pg_bin/initdb" -D "$task_dir/data" --auth=trust --encoding=UTF8 --locale=C >"$task_dir/initdb.log"
"$pg_bin/pg_ctl" -D "$task_dir/data" -l "$task_dir/server.log" -o "-h 127.0.0.1 -p 55561 -k $task_dir" -w start
[[ "$("$pg_bin/psql" -X -At -h 127.0.0.1 -p 55561 -d postgres -c 'SHOW data_directory')" == "$task_dir/data" ]]
"$pg_bin/createdb" -h 127.0.0.1 -p 55561 tcdx-grc
node --experimental-strip-types scripts/foundations/migrate.ts apply
node --experimental-strip-types scripts/foundations/verify-schema.ts
if [[ "$profile" == runtime ]]; then
 pnpm --filter @tcdx-grc/contracts build
 pnpm --filter @tcdx-grc/backend build
 node scripts/regulatory/prepare-binding-predecessor.mjs
fi
mkdir "$task_dir/migrations"
cp database/migrations/*.sql "$task_dir/migrations/"
cp docs/physical-data-model/amendments/PHASE6A_RUNTIME_BINDINGS_20261023/DDL_SPEC.sql "$task_dir/migrations/20261023000100_phase6a_runtime_bindings.sql"
node --input-type=module - "$task_dir" <<'JS'
import fs from 'node:fs';import {createHash} from 'node:crypto';
const dir=process.argv[2],m=JSON.parse(fs.readFileSync('database/migrations/manifest.json'));
if(m.migrations.length!==36)throw Error('Exact 36-migration predecessor required');
m.migrations.push({id:'20261023000100',filename:'20261023000100_phase6a_runtime_bindings.sql',sha256:createHash('sha256').update(fs.readFileSync(dir+'/migrations/20261023000100_phase6a_runtime_bindings.sql')).digest('hex'),transactional:true});
fs.writeFileSync(dir+'/manifest.json',JSON.stringify(m,null,2)+'\n');
JS
TCDX_MIGRATION_TEST_MODE=true TCDX_MIGRATION_MANIFEST="$task_dir/manifest.json" TCDX_MIGRATION_DIRECTORY="$task_dir/migrations" node --experimental-strip-types scripts/foundations/migrate.ts apply
TCDX_RUNTIME_BINDINGS_EXPECTED_SCHEMA_CANDIDATE=true node --experimental-strip-types scripts/foundations/verify-schema.ts
if [[ "$profile" == runtime ]]; then
 pnpm --filter @tcdx-grc/contracts build
 export TCDX_RUNTIME_BINDINGS_INTEGRATION=true
 pnpm exec vitest run --config vitest.integration.config.ts apps/backend/src/regulatory/runtime-bindings.postgres.test.ts --no-file-parallelism
fi
printf 'ISOLATED_CLUSTER=%s PROFILE=%s\n' "$task_dir" "$profile"
