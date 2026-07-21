#!/bin/bash
# ============================================
# Tabe Football - Database Backup Script
# Usage: bash scripts/backup.sh
# ============================================

set -e

DB_CONTAINER="tabe-football-db"
DB_NAME="${DB_NAME:-tabe_football}"
DB_USER="${DB_USER:-tabe_admin}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Create backups directory
mkdir -p "$BACKUP_DIR"

echo "[BACKUP] شروع پشتیبان‌گیری از دیتابیس..."

# Dump PostgreSQL
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

FINAL_FILE="${BACKUP_FILE}.gz"
FILE_SIZE=$(du -h "$FINAL_FILE" | cut -f1)

echo "[BACKUP] پشتیبان‌گیری با موفقیت انجام شد."
echo "[BACKUP] فایل: $FINAL_FILE ($FILE_SIZE)"

# Keep only last 30 backups
cd "$BACKUP_DIR"
ls -t backup_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
REMAINING=$(ls backup_*.sql.gz 2>/dev/null | wc -l)
echo "[BACKUP] تعداد بکاپ‌های موجود: $REMAINING"
