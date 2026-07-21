#!/bin/bash
# ============================================
# Tabe Football - Database Restore Script
# Usage: bash scripts/restore.sh backups/backup_YYYYMMDD_HHMMSS.sql.gz
# ============================================

set -e

DB_CONTAINER="tabe-football-db"
DB_NAME="${DB_NAME:-tabe_football}"
DB_USER="${DB_USER:-tabe_admin}"

if [ -z "$1" ]; then
  echo "Usage: bash scripts/restore.sh <backup-file.sql.gz>"
  echo ""
  echo "بکاپ‌های موجود:"
  ls -lh ./backups/backup_*.sql.gz 2>/dev/null || echo "  (بکاپی یافت نشد)"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] فایل بکاپ یافت نشد: $BACKUP_FILE"
  exit 1
fi

echo "[RESTORE] فایل بکاپ: $BACKUP_FILE"
echo "[RESTORE] ⚠ این عملیات تمام داده‌های فعلی را پاک می‌کند!"
read -p "[RESTORE] آیا مطمئن هستید؟ (y/N): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "[RESTORE] لغو شد."
  exit 0
fi

# Pre-restore backup
PRE_RESTORE="./backups/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
echo "[RESTORE] ساخت بکاپ قبل از بازیابی..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip > "$PRE_RESTORE"
echo "[RESTORE] بکاپ ایمنی: $PRE_RESTORE"

# Drop and recreate database
echo "[RESTORE] پاک‌سازی دیتابیس..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore from backup
echo "[RESTORE] بازیابی داده‌ها..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" --quiet

echo "[RESTORE] بازیابی با موفقیت انجام شد."
echo "[RESTORE] برای اعمال تغییرات، Docker را ریستارت کنید:"
echo "  docker compose restart app"
