#!/usr/bin/env bash
set -euo pipefail
umask 077

backup_dir=/var/backups/tcdx-grc/step6a3-basebackup-w5UXYYlC
backup_sha=776b79ea7f7f44850a1175441086a95ba8d3a45677b8437abd9557982072f60e
input_archive=/tmp/tcdx-step6a3-r2-runner-input-20261015.tgz
input_sha=d5892da0bd588a9bc15bd13b6fef653732400d1173a72328ed44558a5e2ffcb1
r2_sha=b2a5bc73f75d7f95fb7ba5068f1b3ea77a923d7da7501446d05455ee545ec523
runner_dir=/tmp/tcdx-step6a3-r2-runner
lxc=/snap/lxd/current/bin/lxc

if [[ $(hostname -s) != db-v4 || $EUID -ne 0 ]]; then
  printf 'BLOCKED: run as root on db-v4 only\n' >&2
  exit 1
fi
if [[ -e $runner_dir ]]; then
  printf 'BLOCKED: preserve existing R2 runner directory for inspection\n' >&2
  exit 1
fi
printf '%s  %s\n' "$backup_sha" "$backup_dir/base.tar.gpg" | sha256sum -c -
printf '%s  %s\n' "$input_sha" "$input_archive" | sha256sum -c -
if [[ ! -x /tmp/tcdx-step6a3-runner/node || ! -r /tmp/tcdx-step6a3-runner/scripts/foundations/migrate.ts ||
      ! -r "$backup_dir/base.tar.gpg.sha256" ]]; then
  printf 'BLOCKED: approved runner or backup files missing\n' >&2
  exit 1
fi

dbasql() { runuser -u postgres -- psql -X -qAt -v ON_ERROR_STOP=1 -d tcdx-grc -c "$1"; }
before=$(dbasql "SELECT (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied'),
  (SELECT count(*) FROM platform.tenants),(SELECT count(*) FROM platform.subscriptions),
  (SELECT count(*) FROM platform.entitlements),(SELECT count(*) FROM privacy.retention_policies),
  (SELECT count(*) FROM evidence.file_upload_intents),(SELECT count(*) FROM evidence.file_objects),
  (SELECT count(*) FROM evidence.evidence_versions)")
if [[ $before != 33\|3\|5\|72\|* || $(dbasql "SELECT max(migration_id) FROM platform.schema_migrations WHERE outcome='applied'") != 20261013000100 ||
      $(dbasql "SELECT to_regclass('privacy.retention_policy_applicabilities') IS NULL AND to_regclass('privacy.retention_policy_hold_releases') IS NULL") != t ]]; then
  printf 'BLOCKED: QA pre-migration identity or counts differ: %s\n' "$before" >&2
  exit 1
fi
restored=$($lxc exec step6a3-pg16-restore -- runuser -u postgres -- psql -X -qAt -v ON_ERROR_STOP=1 -p 55434 -d tcdx-grc -c \
  "SELECT (SELECT count(*) FROM platform.schema_migrations),(SELECT count(*) FROM platform.tenants),
          (SELECT count(*) FROM platform.subscriptions),(SELECT count(*) FROM platform.entitlements)")
if [[ $restored != '33|3|5|72' || -n $($lxc exec step6a3-pg16-restore -- ip -o -4 addr show scope global) ]]; then
  printf 'BLOCKED: current QA isolated recovery point or network isolation changed\n' >&2
  exit 1
fi
if [[ $(dbasql "SELECT count(*) FROM privacy.retention_policies WHERE
       (policy_kind='legal_hold' AND retention_seconds IS NOT NULL)
       OR (policy_kind<>'legal_hold' AND (retention_seconds IS NULL OR retention_seconds<0))") != 0 ]]; then
  printf 'BLOCKED: historical retention policy duration conflicts with R2\n' >&2
  exit 1
fi

cp -a /tmp/tcdx-step6a3-runner "$runner_dir"
tar -xzf "$input_archive" -C "$runner_dir"
printf '%s  %s\n' "$r2_sha" "$runner_dir/database/migrations/20261015000100_c04w_applicability_hold_r2.sql" | sha256sum -c -
if [[ $("$runner_dir/node" -e "const m=require('$runner_dir/database/migrations/manifest.json'); console.log(m.migrations.length+'|'+m.migrations.at(-1).sha256)") != "34|$r2_sha" ]]; then
  printf 'BLOCKED: R2 manifest identity differs\n' >&2
  exit 1
fi

runner() {
  runuser -u postgres -- env DATABASE_USER=postgres DATABASE_NAME=tcdx-grc \
    DATABASE_HOST=/var/run/postgresql DATABASE_SSL_MODE=disable \
    DATABASE_BACKUP_REFERENCE="sha256:$backup_sha" \
    "$runner_dir/node" --experimental-strip-types "$runner_dir/scripts/foundations/migrate.ts" "$1"
}
runner status
runner apply
runner status
after=$(dbasql "SELECT (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied'),
  (SELECT count(*) FROM platform.tenants),(SELECT count(*) FROM platform.subscriptions),
  (SELECT count(*) FROM platform.entitlements),(SELECT count(*) FROM privacy.retention_policies),
  (SELECT count(*) FROM evidence.file_upload_intents),(SELECT count(*) FROM evidence.file_objects),
  (SELECT count(*) FROM evidence.evidence_versions)")
if [[ $after != "34|${before#33|}" || $(dbasql "SELECT count(*) FROM pg_constraint WHERE contype='f' AND NOT convalidated") != 0 ]]; then
  printf 'BLOCKED: post-migration counts or FK validation differ: before=%s after=%s\n' "$before" "$after" >&2
  exit 1
fi
runuser -u postgres -- env DATABASE_USER=postgres DATABASE_NAME=tcdx-grc \
  DATABASE_HOST=/var/run/postgresql DATABASE_SSL_MODE=disable \
  "$runner_dir/node" --experimental-strip-types "$runner_dir/scripts/foundations/verify-schema.ts"
printf 'QA_BEFORE=%s\nQA_AFTER=%s\nR2_SHA256=%s\nR2_MIGRATION=PASS_QA\n' \
  "$before" "$after" "$r2_sha" | tee "$backup_dir/c04w-r2-qa-migration-verification.txt"
sha256sum "$backup_dir/c04w-r2-qa-migration-verification.txt" |
  tee "$backup_dir/c04w-r2-qa-migration-verification.sha256"
