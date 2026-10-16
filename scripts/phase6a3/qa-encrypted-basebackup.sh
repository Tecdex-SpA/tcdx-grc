#!/usr/bin/env bash
# STEP_6A3: operator-run physical backup. Prompts for GPG passphrase in the secure TTY.
set -euo pipefail
umask 077

if [[ "$(hostname -s)" != "db-v4" || "$(id -u)" != "0" || ! -t 0 ]]; then
  printf 'BLOCKED: run with sudo on db-v4 from an interactive terminal\n' >&2
  exit 1
fi
if [[ "$(pg_lsclusters -h | awk '$1==16 && $2=="main" {print $4}')" != "online" ]]; then
  printf 'BLOCKED: PostgreSQL 16/main is not online\n' >&2
  exit 1
fi

read -r db_name pg_major extra_tablespaces archive_mode < <(
  runuser -u postgres -- psql -X -qAt -v ON_ERROR_STOP=1 -d tcdx-grc -F ' ' -c \
    "SELECT current_database(), current_setting('server_version_num')::integer/10000,
            (SELECT count(*) FROM pg_tablespace WHERE spcname NOT IN ('pg_default','pg_global')),
            current_setting('archive_mode')")
if [[ "$db_name" != "tcdx-grc" || "$pg_major" != "16" || "$extra_tablespaces" != "0" ]]; then
  printf 'BLOCKED: unexpected database, version, or external tablespace\n' >&2
  exit 1
fi

source_bytes=$(du -sb /var/lib/postgresql/16/main | awk '{print $1}')
available_bytes=$(df -PB1 /var/backups | awk 'NR==2 {print $4}')
if (( available_bytes < source_bytes * 3 + 5368709120 )); then
  printf 'BLOCKED: insufficient free storage for backup and restore safety margin\n' >&2
  exit 1
fi

backup_dir=$(mktemp -d /var/backups/tcdx-grc/step6a3-basebackup-XXXXXXXX)
chmod 0700 "$backup_dir"
partial="$backup_dir/base.tar.gpg.partial"
complete="$backup_dir/base.tar.gpg"
printf 'BACKUP_DIRECTORY=%s\n' "$backup_dir"
printf 'SOURCE_PGDATA_BYTES=%s\n' "$source_bytes"
printf 'AVAILABLE_BYTES=%s\n' "$available_bytes"
printf 'ARCHIVE_MODE_BEFORE=%s\n' "$archive_mode"
printf 'Enter an operator-held GPG passphrase in this terminal; do not record it in chat.\n'
printf 'Passphrase: ' > /dev/tty
IFS= read -r -s backup_passphrase < /dev/tty
printf '\nConfirm passphrase: ' > /dev/tty
IFS= read -r -s confirmation < /dev/tty
printf '\n' > /dev/tty
if [[ -z "$backup_passphrase" || "$backup_passphrase" != "$confirmation" ]]; then
  printf 'BLOCKED: passphrase is empty or confirmation differs\n' >&2
  exit 1
fi
unset confirmation

runuser -u postgres -- pg_basebackup \
  -D - -Ft -X fetch -c fast -h /var/run/postgresql -U postgres -w \
  --manifest-checksums=SHA256 --label=STEP_6A3_QA_RECOVERY \
  | gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 \
      --symmetric --cipher-algo AES256 --no-symkey-cache \
      --output "$partial" 3< <(printf '%s\n' "$backup_passphrase")

if [[ ! -s "$partial" ]]; then
  printf 'BLOCKED: backup artifact is empty\n' >&2
  exit 1
fi
printf 'Decrypt once in this terminal to verify encrypted stream and tar structure.\n'
gpg --batch --pinentry-mode loopback --passphrase-fd 3 --decrypt --no-symkey-cache "$partial" \
  3< <(printf '%s\n' "$backup_passphrase") | tar -tf - > "$backup_dir/tar-list.txt"
unset backup_passphrase
for required in PG_VERSION global/pg_control backup_manifest; do
  if ! grep -Fxq "./$required" "$backup_dir/tar-list.txt" &&
     ! grep -Fxq "$required" "$backup_dir/tar-list.txt"; then
    printf 'BLOCKED: backup archive lacks %s\n' "$required" >&2
    exit 1
  fi
done
mv -- "$partial" "$complete"
sha256sum "$complete" | tee "$backup_dir/base.tar.gpg.sha256"
stat -c 'BACKUP_CIPHERTEXT_BYTES=%s' "$complete"
printf 'BACKUP_CURRENT=ENCRYPTED_STREAM_VERIFIED_RESTORE_PENDING\n'
