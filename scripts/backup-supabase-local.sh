#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${1:-backups}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
STORAGE_CONTAINER="${SUPABASE_STORAGE_CONTAINER:-supabase-storage}"
DB_USER="${SUPABASE_DB_USER:-supabase_admin}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_ROOT%/}/${TIMESTAMP}"
DB_DUMP="database.dump"

storage_dir_from_container() {
  docker inspect "$STORAGE_CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Destination "/var/lib/storage"}}{{.Source}}{{end}}{{end}}'
}

STORAGE_DIR="${SUPABASE_STORAGE_DIR:-$(storage_dir_from_container)}"

mkdir -p "$OUT_DIR"

docker exec "$DB_CONTAINER" pg_dump \
  -U "$DB_USER" \
  -d postgres \
  --format=custom \
  --blobs \
  > "$OUT_DIR/$DB_DUMP"

docker exec "$STORAGE_CONTAINER" tar -C /var/lib/storage -cf /tmp/storage.tar .
docker cp "$STORAGE_CONTAINER:/tmp/storage.tar" "$OUT_DIR/storage.tar"
docker exec "$STORAGE_CONTAINER" rm -f /tmp/storage.tar

cat > "$OUT_DIR/manifest.txt" <<EOF
created_at=$TIMESTAMP
db_container=$DB_CONTAINER
storage_container=$STORAGE_CONTAINER
storage_dir=${STORAGE_DIR:-/var/lib/storage}
database_user=$DB_USER
database_dump=$DB_DUMP
storage_archive=storage.tar

Restore with:
  CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh "$OUT_DIR"
EOF

echo "Backup creado en: $OUT_DIR"
