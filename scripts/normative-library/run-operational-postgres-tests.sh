#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/normative-library/generate-contract-assets.mjs --check
pnpm --filter @tcdx-grc/contracts build
pg_bin="${TCDX_LOCAL_PG16_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
task_dir="$(mktemp -d /private/tmp/tcdx-library-operational.XXXXXX)"
task_port=55549
export DATABASE_HOST=127.0.0.1 DATABASE_HOSTADDR= DATABASE_PORT="$task_port" DATABASE_NAME=tcdx-grc
export DATABASE_USER="$(id -un)" DATABASE_PASSWORD= DATABASE_SSL_MODE=disable
export TCDX_ISOLATED_REBUILD=true TCDX_LIBRARY_OPERATIONAL_INTEGRATION=true
export TCDX_LIBRARY_TEST_CLUSTER="$task_dir/data"
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
node --input-type=module -e 'import net from "node:net";const s=net.createServer();s.on("error",()=>process.exit(1));s.listen(55549,"127.0.0.1",()=>s.close());'
"$pg_bin/initdb" -D "$task_dir/data" --auth=trust --encoding=UTF8 --locale=C >"$task_dir/initdb.log"
"$pg_bin/pg_ctl" -D "$task_dir/data" -l "$task_dir/server.log" -o "-h 127.0.0.1 -p $task_port -k $task_dir" -w start
"$pg_bin/createdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
node --input-type=module -e 'import fs from "node:fs";const m=JSON.parse(fs.readFileSync("database/migrations/manifest.json"));if(m.migrations.length!==36)throw Error("36 canonical migrations required");m.migrations=m.migrations.slice(0,35);fs.writeFileSync(process.argv[1],JSON.stringify(m,null,2)+"\n");' "$task_dir/predecessor-manifest.json"
TCDX_MIGRATION_TEST_MODE=true TCDX_MIGRATION_MANIFEST="$task_dir/predecessor-manifest.json" node --experimental-strip-types scripts/foundations/migrate.ts apply
pnpm exec vitest run --config vitest.integration.config.ts apps/backend/src/configuration/optional-default-upgrade.postgres.test.ts --no-file-parallelism
node --experimental-strip-types scripts/foundations/verify-schema.ts
pnpm exec vitest run --config vitest.integration.config.ts apps/backend/src/security/normative-library-publication.postgres.test.ts --no-file-parallelism
printf 'ISOLATED_CLUSTER=%s\n' "$task_dir"
