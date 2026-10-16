#!/usr/bin/env bash
# STEP_6A3: restore an encrypted physical backup into a private LXD PostgreSQL 16 container.
set -euo pipefail
umask 077

backup_dir=${1:-}
lxc=/snap/lxd/current/bin/lxc
container=step6a3-pg16-restore
pool=step6a3-pg16-pool
profile=step6a3-pg16-profile
network=tcdx6a3br0
mapper=step6a3_pg16_restore
volume_dir=/var/lib/tcdx-step6a3-restore
volume_file=$volume_dir/isolated-volume.luks
mount_dir=/mnt/tcdx-step6a3-restore
restore_pgdata=/var/lib/postgresql/16/step6a3

if [[ "$(hostname -s)" != "db-v4" || "$(id -u)" != "0" || ! -t 0 ||
      ! "$backup_dir" =~ ^/var/backups/tcdx-grc/step6a3-basebackup-[A-Za-z0-9]{8}$ ]]; then
  printf 'BLOCKED: expected root in db-v4 secure TTY and exact backup directory\n' >&2
  exit 1
fi
if [[ ! -f "$backup_dir/base.tar.gpg" || ! -f "$backup_dir/base.tar.gpg.sha256" ||
      ! -x "$lxc" ]]; then
  printf 'BLOCKED: backup or LXD runtime missing\n' >&2
  exit 1
fi
if [[ "$(pg_lsclusters -h | awk '$1==16 && $2=="main" {print $4}')" != "online" ||
      "$(readlink -f /var/lib/postgresql/16/main)" == "$restore_pgdata" ]]; then
  printf 'BLOCKED: active PostgreSQL identity is inconsistent\n' >&2
  exit 1
fi
if "$lxc" list --format csv | grep -q "^$container," ||
   "$lxc" network list --format csv | grep -q "^$network," ||
   "$lxc" profile list --format csv | grep -q "^$profile,"; then
  printf 'BLOCKED: task-owned LXD name is already allocated\n' >&2
  exit 1
fi
if ip -4 route | grep -q '10\.231\.0\.0/24'; then
  printf 'BLOCKED: proposed private build network overlaps an existing route\n' >&2
  exit 1
fi
if (( $(df -PB1 /var/lib | awk 'NR==2 {print $4}') < 20000000000 )); then
  printf 'BLOCKED: less than 20 GB available on the host\n' >&2
  exit 1
fi
(cd "$backup_dir" && sha256sum -c base.tar.gpg.sha256)

if [[ -e "$volume_dir" ]]; then
  if [[ ! -f "$volume_file" ||
        "$(find "$volume_dir" -mindepth 1 -maxdepth 1 -type f | wc -l)" != 1 ]]; then
    printf 'BLOCKED: existing restore volume is not the task-owned file\n' >&2
    exit 1
  fi
  mapfile -t matching_loops < <(losetup --list --noheadings --output NAME,BACK-FILE |
    awk -v file="$volume_file" '$2 == file {print $1}')
  if (( ${#matching_loops[@]} != 1 )); then
    printf 'BLOCKED: expected exactly one loop attached to the partial restore volume\n' >&2
    exit 1
  fi
  loop_device=${matching_loops[0]}
  printf 'RESUMING_PRE_LUKS_VOLUME=%s\n' "$loop_device"
else
  install -d -m 0700 "$volume_dir"
  truncate -s 12G "$volume_file"
  loop_device=$(losetup --find --show "$volume_file")
fi
if [[ "$(losetup --list --noheadings --output BACK-FILE "$loop_device" | xargs)" != "$volume_file" ]]; then
  printf 'BLOCKED: loop device does not map to the task-owned volume\n' >&2
  exit 1
fi
printf 'LUKS_VOLUME=%s\n' "$volume_file"
printf 'LUKS_LOOP=%s\n' "$loop_device"
if [[ -e "$mount_dir" ]]; then
  if [[ "$(findmnt -n -o SOURCE --mountpoint "$mount_dir")" != "/dev/mapper/$mapper" ||
        ! -d "$mount_dir/lxd-pool" ||
        "$(cryptsetup status "$mapper" | awk '/device:/ {print $2}')" != "$loop_device" ]]; then
    printf 'BLOCKED: existing mount is not the verified task-owned LUKS device\n' >&2
    exit 1
  fi
  printf 'RESUMING_VERIFIED_LUKS_MOUNT=%s\n' "$mount_dir"
else
  if cryptsetup isLuks "$loop_device"; then
    printf 'BLOCKED: encrypted volume exists without its verified mount\n' >&2
    exit 1
  fi
  printf 'Cryptsetup will request an operator-held passphrase. Keep it outside this chat.\n'
  cryptsetup luksFormat --type luks2 --verify-passphrase "$loop_device"
  cryptsetup open "$loop_device" "$mapper"
  mkfs.ext4 -q -L TCDX_6A3_RESTORE "/dev/mapper/$mapper"
  install -d -m 0700 "$mount_dir"
  mount -o nodev,nosuid "/dev/mapper/$mapper" "$mount_dir"
  install -d -m 0700 "$mount_dir/lxd-pool"
fi
if "$lxc" storage list --format csv | grep -q "^$pool,"; then
  if [[ "$("$lxc" storage show "$pool" | awk '$1 == "source:" {print $2}')" != "$mount_dir/lxd-pool" ]]; then
    printf 'BLOCKED: existing LXD storage pool has a different source\n' >&2
    exit 1
  fi
  printf 'RESUMING_VERIFIED_LXD_POOL=%s\n' "$pool"
else
  "$lxc" storage create "$pool" dir "source=$mount_dir/lxd-pool"
fi
"$lxc" network create "$network" ipv4.address=10.231.0.1/24 ipv4.nat=true ipv6.address=none
"$lxc" profile create "$profile"
"$lxc" profile device add "$profile" root disk path=/ "pool=$pool"
"$lxc" profile device add "$profile" eth0 nic "network=$network"
"$lxc" launch ubuntu:24.04 "$container" -p "$profile" \
  -c limits.cpu=2 -c limits.memory=3GiB -c boot.autostart=false -c security.privileged=false

# Outbound NAT is temporary for package installation; no host port is forwarded.
"$lxc" exec "$container" -- bash -lc \
  'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql-16'
"$lxc" exec "$container" -- bash -lc 'pg_ctlcluster 16 main stop || true'
if [[ "$("$lxc" exec "$container" -- pg_lsclusters -h | awk '$1==16 && $2=="main" {print $4}')" == "online" ]]; then
  printf 'BLOCKED: package-created PostgreSQL cluster did not stop\n' >&2
  exit 1
fi
"$lxc" profile device remove "$profile" eth0
if [[ -n "$("$lxc" exec "$container" -- ip -o -4 addr show scope global)" ]]; then
  printf 'BLOCKED: restore container still has a network interface\n' >&2
  exit 1
fi
"$lxc" exec "$container" -- install -d -o postgres -g postgres -m 0700 "$restore_pgdata"
export GPG_TTY
GPG_TTY=$(tty)
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
