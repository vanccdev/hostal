#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
STORAGE_CONTAINER="${SUPABASE_STORAGE_CONTAINER:-supabase-storage}"
DB_DUMP="database.dump"

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

STORAGE_DIR="${SUPABASE_STORAGE_DIR:-$(storage_dir_from_container)}"

if [ -z "$STORAGE_DIR" ] || [ ! -d "$STORAGE_DIR" ]; then
  echo "No se encontro el directorio local de Storage. Define SUPABASE_STORAGE_DIR." >&2
  exit 1
fi

docker cp "$BACKUP_DIR/$DB_DUMP" "$DB_CONTAINER:/tmp/$DB_DUMP"

docker exec "$DB_CONTAINER" pg_restore \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  "/tmp/$DB_DUMP"

docker exec "$DB_CONTAINER" rm -f "/tmp/$DB_DUMP"

tar -C "$STORAGE_DIR" -xf "$BACKUP_DIR/storage.tar"

echo "Restore aplicado desde: $BACKUP_DIR"
