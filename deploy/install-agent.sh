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
  # Remove only the update_manager block we appended; leave other moonraker.conf sections intact.
  MCONF="$PRINTER_DATA/config/moonraker.conf"
  if [ -f "$MCONF" ] && grep -q "update_manager $SERVICE" "$MCONF"; then
    python3 - "$MCONF" <<'PY'
import re, sys
p = sys.argv[1]
open(p, "w").write(re.sub(r"\n\[update_manager filamind-3d\][^\[]*", "\n", open(p).read()))
PY
  fi
  sudo systemctl restart moonraker 2>/dev/null || true
  echo "FilaMind 3d agent removed. (The app files are still at $APP_DIR.)"
  exit 0
fi

# ── full clone + tags ───────────────────────────────────────────────────────────────────────
# Moonraker's update_manager reads the version from `git describe --tags`. A legacy `--depth 1`
# (shallow) clone has NO tags locally, so Moonraker shows "v0.0.0-...-inferred" instead of the real
# release. Unshallow + fetch tags here (this also runs when Moonraker re-runs the install_script on
# update), so an already-shallow clone is repaired in place — no re-clone needed.
if [ -d "$APP_DIR/.git" ]; then
  [ -f "$APP_DIR/.git/shallow" ] && git -C "$APP_DIR" fetch --unshallow --tags origin 2>/dev/null || true
  git -C "$APP_DIR" fetch --tags origin 2>/dev/null || true
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

# ── register with Moonraker: the service allowlist (restart from the panel) AND the update_manager
#    (so the agent shows in the updates panel and gets git-updated). Mirrors how FilaMind flow
#    registers itself, instead of only printing a "do this yourself" reminder. ────────────────────
asvc="$PRINTER_DATA/moonraker.asvc"
if [ -f "$asvc" ]; then
  grep -qx "$SERVICE" "$asvc" || echo "$SERVICE" >> "$asvc"
fi
MCONF="$PRINTER_DATA/config/moonraker.conf"
if [ -f "$MCONF" ] && ! grep -q "update_manager $SERVICE" "$MCONF"; then
  cp "$MCONF" "$MCONF.bak.filamind.$(date +%s)" 2>/dev/null || true
  cat >> "$MCONF" <<'EOF'

[update_manager filamind-3d]
type: git_repo
path: ~/filamind-3d
origin: https://github.com/filamind-app/filamind-3d.git
primary_branch: main
managed_services: filamind-3d
install_script: deploy/install-agent.sh
EOF
fi
sudo systemctl restart moonraker 2>/dev/null || true

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Done. FilaMind 3d agent running ($SERVICE), registered with Moonraker (service + updates)."
echo "  API/UI:  http://${IP:-<printer-ip>}:8030/"
echo "  Status:  sudo systemctl status $SERVICE"
