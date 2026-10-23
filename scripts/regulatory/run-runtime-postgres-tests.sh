#!/usr/bin/env bash
# Disposable PG16 only. Each suite receives a fresh canonical database so that
# synthetic role/catalog fixtures cannot authorize a later suite accidentally.
set -euo pipefail
cd "$(dirname "$0")/../.."
profile="${1:-}"
case "$profile" in
  core)
    task_port=55432
    suites=(
      apps/backend/src/security/runtime-security.postgres.test.ts
      apps/backend/src/security/platform-subscription.postgres.test.ts
      apps/backend/src/regulatory/phase5-plus-validation.postgres.test.ts
      apps/backend/src/regulatory/validation-candidates.postgres.test.ts
      apps/backend/src/regulatory/pack-temporal.postgres.test.ts
      apps/backend/src/core-grc/phase5-lifecycle.postgres.test.ts
      apps/backend/src/core-grc/methodologies.postgres.test.ts
      apps/backend/src/core-grc/reference-reads.postgres.test.ts
      apps/backend/src/configuration/effective-read.postgres.test.ts
    ) ;;
  commercial)
    task_port=55434
    suites=(
      apps/backend/src/security/commercial-catalog-publication.postgres.test.ts
      apps/backend/src/security/subscription-change-plan.postgres.test.ts
      apps/backend/src/regulatory/pack-contract.postgres.test.ts
    ) ;;
  security)
    task_port=55432
    suites=(
      apps/backend/src/security/frontend-projections.postgres.test.ts
      apps/backend/src/security/managed-identity.postgres.test.ts
      apps/backend/src/security/membership-invitation.postgres.test.ts
      apps/backend/src/security/membership-role-revoke.postgres.test.ts
      apps/backend/src/security/platform-role-read.postgres.test.ts
      apps/backend/src/security/platform-role-service.postgres.test.ts
      apps/backend/src/security/rbac-resolution-r3.postgres.test.ts
      apps/backend/src/security/role-assign-projection-scope.postgres.test.ts
      apps/backend/src/security/tenant-onboarding.postgres.test.ts
      apps/backend/src/security/tenant-user-onboarding.postgres.test.ts
    ) ;;
  legacy)
    task_port=55437
    suites=(apps/backend/src/security/c04w-rbac-publication.postgres.test.ts apps/backend/src/security/c04w-lifecycle-publication.postgres.test.ts apps/backend/src/core-grc/initial-retention-source.postgres.test.ts) ;;
  iam)
    task_port=55435
    suites=(apps/backend/src/security/iam-publication.postgres.test.ts) ;;
  *) printf 'Usage: bash %s core|commercial|security|iam|legacy\n' "$0" >&2; exit 2 ;;
esac
pnpm --filter @tcdx-grc/contracts build
pnpm --filter @tcdx-grc/backend build
pg_bin="${TCDX_LOCAL_PG16_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
task_dir="$(mktemp -d /private/tmp/tcdx-runtime-postgres.XXXXXX)"
export DATABASE_HOST=127.0.0.1 DATABASE_HOSTADDR= DATABASE_PORT="$task_port" DATABASE_NAME=tcdx-grc
export DATABASE_USER="$(id -un)" DATABASE_PASSWORD= DATABASE_SSL_MODE=disable
export TCDX_ISOLATED_REBUILD=true TCDX_SECURITY_INTEGRATION=true TCDX_PHASE5_LIFECYCLE_INTEGRATION=true
export TCDX_STEP6A3_REFERENCE_POSTGRES=true TCDX_EC_READONLY_POSTGRES=true
if [[ "$profile" == iam ]]; then export TCDX_IAM_PUBLICATION_INTEGRATION=true; fi
export TCDX_RUNTIME_TEST_CLUSTER="$task_dir/data"
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
actual_directory="$("$pg_bin/psql" -X -At -h 127.0.0.1 -p "$task_port" -d postgres -c 'SHOW data_directory')"
[[ "$actual_directory" == "$task_dir/data" ]]
TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER="$("$pg_bin/psql" -X -At -h 127.0.0.1 -p "$task_port" -d postgres -c 'SELECT system_identifier FROM pg_control_system()')"
export TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER
export TCDX_INITIAL_SOURCE_PG_IDENTIFIER="$TCDX_STEP6A3_PG_SYSTEM_IDENTIFIER"
for suite in "${suites[@]}"; do
  "$pg_bin/createdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
  if [[ "$profile" == legacy ]]; then
    legacy_count=34

    node --input-type=module -e 'import fs from "node:fs";const m=JSON.parse(fs.readFileSync("database/migrations/manifest.json"));m.migrations=m.migrations.slice(0,Number(process.argv[2]));fs.writeFileSync(process.argv[1],JSON.stringify(m));' "$task_dir/legacy-predecessor.json" "$legacy_count"
    TCDX_MIGRATION_TEST_MODE=true TCDX_MIGRATION_MANIFEST="$task_dir/legacy-predecessor.json" node --experimental-strip-types scripts/foundations/migrate.ts apply
    "$pg_bin/psql" -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$task_port" -d tcdx-grc -c "INSERT INTO iam.service_principals(service_principal_id,ownership_class,principal_code,display_name,principal_kind,lifecycle_state) VALUES(gen_random_uuid(),'PLATFORM_CONTROL','SYNTHETIC_LEGACY_FIXTURE','Synthetic local publication fixture','integration','active')"
    "$pg_bin/psql" -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$task_port" -d tcdx-grc -c "INSERT INTO platform.tenants(tenant_id,tenant_code,legal_name,display_name,default_timezone,lifecycle_state) VALUES(gen_random_uuid(),'SYNTHETIC_LEGACY_FIXTURE','Synthetic','Synthetic','UTC','active')"
    export TCDX_C04W_RBAC_INTEGRATION=true TCDX_C04W_LIFECYCLE_INTEGRATION=true TCDX_C04W_ISOLATED_REBUILD=true TCDX_INITIAL_SOURCE_POSTGRES=true
  else
    node --experimental-strip-types scripts/foundations/migrate.ts apply
    node --experimental-strip-types scripts/foundations/verify-schema.ts
  fi
  if [[ "$profile" == core || "$profile" == security ]]; then
    node scripts/regulatory/prepare-runtime-postgres-fixture.mjs
  fi
  if [[ "$suite" == apps/backend/src/core-grc/reference-reads.postgres.test.ts ]]; then
    # The historical migration-upgrade case requires its actual 31-migration
    # predecessor. Do not forge a predecessor by removing ledger rows from 36.
    pnpm exec vitest run --config vitest.integration.config.ts "$suite" --no-file-parallelism --testNamePattern '^(?!.*publication reconciles)'
    "$pg_bin/dropdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
    "$pg_bin/createdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
    node --input-type=module -e 'import fs from "node:fs";const m=JSON.parse(fs.readFileSync("database/migrations/manifest.json"));if(m.migrations[31].id!=="20261009000200"&&m.migrations[31].migration_id!=="20261009000200")throw Error("Unexpected reference predecessor");m.migrations=m.migrations.slice(0,31);fs.writeFileSync(process.argv[1],JSON.stringify(m));' "$task_dir/reference-predecessor.json"
    TCDX_MIGRATION_TEST_MODE=true TCDX_MIGRATION_MANIFEST="$task_dir/reference-predecessor.json" node --experimental-strip-types scripts/foundations/migrate.ts apply
    pnpm exec vitest run --config vitest.integration.config.ts "$suite" --no-file-parallelism --testNamePattern 'publication reconciles'
  else
    pnpm exec vitest run --config vitest.integration.config.ts "$suite" --no-file-parallelism
  fi
  "$pg_bin/dropdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
done
if [[ "$profile" == security ]]; then
 for target in 27 28 29; do
  "$pg_bin/createdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
  node --input-type=module - "$task_dir/historical-predecessor.json" "$target" <<'JS'
import fs from 'node:fs';
const target=Number(process.argv[3]),m=JSON.parse(fs.readFileSync('database/migrations/manifest.json'));
const reviewed={27:'20261006000100',28:'20261006000200',29:'20261007000100'};
if(m.migrations[target-1].id!==reviewed[target])throw Error('Historical publication identity drift');
m.migrations=m.migrations.slice(0,target-1);fs.writeFileSync(process.argv[2],JSON.stringify(m,null,2)+'\n');
JS
  TCDX_MIGRATION_TEST_MODE=true TCDX_MIGRATION_MANIFEST="$task_dir/historical-predecessor.json" node --experimental-strip-types scripts/foundations/migrate.ts apply
  TCDX_HISTORICAL_PERMISSION_PUBLICATION=true TCDX_HISTORICAL_PERMISSION_TARGET="$target" pnpm exec vitest run --config vitest.integration.config.ts apps/backend/src/security/historical-permission-publication.postgres.test.ts --no-file-parallelism
  "$pg_bin/dropdb" -h 127.0.0.1 -p "$task_port" tcdx-grc
 done
fi
printf 'ISOLATED_CLUSTER=%s PROFILE=%s SUITES=%s\n' "$task_dir" "$profile" "${#suites[@]}"
