#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
STORAGE_CONTAINER="${SUPABASE_STORAGE_CONTAINER:-supabase-storage}"
DB_USER="${SUPABASE_DB_USER:-supabase_admin}"
DB_DUMP="database.dump"
RESTORE_LIST="database.restore.list"
FILTERED_RESTORE_LIST="$(mktemp)"

cleanup() {
  rm -f "$FILTERED_RESTORE_LIST"
}

trap cleanup EXIT

storage_dir_from_container() {
  docker inspect "$STORAGE_CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Destination "/var/lib/storage"}}{{.Source}}{{end}}{{end}}'
}

if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "Restauracion bloqueada. Ejecuta con CONFIRM_RESTORE=YES." >&2
  exit 1
fi

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "Uso: CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh backups/YYYYMMDDTHHMMSSZ" >&2
  exit 1
fi

if [ ! -f "$BACKUP_DIR/$DB_DUMP" ]; then
  echo "No existe $BACKUP_DIR/$DB_DUMP." >&2
  exit 1
fi

if [ ! -f "$BACKUP_DIR/storage.tar" ]; then
  echo "No existe $BACKUP_DIR/storage.tar." >&2
  exit 1
fi

read_manifest_value() {
  local key="$1"
  if [ -f "$BACKUP_DIR/manifest.txt" ]; then
    sed -n "s/^${key}=//p" "$BACKUP_DIR/manifest.txt" | head -n 1
  fi
}

SOURCE_API_URL="${SOURCE_SUPABASE_API_URL:-$(read_manifest_value source_api_url)}"
TARGET_API_URL="${TARGET_SUPABASE_API_URL:-$(read_manifest_value target_api_url)}"

docker cp "$BACKUP_DIR/$DB_DUMP" "$DB_CONTAINER:/tmp/$DB_DUMP"

docker exec "$DB_CONTAINER" pg_restore -l "/tmp/$DB_DUMP" \
  | awk '
    /realtime.*messages_[0-9]{4}_[0-9]{2}_[0-9]{2}/ { next }
    /ACL graphql_public FUNCTION graphql/ { next }
    { print }
  ' \
  > "$FILTERED_RESTORE_LIST"

docker cp "$FILTERED_RESTORE_LIST" "$DB_CONTAINER:/tmp/$RESTORE_LIST"

docker exec "$DB_CONTAINER" pg_restore \
  -U "$DB_USER" \
  -d postgres \
  --clean \
  --if-exists \
  --use-list="/tmp/$RESTORE_LIST" \
  "/tmp/$DB_DUMP"

docker exec "$DB_CONTAINER" rm -f "/tmp/$DB_DUMP"
docker exec "$DB_CONTAINER" rm -f "/tmp/$RESTORE_LIST"

if [ -n "$SOURCE_API_URL" ] && [ -n "$TARGET_API_URL" ] && [ "$SOURCE_API_URL" != "$TARGET_API_URL" ]; then
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres \
    --set=source_api="$SOURCE_API_URL" --set=target_api="$TARGET_API_URL" <<'SQL'
DO $$
BEGIN
  IF to_regclass('public.img_habitaciones') IS NOT NULL THEN
    EXECUTE format('UPDATE public.img_habitaciones SET url = replace(url, %L, %L)', :'source_api', :'target_api');
  END IF;
  IF to_regclass('public.transacciones') IS NOT NULL THEN
    EXECUTE format('UPDATE public.transacciones SET comprobante_url = replace(comprobante_url, %L, %L) WHERE comprobante_url IS NOT NULL', :'source_api', :'target_api');
  END IF;
  IF to_regclass('public.comprobantes') IS NOT NULL THEN
    EXECUTE format('UPDATE public.comprobantes SET pdf_url = replace(pdf_url, %L, %L) WHERE pdf_url IS NOT NULL', :'source_api', :'target_api');
  END IF;
  IF to_regclass('public.qr_pagos') IS NOT NULL THEN
    EXECUTE format('UPDATE public.qr_pagos SET url = replace(url, %L, %L)', :'source_api', :'target_api');
  END IF;
END $$;
SQL
fi

docker cp "$BACKUP_DIR/storage.tar" "$STORAGE_CONTAINER:/tmp/storage.tar"
docker exec "$STORAGE_CONTAINER" sh -lc '
  find /var/lib/storage -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
  tar -C /var/lib/storage --no-same-owner -xf /tmp/storage.tar
  rm -f /tmp/storage.tar
'

docker exec -i "$STORAGE_CONTAINER" node - <<'NODE'
const fs = require("fs");
const path = require("path");
const xattr = require("fs-xattr");

const storageRoot = "/var/lib/storage";
let updated = 0;

const mimeForObject = (filePath) => {
  const objectFilename = path.basename(filePath).toLowerCase();

  if (objectFilename.endsWith(".jpg") || objectFilename.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (objectFilename.endsWith(".png")) {
    return "image/png";
  }

  if (objectFilename.endsWith(".webp")) {
    return "image/webp";
  }

  if (objectFilename.endsWith(".gif")) {
    return "image/gif";
  }

  if (objectFilename.endsWith(".pdf")) {
    return "application/pdf";
  }

  return "application/octet-stream";
};

const walk = async (dir) => {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    await xattr.set(fullPath, "user.supabase.cache-control", "max-age=3600");
    await xattr.set(fullPath, "user.supabase.content-type", mimeForObject(fullPath));
    updated += 1;
  }
};

walk(storageRoot)
  .then(() => console.log(`Storage xattrs restaurados: ${updated}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
NODE

echo "Restore aplicado desde: $BACKUP_DIR"
