#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  printf 'Run through sudo in the operator terminal.\n' >&2
  exit 1
fi

readonly backup_dir=/var/backups/tcdx-grc/step6a3-basebackup-cLtKoTUJ
readonly runner_dir=/tmp/tcdx-step6a3-runner
readonly backup_sha=3d60cc2174815d349c0f92ef5ba84f2ac088f8ba0db84449e8dbb87027b4bb81
readonly runner_sha=56c5258391ae31101b65c1712a9193eb95bcbd9c4d2b1a5f66ce3043f1c28a3e
readonly node_sha=f928da7f2d07027f90fa6098b066fe85a636caf17f90bc93ddd836f9c7fdca66

printf '%s  %s/base.tar.gpg\n' "$backup_sha" "$backup_dir" | sha256sum -c -
printf '%s  /tmp/tcdx-step6a3-runner.tgz\n' "$runner_sha" | sha256sum -c -
printf '%s  /tmp/tcdx-step6a3-node22.gz\n' "$node_sha" | sha256sum -c -
test -x "$runner_dir/node"
test -r "$runner_dir/scripts/foundations/migrate.ts"
test -r "$runner_dir/database/migrations/manifest.json"
test -r "$runner_dir/database/expected-schema.json"

dbasql() {
  runuser -u postgres -- psql -X -A -t -v ON_ERROR_STOP=1 -d tcdx-grc -c "$1"
}

runner() {
  runuser -u postgres -- env \
    DATABASE_USER=postgres \
    DATABASE_NAME=tcdx-grc \
    DATABASE_HOST=/var/run/postgresql \
    DATABASE_SSL_MODE=disable \
    DATABASE_BACKUP_REFERENCE="sha256:$backup_sha" \
    "$runner_dir/node" --experimental-strip-types \
    "$runner_dir/scripts/foundations/migrate.ts" "$1"
}

before=$(dbasql "SELECT (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied'),(SELECT count(*) FROM platform.tenants),(SELECT count(*) FROM platform.subscriptions),(SELECT count(*) FROM platform.entitlements)")
printf 'QA_BEFORE=%s\n' "$before"
if [[ $before != '30|3|3|36' ]]; then
  printf 'BLOCKED: QA pre-migration counts differ from the verified recovery point.\n' >&2
  exit 1
fi

runner status
runner apply
runner status

after=$(dbasql "SELECT (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied'),(SELECT count(*) FROM platform.tenants),(SELECT count(*) FROM platform.subscriptions),(SELECT count(*) FROM platform.entitlements)")
printf 'QA_AFTER=%s\n' "$after"
if [[ $after != '33|3|3|36' ]]; then
  printf 'BLOCKED: QA post-migration counts differ from the approved contract.\n' >&2
  exit 1
fi

foreign_keys=$(dbasql "SELECT count(*) FROM pg_constraint WHERE contype='f' AND NOT convalidated")
printf 'UNVALIDATED_FOREIGN_KEYS=%s\n' "$foreign_keys"
if [[ $foreign_keys != 0 ]]; then
  printf 'BLOCKED: unvalidated foreign keys remain.\n' >&2
  exit 1
fi

runuser -u postgres -- env \
  DATABASE_USER=postgres \
  DATABASE_NAME=tcdx-grc \
  DATABASE_HOST=/var/run/postgresql \
  DATABASE_SSL_MODE=disable \
  "$runner_dir/node" --experimental-strip-types \
  "$runner_dir/scripts/foundations/verify-schema.ts"
printf 'QA_MIGRATIONS=33/33\n'
