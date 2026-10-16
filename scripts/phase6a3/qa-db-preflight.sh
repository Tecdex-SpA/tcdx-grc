#!/usr/bin/env bash
# Read-only STEP_6A3 DBA preflight. Run in the operator's secure terminal.
set -euo pipefail

if [[ "$(hostname -s)" != "db-v4" ]]; then
  printf 'BLOCKED: expected db-v4\n' >&2
  exit 1
fi

sudo -v
printf 'HOST=%s\n' "$(hostname -f)"
printf 'CPU=%s\n' "$(nproc)"
free -h
df -h / /var/lib/postgresql
pg_lsclusters
printf 'CONTAINER_RUNTIMES\n'
for runtime in docker podman nerdctl systemd-nspawn; do
  command -v "$runtime" || true
done
if [[ -x /snap/lxd/current/bin/lxc ]]; then
  /snap/lxd/current/bin/lxc version
  /snap/lxd/current/bin/lxc storage list --format csv
  /snap/lxd/current/bin/lxc image list --format csv
  /snap/lxd/current/bin/lxc network list --format csv
fi
printf 'PORTS\n'
ss -ltn
printf 'PGDATA_BYTES\n'
sudo -n du -sb /var/lib/postgresql/16/main
printf 'POSTGRESQL_READ_ONLY\n'
sudo -n -u postgres psql -X -v ON_ERROR_STOP=1 -d tcdx-grc <<'SQL'
BEGIN READ ONLY;
SELECT current_user, current_database(), current_setting('server_version') AS server_version;
SELECT name, setting, unit, source
  FROM pg_settings
 WHERE name IN ('data_directory','archive_mode','archive_command','archive_timeout',
                'wal_level','max_wal_senders','wal_keep_size','full_page_writes')
 ORDER BY name;
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size,
       pg_current_wal_lsn() AS current_wal_lsn;
SELECT archived_count, last_archived_wal, last_archived_time, failed_count,
       last_failed_time FROM pg_stat_archiver;
SELECT count(*) AS applied_migrations, max(migration_id) AS latest_migration
  FROM platform.schema_migrations WHERE outcome='applied';
SELECT count(*) AS tenants FROM platform.tenants;
SELECT count(*) AS subscriptions FROM platform.subscriptions;
SELECT count(*) AS entitlements FROM platform.entitlements;
COMMIT;
SQL
printf 'BACKUP_TOOLS\n'
for tool in pgbackrest barman pg_basebackup pg_dump pg_verifybackup; do
  command -v "$tool" || true
done
printf 'BACKUP_SERVICE_UNITS\n'
systemctl list-unit-files --no-legend 'pgbackrest*' 'barman*' 'postgresql*' 2>/dev/null || true
