#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${1:-backups}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
STORAGE_CONTAINER="${SUPABASE_STORAGE_CONTAINER:-supabase-storage}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_ROOT%/}/${TIMESTAMP}"
DB_DUMP="database.dump"

storage_dir_from_container() {
  docker inspect "$STORAGE_CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Destination "/var/lib/storage"}}{{.Source}}{{end}}{{end}}'
}

STORAGE_DIR="${SUPABASE_STORAGE_DIR:-$(storage_dir_from_container)}"

if [ -z "$STORAGE_DIR" ] || [ ! -d "$STORAGE_DIR" ]; then
  echo "No se encontro el directorio local de Storage. Define SUPABASE_STORAGE_DIR." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

docker exec "$DB_CONTAINER" pg_dump \
  -U postgres \
  -d postgres \
  --format=custom \
  --blobs \
  --file="/tmp/$DB_DUMP"

docker cp "$DB_CONTAINER:/tmp/$DB_DUMP" "$OUT_DIR/$DB_DUMP"
docker exec "$DB_CONTAINER" rm -f "/tmp/$DB_DUMP"

tar -C "$STORAGE_DIR" -cf "$OUT_DIR/storage.tar" .

cat > "$OUT_DIR/manifest.txt" <<EOF
created_at=$TIMESTAMP
db_container=$DB_CONTAINER
storage_container=$STORAGE_CONTAINER
storage_dir=$STORAGE_DIR
database_dump=$DB_DUMP
storage_archive=storage.tar

Restore with:
  CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh "$OUT_DIR"
EOF

echo "Backup creado en: $OUT_DIR"
