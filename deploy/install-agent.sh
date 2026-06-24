#!/usr/bin/env bash
# FilaMind 3d agent — run the backend as a managed systemd service.
#
# This is the "agent": a long-lived service (start / stop / restart, /api/health) that the printer's
# service manager + Moonraker can control, so FilaMind 3d is a first-class manageable app rather than
# a bare static site. It serves the prebuilt UI AND the API on its own port (8030), and registers
# itself with Moonraker's managed-services list so it can be restarted from the panel.
#
# Additive to the nginx-static install (`deploy/install.sh`) — you can run either or both.
#
# Runs as your NORMAL user and elevates only the narrow steps (cp / systemctl) — the same
# passwordless-sudo set the FilaMind flow Setup service is granted, so it also installs unattended.
#   bash deploy/install-agent.sh            # install + enable + start the service
#   bash deploy/install-agent.sh --uninstall
set -euo pipefail

ACTION=install
[ "${1:-}" = "--uninstall" ] && ACTION=uninstall

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
USER_NAME="$(id -un)"
SERVICE=filamind-3d
UNIT="/etc/systemd/system/${SERVICE}.service"
PRINTER_DATA="${PRINTER_DATA:-$HOME/printer_data}"

# When invoked via `curl | bash` there is no controlling terminal for sudo to prompt; reconnect one
# if it actually opens (a headless run, e.g. the Setup service, falls through to passwordless sudo).
if [ ! -t 0 ] && (exec </dev/tty) 2>/dev/null; then exec </dev/tty; fi

deregister_moonraker() {
  local asvc="$PRINTER_DATA/moonraker.asvc"
  [ -f "$asvc" ] && sed -i "/^${SERVICE}\$/d" "$asvc" 2>/dev/null || true
}

if [ "$ACTION" = uninstall ]; then
  echo "Removing the FilaMind 3d agent service…"
  sudo systemctl disable --now "${SERVICE}" 2>/dev/null || true
  sudo rm -f "$UNIT"
  sudo systemctl daemon-reload || true
  deregister_moonraker
  sudo systemctl restart moonraker 2>/dev/null || true
  echo "FilaMind 3d agent removed. (The app files are still at $APP_DIR.)"
  exit 0
fi

# ── backend virtualenv ──────────────────────────────────────────────────────────────────────
# On ARM printers use piwheels: prebuilt aarch64/armv7 wheels mean pip never compiles from source,
# which on a low-RAM host (≤1 GB) would exhaust memory and take other services down with it.
case "$(uname -m)" in
  aarch64 | armv7l | armv6l)
    export PIP_EXTRA_INDEX_URL="${PIP_EXTRA_INDEX_URL:-https://www.piwheels.org/simple}"
    ;;
esac

echo "Backend virtualenv…"
cd "$APP_DIR/backend"
# Rebuild when missing OR broken (no pip), not just when the dir is absent — self-heals a partial venv.
if [ ! -x .venv/bin/pip ]; then
  rm -rf .venv
  python3 -m venv .venv 2>/dev/null || {
    echo "Installing python3-venv (the backend environment needs it)…"
    sudo apt-get install -y python3-venv 2>/dev/null || true
    python3 -m venv .venv || {
      echo "Could not create the Python venv. Install your python3's venv module (e.g. sudo apt install python3-venv) and re-run." >&2
      exit 1
    }
  }
fi
./.venv/bin/pip install -q -U pip
./.venv/bin/pip install -q -r requirements.txt

# ── systemd unit ────────────────────────────────────────────────────────────────────────────
echo "Installing the systemd service ($SERVICE)…"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
cat > "$TMP" <<UNIT
[Unit]
Description=FilaMind 3d backend (control UI + API)
After=network-online.target moonraker.service
Wants=network-online.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=-$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/.venv/bin/python $APP_DIR/backend/main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
sudo cp "$TMP" "$UNIT"
sudo systemctl daemon-reload
sudo systemctl enable --now "${SERVICE}"

# ── register with Moonraker so it shows up as a manageable service (restart from the panel) ─────
asvc="$PRINTER_DATA/moonraker.asvc"
if [ -f "$asvc" ]; then
  grep -qx "$SERVICE" "$asvc" || echo "$SERVICE" >> "$asvc"
  sudo systemctl restart moonraker 2>/dev/null || true
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Done. FilaMind 3d agent running (service: $SERVICE)."
echo "  API/UI:  http://${IP:-<printer-ip>}:8030/"
echo "  Status:  sudo systemctl status $SERVICE"
echo "  Update Moonraker's update manager too: see deploy/moonraker-update_manager.conf"
