#!/usr/bin/env bash
# Test či request na /attendance dosiahne Next.js server (getSession).
# Spusti VNÚTRI Coolify kontajnera alebo na hoste proti containeru:
#
#   ./scripts/test-attendance-route.sh
#   ./scripts/test-attendance-route.sh http://127.0.0.1:3000
#
# Alebo priamo:
#   curl -s -w "\\n%{http_code}" http://127.0.0.1:3000/attendance
#   wget -q -O - -S http://127.0.0.1:3000/attendance 2>&1 | head -30
#
# Alebo so session cookie (hodnotu získaš po prihlásení z DevTools):
#
#   curl -s -b "__Secure-better-auth.session_token=HODNOTA" http://127.0.0.1:3000/attendance
#
# Čo hľadať v Coolify logoch:
#   - Ak sa objaví [getSession] → request došiel do Next.js, problém je pred Next (Cloudflare cache).
#   - Ak sa [getSession] neobjaví → request sa do Next.js nedostáva (proxy/standalone routing).

set -e
BASE="${1:-http://127.0.0.1:3000}"
echo "=== Test page route: $BASE/attendance ==="
HTTP=$(curl -s -o /tmp/attendance-body -w "%{http_code}" "$BASE/attendance")
echo "HTTP status: $HTTP"
echo "Response (first 20 lines):"
head -20 /tmp/attendance-body
echo ""
echo "Ak HTTP=307/302 a Location=/login, server správne redirectuje (session chýba)."
echo "Ak v logoch NIE JE [getSession], request neprešiel do Next.js (cache alebo routing)."
