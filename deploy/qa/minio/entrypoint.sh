#!/bin/sh
set -eu

read_secret() {
  secret_file="$1"
  if [ ! -r "$secret_file" ]; then
    echo "Required MinIO runtime secret file is unavailable" >&2
    exit 1
  fi
  secret_value="$(tr -d '\r\n' < "$secret_file")"
  if [ -z "$secret_value" ]; then
    echo "Required MinIO runtime secret file is empty" >&2
    exit 1
  fi
  printf '%s' "$secret_value"
}

MINIO_ROOT_USER="$(read_secret /run/secrets/object_storage_access_key)"
MINIO_ROOT_PASSWORD="$(read_secret /run/secrets/object_storage_secret_key)"
MINIO_KMS_SECRET_KEY="$(read_secret /run/secrets/object_storage_kms_key)"
MINIO_KMS_AUTO_ENCRYPTION=on

export MINIO_ROOT_USER MINIO_ROOT_PASSWORD MINIO_KMS_SECRET_KEY MINIO_KMS_AUTO_ENCRYPTION

exec setuidgid 10001:10001 /usr/local/bin/minio "$@"
