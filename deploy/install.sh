#!/usr/bin/env bash
# FilaMind 3d — serve on the printer host.
#
# Installs an nginx site that serves the built SPA AND reverse-proxies Moonraker on the SAME
# origin, so the browser needs no CORS setup and the app auto-resolves ws://<host>:<port>/websocket.
# This is the recommended path for an on-printer test (no per-printer rebuild, no cors_domains).
#
# Run on the printer (Debian/Ubuntu/Raspberry Pi OS) as a sudo-capable user:
#   sudo bash deploy/install.sh [--port 8089] [--moonraker 127.0.0.1:7125]
#   sudo bash deploy/install.sh --uninstall
#
# Prereqs: nginx; and Node 22 + npm IF the frontend isn't already built (frontend/dist).
set -euo pipefail

PORT=8089
MOONRAKER=127.0.0.1:7125
ACTION=install

while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --moonraker) MOONRAKER="$2"; shift 2 ;;
    --uninstall) ACTION=uninstall; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$APP_DIR/frontend/dist"
SITE_AVAILABLE=/etc/nginx/sites-available/filamind-3d
SITE_ENABLED=/etc/nginx/sites-enabled/filamind-3d

require_root() { [ "$(id -u)" -eq 0 ] || { echo "Run with sudo." >&2; exit 1; }; }

if [ "$ACTION" = uninstall ]; then
  require_root
  rm -f "$SITE_ENABLED" "$SITE_AVAILABLE"
  nginx -t && systemctl reload nginx
  echo "FilaMind 3d nginx site removed."
  exit 0
fi

require_root

# Build the SPA if it isn't present yet (needs Node + npm; @filamind-app/core comes from npm).
if [ ! -f "$DIST/index.html" ]; then
  echo "No build found — building the frontend (needs Node 22 + npm)…"
  command -v npm >/dev/null || { echo "npm not found; install Node 22 or ship a prebuilt frontend/dist." >&2; exit 1; }
  ( cd "$APP_DIR/frontend" && npm ci && npm run build )
fi

echo "Writing nginx site → $SITE_AVAILABLE (port $PORT, Moonraker $MOONRAKER)…"
cat > "$SITE_AVAILABLE" <<NGINX
server {
    listen $PORT;
    server_name _;
    root $DIST;

    # SPA (hash routing): only / and /assets are ever requested.
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
    location = /index.html { add_header Cache-Control "no-cache"; }
    location / { try_files \$uri \$uri/ /index.html; }

    # Same-origin reverse proxy to Moonraker (REST + WebSocket) — no CORS needed.
    location ~ ^/(server|printer|access|machine) {
        proxy_pass http://$MOONRAKER;
        proxy_set_header Host \$host;
    }
    location /websocket {
        proxy_pass http://$MOONRAKER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf "$SITE_AVAILABLE" "$SITE_ENABLED"
nginx -t && systemctl reload nginx
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Done. Open FilaMind 3d at:  http://${IP:-<printer-ip>}:$PORT/"
