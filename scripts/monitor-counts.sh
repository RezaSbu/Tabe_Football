#!/bin/bash
# ============================================
# Tabe Football - Hourly table-counts watchdog
# Catches catastrophic data loss (e.g. mass wipe) within the hour.
#
# Install on VPS (runs there, against the live DB):
#   chmod +x /opt/tabe-football/scripts/monitor-counts.sh
#   crontab -e  ->  0 * * * * /opt/tabe-football/scripts/monitor-counts.sh >> /var/log/tabe-monitor.log 2>&1
#
# Exit 0 = all sane. Exit 1 = BREACH (investigate immediately, do NOT
# run heal/repair/restore until counts + app logs are reviewed).
# ============================================

DB_NAME="${DB_NAME:-tabe_football}"
DB_USER="${DB_USER:-tabe_admin}"
APP_URL="${APP_URL:-http://127.0.0.1:3000}"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Run from the repo root so `docker compose exec` resolves the project.
# (Plain `docker exec -T` is not supported by older docker CLIs, while
# `docker compose exec -T` works — learned the hard way on the VPS.)
cd "$(dirname "$0")/.." || { echo "[MONITOR][ALERT] cannot cd to repo root"; exit 1; }

fail=0
diag_done=0
alert() { echo "[MONITOR][ALERT] $1"; fail=1; }
info() { echo "[MONITOR] $1"; }

count_of() {
  # Echoes ONLY the bare number on stdout (empty on failure). All
  # diagnostics go to stderr — otherwise they pollute the captured value
  # and a broken check can look OK (this once faked an "all sane").
  local res
  res="$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT count(*) FROM $1;" 2>&1 | tr -d '[:space:]')"
  case "$res" in
    ''|*[!0-9]*)
      # Not a number: surface the real cause once (docker/auth/query),
      # instead of hiding it behind "cannot read".
      if [ "$diag_done" = "0" ]; then
        diag_done=1
        {
          echo "[MONITOR][DIAG] user='$DB_USER' db='$DB_NAME'"
          echo "[MONITOR][DIAG] compose ps:"
          docker compose ps --format '{{.Name}} {{.Status}}' 2>&1 | head -5
          echo "[MONITOR][DIAG] sample query error:"
          docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT 1;" 2>&1 | head -3
        } >&2
      fi
      echo ""
      ;;
    *) echo "$res" ;;
  esac
}

check_min() {
  local table="$1" min="$2" got
  got="$(count_of "$table")"
  case "$got" in
    ''|*[!0-9]*)
      alert "cannot read table $table (see DIAG above)"
      return
      ;;
  esac
  if [ "$got" -lt "$min" ]; then
    alert "table $table count=$got below floor $min"
  else
    info "table $table count=$got OK"
  fi
}

# Absolute floors: legitimate data never sits near zero for these tables.
check_min matches 50
check_min players 100
check_min teams 10
check_min coaches 5
check_min news 100
check_min seasons 1
check_min schema_migrations 10

# App must answer health (code surfaced; curl errors become 000).
health_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$APP_URL/api/health" 2>/dev/null || echo "000")"
if [ "$health_code" = "200" ]; then
  info "app health OK"
else
  alert "app health check FAILED at $APP_URL/api/health (http=$health_code)"
fi

if [ "$fail" -ne 0 ]; then
  echo "[MONITOR] RESULT: BREACH — inspect before any repair/restore/heal."
  exit 1
fi
echo "[MONITOR] RESULT: all sane."
exit 0
