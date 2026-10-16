#!/usr/bin/env bash
# Verify the current QA backup in the existing private encrypted STEP_6A3 LXD container.
set -euo pipefail
umask 077

backup_dir=${1:-}
lxc=/snap/lxd/current/bin/lxc
container=step6a3-pg16-restore
mapper=step6a3_pg16_restore
mount_dir=/mnt/tcdx-step6a3-restore
restore_pgdata=/var/lib/postgresql/16/step6a3-current
restore_port=55434

if [[ "$(hostname -s)" != "db-v4" || "$(id -u)" != "0" || ! -t 0 ||
      ! "$backup_dir" =~ ^/var/backups/tcdx-grc/step6a3-basebackup-[A-Za-z0-9]{8}$ ]]; then
  printf 'BLOCKED: expected root in db-v4 secure TTY and exact backup directory\n' >&2
  exit 1
fi
if [[ "$(findmnt -n -o SOURCE --mountpoint "$mount_dir")" != "/dev/mapper/$mapper" ||
      "$("$lxc" list "$container" --format csv | cut -d, -f2)" != "RUNNING" ||
      ! -f "$backup_dir/base.tar.gpg" || ! -f "$backup_dir/base.tar.gpg.sha256" ]]; then
  printf 'BLOCKED: encrypted container or backup is not available\n' >&2
  exit 1
fi
if [[ -n "$("$lxc" exec "$container" -- ip -o -4 addr show scope global)" ||
      "$("$lxc" exec "$container" -- /usr/lib/postgresql/16/bin/postgres --version)" != *"16.15"* ||
      "$(pg_lsclusters -h | awk '$1==16 && $2=="main" {print $4}')" != "online" ]]; then
  printf 'BLOCKED: restore isolation or PostgreSQL 16 identity changed\n' >&2
  exit 1
fi
if "$lxc" exec "$container" -- test -e "$restore_pgdata"; then
  printf 'BLOCKED: current restore path already exists; preserve it for inspection\n' >&2
  exit 1
fi
if (( $("$lxc" exec "$container" -- df -PB1 / | awk 'NR==2 {print $4}') < 4000000000 )); then
  printf 'BLOCKED: encrypted restore volume has less than 4 GB free\n' >&2
  exit 1
fi
(cd "$backup_dir" && sha256sum -c base.tar.gpg.sha256)

live_counts=$(runuser -u postgres -- psql -X -qAt -v ON_ERROR_STOP=1 -d tcdx-grc -c \
  "SELECT (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied'),
          (SELECT count(*) FROM platform.tenants),
          (SELECT count(*) FROM platform.subscriptions),
          (SELECT count(*) FROM platform.entitlements)")
if [[ "$live_counts" != "33|3|5|72" ]]; then
  printf 'BLOCKED: current QA ledger/business counts changed: %s\n' "$live_counts" >&2
  exit 1
fi

"$lxc" exec "$container" -- install -d -o postgres -g postgres -m 0700 "$restore_pgdata"
printf 'Enter the operator-held GPG passphrase in this terminal.\n'
printf 'Passphrase: ' > /dev/tty
IFS= read -r -s backup_passphrase < /dev/tty
printf '\n' > /dev/tty
if [[ -z "$backup_passphrase" ]]; then
  printf 'BLOCKED: empty passphrase\n' >&2
  exit 1
fi
gpg --batch --pinentry-mode loopback --passphrase-fd 3 --decrypt --no-symkey-cache \
  "$backup_dir/base.tar.gpg" 3< <(printf '%s\n' "$backup_passphrase") |
  "$lxc" exec --mode=non-interactive "$container" -- tar -xpf - -C "$restore_pgdata"
unset backup_passphrase
"$lxc" exec "$container" -- chown -R postgres:postgres "$restore_pgdata"
"$lxc" exec "$container" -- /usr/lib/postgresql/16/bin/pg_verifybackup "$restore_pgdata"

"$lxc" exec "$container" -- bash -lc "cat > '$restore_pgdata/postgresql.conf' <<'CONF'
data_directory = '$restore_pgdata'
port = $restore_port
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
  -D "$restore_pgdata" -l /tmp/step6a3-current-restore-postgres.log \
  -o "-c config_file=$restore_pgdata/postgresql.conf" start

restored_counts=$("$lxc" exec "$container" -- runuser -u postgres -- psql -X -qAt -v ON_ERROR_STOP=1 \
  -p "$restore_port" -d tcdx-grc -c \
  "SELECT (SELECT count(*) FROM platform.schema_migrations WHERE outcome='applied'),
          (SELECT count(*) FROM platform.tenants),
          (SELECT count(*) FROM platform.subscriptions),
          (SELECT count(*) FROM platform.entitlements)")
if [[ "$restored_counts" != "$live_counts" ]]; then
  printf 'BLOCKED: isolated restore differs from QA: QA=%s RESTORE=%s\n' "$live_counts" "$restored_counts" >&2
  exit 1
fi
printf 'QA_COUNTS=%s\nRESTORE_COUNTS=%s\nPG_VERIFYBACKUP=PASS\nRECOVERY_GATE=PASS_ISOLATED_CURRENT_QA\n' \
  "$live_counts" "$restored_counts" |
  tee "$backup_dir/current-isolated-restore-verification.txt"
sha256sum "$backup_dir/current-isolated-restore-verification.txt" |
  tee "$backup_dir/current-isolated-restore-verification.sha256"
