#!/bin/bash
# ============================================
# Tabe Football - Database Restore Script
# Usage: bash scripts/restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
# ============================================

set -e
set -o pipefail

DB_CONTAINER="tabe-football-db"
APP_CONTAINER="tabe-football-app"
DB_NAME="${DB_NAME:-tabe_football}"
DB_USER="${DB_USER:-tabe_admin}"

if [ -z "$1" ]; then
  echo "Usage: bash scripts/restore.sh <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh ./backups/backup_*.sql.gz 2>/dev/null || echo "  (none)"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[RESTORE] backup: $BACKUP_FILE"
echo "[RESTORE] WARNING: this REPLACES the live database. A pre-restore backup is taken first."
read -p "[RESTORE] confirm restore (y/N): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "[RESTORE] cancelled."
  exit 0
fi

# Pre-restore backup
PRE_RESTORE="./backups/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "[RESTORE] taking pre-restore backup..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip > "$PRE_RESTORE"
echo "[RESTORE] pre-restore backup: $PRE_RESTORE"

# Stop the app first: DROP DATABASE hangs/fails while the pool holds
# connections, and a running app could write mid-restore.
echo "[RESTORE] stopping app container..."
docker compose stop app

# Drop and recreate database
echo "[RESTORE] dropping and recreating database..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore from backup (pipefail: a broken pipe fails the script)
echo "[RESTORE] restoring..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" --quiet

# Verify: database answers and core tables are non-suspicious
echo "[RESTORE] verifying..."
MATCHES=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT count(*) FROM matches;")
MIGRATIONS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT count(*) FROM schema_migrations;")
echo "[RESTORE] matches=$MATCHES schema_migrations=$MIGRATIONS"
if [ -z "$MIGRATIONS" ] || [ "$MIGRATIONS" -eq 0 ]; then
  echo "[RESTORE] VERIFICATION FAILED: schema_migrations is empty — restore looks broken."
  echo "[RESTORE] pre-restore backup kept at: $PRE_RESTORE"
  echo "[RESTORE] NOT starting app. Investigate before continuing."
  exit 1
fi

# Start the app and wait for health
echo "[RESTORE] starting app..."
docker compose start app
echo "[RESTORE] waiting for app health..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    echo "[RESTORE] app healthy. Restore complete."
    exit 0
  fi
  sleep 5
done
echo "[RESTORE] app did not become healthy in time — check logs: docker compose logs app"
exit 1
