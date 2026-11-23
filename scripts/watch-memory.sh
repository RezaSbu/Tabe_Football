#!/bin/bash
# ============================================
# Tabe Football - 24h memory / RSS watch (read-only)
#
# Purpose: distinguish "the box is small" from "the app leaks". A leak shows
# up as container RSS climbing monotonically for hours; a small box shows a
# flat saw-tooth (GC) around a stable baseline.
#
# Runs on the VPS (read-only: docker stats + /proc). Nothing is restarted and
# nothing is written to the database.
#
#   chmod +x /opt/tabe-football/scripts/watch-memory.sh
#   nohup /opt/tabe-football/scripts/watch-memory.sh >/dev/null 2>&1 &
#   # ~24h later:
#   tail -n 20 /var/log/tabe-memory-watch.log
#
# Override for a shorter smoke test:
#   DURATION_MIN=10 INTERVAL=30 ./scripts/watch-memory.sh
#
# Signals to look for in the log:
#   - rss_mb rising ~linearly for 6+ hours          -> investigate a leak
#   - MemAvailable hitting 0 + swap used growing    -> capacity/swap problem
#   - app container restart counter increasing      -> OOM kill, not slowness
# ============================================

set -u

DURATION_MIN="${DURATION_MIN:-1440}"   # 24h
INTERVAL="${INTERVAL:-60}"             # seconds
OUT="${OUT:-/var/log/tabe-memory-watch.log}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_DIR" || { echo "[WATCH][ALERT] cannot cd to repo root"; exit 1; }

SAMPLES=$(( DURATION_MIN * 60 / INTERVAL ))
[ "$SAMPLES" -lt 1 ] && SAMPLES=1

app_id="$(docker compose ps -q app 2>/dev/null)"
if [ -z "$app_id" ]; then
  echo "[WATCH][ALERT] app container not found (is the stack running?)" | tee -a "$OUT"
  exit 1
fi

# "123.4MiB / 512MiB" -> "123.4"
rss_mb() {
  docker stats --no-stream --format '{{.MemUsage}}' "$app_id" 2>/dev/null \
    | awk '{ v=$1; if (v ~ /GiB/) { sub(/GiB/,"",v); printf "%.1f", v*1024 } else { sub(/MiB/,"",v); printf "%.1f", v } }'
}

mem_available_mb() { awk '/^MemAvailable:/{printf "%d", $2/1024}' /proc/meminfo; }
swap_used_mb() {
  awk '/^SwapTotal:/{t=$2} /^SwapFree:/{f=$2} END{printf "%d", (t-f)/1024}' /proc/meminfo
}
restart_count() {
  docker inspect -f '{{.RestartCount}}' "$app_id" 2>/dev/null || echo "?"
}

{
  echo "# tabe memory watch start $(date -Is)"
  echo "# duration_min=$DURATION_MIN interval=${INTERVAL}s container=$app_id"
  echo "# columns: ts rss_mb host_mem_available_mb host_swap_used_mb restarts"
} >> "$OUT"

first_rss=""
last_rss=""
for i in $(seq 1 "$SAMPLES"); do
  rss="$(rss_mb)"
  [ -z "$rss" ] && rss="NA"
  line="$(date -Is) rss_mb=$rss host_mem_available_mb=$(mem_available_mb) host_swap_used_mb=$(swap_used_mb) restarts=$(restart_count)"
  echo "$line" >> "$OUT"

  [ "$i" = "1" ] && first_rss="$rss"
  last_rss="$rss"

  sleep "$INTERVAL"
done

# Summary: first vs last sample. A steady climb over the whole window is the
# leak signal; saw-tooth noise stays well under the threshold.
summary="first_rss_mb=$first_rss last_rss_mb=$last_rss"
if [ "$first_rss" != "NA" ] && [ "$last_rss" != "NA" ]; then
  summary="$summary delta_mb=$(awk -v a="$first_rss" -v b="$last_rss" 'BEGIN{printf "%.1f", b-a}')"
fi
echo "# tabe memory watch end $(date -Is) $summary" >> "$OUT"
echo "$summary"
