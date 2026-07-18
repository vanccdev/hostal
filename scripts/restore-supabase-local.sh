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
  const objectFilename = path.basename(path.dirname(filePath)).toLowerCase();

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
