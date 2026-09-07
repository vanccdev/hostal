#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${1:-backups}"
BACKUP_TARGET="${BACKUP_TARGET:-local}"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
STORAGE_CONTAINER="${SUPABASE_STORAGE_CONTAINER:-supabase-storage}"
DB_USER="${SUPABASE_DB_USER:-supabase_admin}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_DUMP="database.dump"

prod_value() {
  local key="$1"
  if [ -f .env.prod ]; then
    sed -n "s/^${key}=//p" .env.prod | head -n 1 | sed -E "s/^['\"]|['\"]$//g"
  fi
}

normalize_url() {
  local value="${1:-}"
  value="${value%/}"
  if [ -n "$value" ] && [[ "$value" != http://* && "$value" != https://* ]]; then
    value="https://$value"
  fi
  printf '%s' "$value"
}

SOURCE_API_URL="$(normalize_url "${SOURCE_SUPABASE_API_URL:-${NEXT_PUBLIC_SUPABASE_URL:-http://localhost:8000}}")"
PRODUCTION_API_URL="$(normalize_url "${PRODUCTION_SUPABASE_API_URL:-${URL_SUPABASE_API:-$(prod_value URL_SUPABASE_API)}}")"
PRODUCTION_STUDIO_URL="$(normalize_url "${PRODUCTION_SUPABASE_STUDIO_URL:-${URL_SUPABASE_STUDIO:-$(prod_value URL_SUPABASE_STUDIO)}}")"
PRODUCTION_NEXTJS_URL="$(normalize_url "${PRODUCTION_NEXTJS_URL:-${URL_SUPABASE_NEXTJS:-$(prod_value URL_SUPABASE_NEXTJS)}}")"

storage_dir_from_container() {
  docker inspect "$STORAGE_CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Destination "/var/lib/storage"}}{{.Source}}{{end}}{{end}}'
}

STORAGE_DIR="${SUPABASE_STORAGE_DIR:-$(storage_dir_from_container)}"

case "$BACKUP_TARGET" in
  local|production) TARGETS=("$BACKUP_TARGET") ;;
  both) TARGETS=(local production) ;;
  *) echo "BACKUP_TARGET debe ser local, production o both." >&2; exit 1 ;;
esac

if [[ "$BACKUP_TARGET" == "production" || "$BACKUP_TARGET" == "both" ]] && [ -z "$PRODUCTION_API_URL" ]; then
  echo "Falta URL_SUPABASE_API en .env.prod o PRODUCTION_SUPABASE_API_URL." >&2
  exit 1
fi

TEMP_DUMP="$(mktemp)"
TEMP_STORAGE="$(mktemp)"
cleanup() { rm -f "$TEMP_DUMP" "$TEMP_STORAGE"; }
trap cleanup EXIT

docker exec "$DB_CONTAINER" pg_dump \
  -U "$DB_USER" \
  -d postgres \
  --format=custom \
  --blobs \
  > "$TEMP_DUMP"

docker exec "$STORAGE_CONTAINER" tar -C /var/lib/storage -cf /tmp/storage.tar .
docker cp "$STORAGE_CONTAINER:/tmp/storage.tar" "$TEMP_STORAGE"
docker exec "$STORAGE_CONTAINER" rm -f /tmp/storage.tar

for target in "${TARGETS[@]}"; do
  OUT_DIR="${BACKUP_ROOT%/}/${target}/${TIMESTAMP}"
  mkdir -p "$OUT_DIR"
  cp "$TEMP_DUMP" "$OUT_DIR/$DB_DUMP"
  cp "$TEMP_STORAGE" "$OUT_DIR/storage.tar"
  if [ "$target" = "production" ]; then
    TARGET_API_URL="$PRODUCTION_API_URL"
    TARGET_STUDIO_URL="$PRODUCTION_STUDIO_URL"
    TARGET_NEXTJS_URL="$PRODUCTION_NEXTJS_URL"
  else
    TARGET_API_URL="$SOURCE_API_URL"
    TARGET_STUDIO_URL=""
    TARGET_NEXTJS_URL=""
  fi

cat > "$OUT_DIR/manifest.txt" <<EOF
created_at=$TIMESTAMP
db_container=$DB_CONTAINER
storage_container=$STORAGE_CONTAINER
storage_dir=${STORAGE_DIR:-/var/lib/storage}
database_user=$DB_USER
database_dump=$DB_DUMP
storage_archive=storage.tar
backup_target=$target
source_api_url=$SOURCE_API_URL
target_api_url=$TARGET_API_URL
target_studio_url=$TARGET_STUDIO_URL
target_nextjs_url=$TARGET_NEXTJS_URL

Restore with:
  CONFIRM_RESTORE=YES scripts/restore-supabase-local.sh "$OUT_DIR"
EOF
done

echo "Backup creado en: ${BACKUP_ROOT%/}/${BACKUP_TARGET}/${TIMESTAMP}"
