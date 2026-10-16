#!/usr/bin/env bash
# STEP_6A3: finish the already-created encrypted, isolated LXD restore.
set -euo pipefail
umask 077

backup_dir=${1:-}
lxc=/snap/lxd/current/bin/lxc
container=step6a3-pg16-restore
pool=step6a3-pg16-pool
profile=step6a3-pg16-profile
mapper=step6a3_pg16_restore
mount_dir=/mnt/tcdx-step6a3-restore
restore_pgdata=/var/lib/postgresql/16/step6a3

if [[ "$(hostname -s)" != "db-v4" || "$(id -u)" != "0" || ! -t 0 ||
      ! "$backup_dir" =~ ^/var/backups/tcdx-grc/step6a3-basebackup-[A-Za-z0-9]{8}$ ]]; then
  printf 'BLOCKED: expected root in db-v4 secure TTY and exact backup directory\n' >&2
  exit 1
fi
if [[ "$(findmnt -n -o SOURCE --mountpoint "$mount_dir")" != "/dev/mapper/$mapper" ||
      "$("$lxc" storage show "$pool" | awk '$1 == "source:" {print $2}')" != "$mount_dir/lxd-pool" ||
      "$("$lxc" storage volume show "$pool" "container/$container" | awk '$1 == "pool:" {print $2}')" != "$pool" ||
      "$("$lxc" list "$container" --format csv | cut -d, -f2)" != "RUNNING" ]]; then
  printf 'BLOCKED: restore container or encrypted storage does not match the task-owned resources\n' >&2
  exit 1
fi
if [[ "$(pg_lsclusters -h | awk '$1==16 && $2=="main" {print $4}')" != "online" ||
      "$("$lxc" exec "$container" -- pg_lsclusters -h | awk '$1==16 && $2=="main" {print $4}')" != "down" ||
      "$("$lxc" exec "$container" -- /usr/lib/postgresql/16/bin/postgres --version)" != *"16.15"* ]]; then
  printf 'BLOCKED: active/isolated PostgreSQL identity or restore directory is inconsistent\n' >&2
  exit 1
fi
if "$lxc" exec "$container" -- test -e "$restore_pgdata"; then
  printf 'BLOCKED: restored PGDATA path already exists in the isolated container\n' >&2
  exit 1
fi
if (( $("$lxc" exec "$container" -- df -PB1 / | awk 'NR==2 {print $4}') < 4000000000 )); then
  printf 'BLOCKED: encrypted restore volume has less than 4 GB free\n' >&2
  exit 1
fi
(cd "$backup_dir" && sha256sum -c base.tar.gpg.sha256)

if ! "$lxc" profile show "$profile" | grep -q '^  eth0:'; then
  printf 'BLOCKED: expected temporary build NIC is absent before isolation\n' >&2
  exit 1
fi
"$lxc" profile device remove "$profile" eth0
if [[ -n "$("$lxc" exec "$container" -- ip -o -4 addr show scope global)" ]]; then
  printf 'BLOCKED: restore container still has a routable network interface\n' >&2
  exit 1
fi
"$lxc" exec "$container" -- install -d -o postgres -g postgres -m 0700 "$restore_pgdata"
export GPG_TTY
GPG_TTY=$(tty)
printf 'GPG will request the operator-held backup passphrase in this terminal.\n'
gpg --decrypt --no-symkey-cache "$backup_dir/base.tar.gpg" |
  "$lxc" exec --mode=non-interactive "$container" -- tar -xpf - -C "$restore_pgdata"
"$lxc" exec "$container" -- chown -R postgres:postgres "$restore_pgdata"
"$lxc" exec "$container" -- /usr/lib/postgresql/16/bin/pg_verifybackup "$restore_pgdata"

"$lxc" exec "$container" -- bash -lc "cat > '$restore_pgdata/postgresql.conf' <<'CONF'
data_directory = '$restore_pgdata'
port = 55433
listen_addresses = '127.0.0.1'
unix_socket_directories = '/var/run/postgresql'
hba_file = '/etc/postgresql/16/main/pg_hba.conf'
ident_file = '/etc/postgresql/16/main/pg_ident.conf'
ssl = off
logging_collector = off
CONF
chown postgres:postgres '$restore_pgdata/postgresql.conf'
chmod 0600 '$restore_pgdata/postgresql.conf'"
"$lxc" exec "$container" -- runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl \
  -D "$restore_pgdata" -l /tmp/step6a3-restored-postgres.log \
  -o "-c config_file=$restore_pgdata/postgresql.conf" start

"$lxc" exec "$container" -- runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -p 55433 -d tcdx-grc \
  -c "SELECT current_user,current_database(),current_setting('server_version') AS version,
             current_setting('port') AS port,current_setting('listen_addresses') AS listen_addresses;
      SELECT system_identifier FROM pg_control_system();
      SELECT count(*) AS applied_migrations,max(migration_id) AS latest_migration
        FROM platform.schema_migrations WHERE outcome='applied';
      SELECT (SELECT count(*) FROM platform.tenants) AS tenants,
             (SELECT count(*) FROM platform.subscriptions) AS subscriptions,
             (SELECT count(*) FROM platform.entitlements) AS entitlements;
      SELECT count(*) AS physical_tables FROM pg_catalog.pg_tables
        WHERE schemaname NOT IN ('pg_catalog','information_schema');
      SELECT count(*) AS unvalidated_foreign_keys FROM pg_constraint
        WHERE contype='f' AND NOT convalidated;" |
  tee "$backup_dir/isolated-restore-verification.txt"
sha256sum "$backup_dir/isolated-restore-verification.txt" |
  tee "$backup_dir/isolated-restore-verification.sha256"
printf 'ISOLATED_RESTORE=POSTGRESQL16_RUNNING_PRIVATE_LUKS_VOLUME\n'
printf 'RESTORE_CONTAINER=%s\n' "$container"
printf 'RESTORE_PORT=55433_CONTAINER_LOOPBACK_ONLY\n'
